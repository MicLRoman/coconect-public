"""
Мост: WhatsApp Business Calling (WebRTC) <-> Vapi (AI voice agent).

Поток входящего звонка:
  webhook (event="connect", SDP offer)
    -> handle_connect():
         1) поднимаем aiortc RTCPeerConnection, отдаём наш аудио-трек (из Vapi)
         2) setRemoteDescription(offer) -> createAnswer -> ждём ICE gathering
         3) создаём Vapi-звонок (transport=vapi.websocket) -> websocketCallUrl
         4) calling.accept(call_id, our_sdp_answer) -> Meta поднимает медиа
         5) качаем аудио в обе стороны:
              WhatsApp mic (48k Opus) -> resample 16k PCM -> Vapi WS
              Vapi WS (16k PCM)       -> resample 48k     -> WhatsApp ear

  webhook (event="terminate") -> handle_terminate(): рвём pc + Vapi WS.

aiortc/av/websockets импортируются ЛЕНИВО внутри функций: если зависимости ещё не
поставлены (см. requirements.txt), сам модуль импортируется без ошибок, а звонок
аккуратно отклоняется с понятным логом.
"""
import os
import json
import asyncio
import logging
import fractions

import httpx

from wa import calling
from voice_agent import get_vapi_assistant_config

logger = logging.getLogger(__name__)

VAPI_API_KEY = os.getenv("VAPI_API_KEY", "")
VAPI_ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID", "")  # опц.: готовый ассистент вместо inline-конфига
VAPI_BASE = os.getenv("VAPI_BASE_URL", "https://api.vapi.ai")

# Аудио-параметры. WhatsApp/WebRTC — 48kHz; Vapi WS — 16kHz PCM16 mono.
WA_RATE = 48000
VAPI_RATE = 16000
FRAME_MS = 20
WA_SAMPLES = WA_RATE * FRAME_MS // 1000   # 960 сэмплов / 20мс @48k

# call_id -> ActiveCall (для terminate/очистки)
_active: dict[str, "ActiveCall"] = {}


def _deps():
    """Ленивый импорт тяжёлых медиа-зависимостей. Возвращает (aiortc, av) или (None, None)."""
    try:
        import aiortc
        import av
        return aiortc, av
    except Exception as e:  # noqa: BLE001
        logger.error(f"[CALL] media deps missing (pip install aiortc av): {e}")
        return None, None


class ActiveCall:
    def __init__(self, call_id: str, phone: str):
        self.call_id = call_id
        self.phone = phone
        self.pc = None
        self.vapi_ws = None
        self.out_track = None
        self.tasks: list[asyncio.Task] = []

    async def close(self):
        for t in self.tasks:
            t.cancel()
        if self.vapi_ws is not None:
            try:
                await self.vapi_ws.close()
            except Exception:
                pass
        if self.pc is not None:
            try:
                await self.pc.close()
            except Exception:
                pass


# --------------------------------------------------------------------------- #
#  Исходящий аудио-трек: то, что слышит юзер в WhatsApp (голос ассистента)
# --------------------------------------------------------------------------- #
def _make_out_track(av_mod):
    from aiortc.mediastreams import MediaStreamTrack

    class VapiAudioTrack(MediaStreamTrack):
        """Эмитит 20мс PCM16-фреймов @48k. Буфер наполняется аудио из Vapi (уже
        ресемпленным в 48k). Если данных нет — отдаём тишину, чтобы поток не рвался."""
        kind = "audio"

        def __init__(self):
            super().__init__()
            self._buf = bytearray()
            self._lock = asyncio.Lock()
            self._timestamp = 0
            self._start = None

        async def push(self, pcm48_mono_s16: bytes):
            async with self._lock:
                self._buf.extend(pcm48_mono_s16)

        async def recv(self):
            loop = asyncio.get_event_loop()
            nbytes = WA_SAMPLES * 2  # s16 mono
            # пейсинг под реальное время, иначе aiortc зальёт фреймы пачкой
            if self._start is None:
                self._start = loop.time()
            else:
                self._timestamp += WA_SAMPLES
                target = self._start + self._timestamp / WA_RATE
                delay = target - loop.time()
                if delay > 0:
                    await asyncio.sleep(delay)

            async with self._lock:
                if len(self._buf) >= nbytes:
                    chunk = bytes(self._buf[:nbytes])
                    del self._buf[:nbytes]
                else:
                    chunk = bytes(self._buf) + b"\x00" * (nbytes - len(self._buf))
                    self._buf.clear()

            frame = av_mod.AudioFrame(format="s16", layout="mono", samples=WA_SAMPLES)
            frame.planes[0].update(chunk)
            frame.sample_rate = WA_RATE
            frame.pts = self._timestamp
            frame.time_base = fractions.Fraction(1, WA_RATE)
            return frame

    return VapiAudioTrack()


# --------------------------------------------------------------------------- #
#  Создание Vapi-звонка с websocket-транспортом
# --------------------------------------------------------------------------- #
async def _create_vapi_call(user_name: str, phone: str) -> str | None:
    """Создаёт звонок в Vapi с transport=vapi.websocket. Возвращает websocketCallUrl."""
    if not VAPI_API_KEY:
        logger.error("[CALL] VAPI_API_KEY not set — cannot bridge to AI")
        return None

    body: dict = {
        "transport": {
            "provider": "vapi.websocket",
            "audioFormat": {"format": "pcm_s16le", "container": "raw", "sampleRate": VAPI_RATE},
        }
    }
    if VAPI_ASSISTANT_ID:
        body["assistantId"] = VAPI_ASSISTANT_ID
    else:
        body["assistant"] = get_vapi_assistant_config(user_name, phone)

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                f"{VAPI_BASE}/call",
                headers={"Authorization": f"Bearer {VAPI_API_KEY}"},
                json=body,
            )
        if r.status_code >= 400:
            logger.error(f"[CALL] Vapi create failed {r.status_code}: {r.text}")
            return None
        data = r.json()
        ws_url = (data.get("transport") or {}).get("websocketCallUrl")
        if not ws_url:
            logger.error(f"[CALL] Vapi response has no websocketCallUrl: {data}")
        return ws_url
    except Exception as e:  # noqa: BLE001
        logger.error(f"[CALL] Vapi create error: {e}")
        return None


# --------------------------------------------------------------------------- #
#  Аудио-перекачка между WhatsApp-треком и Vapi WS
# --------------------------------------------------------------------------- #
async def _pump_wa_to_vapi(track, ws, av_mod):
    """WhatsApp mic -> resample 16k -> Vapi WS (binary PCM16)."""
    resampler = av_mod.AudioResampler(format="s16", layout="mono", rate=VAPI_RATE)
    while True:
        try:
            frame = await track.recv()
        except Exception:
            break
        for out in resampler.resample(frame):
            pcm = bytes(out.planes[0])
            try:
                await ws.send(pcm)
            except Exception:
                return


async def _pump_vapi_to_wa(ws, out_track, av_mod):
    """Vapi WS (16k PCM16 binary) -> resample 48k -> WhatsApp ear."""
    resampler = av_mod.AudioResampler(format="s16", layout="mono", rate=WA_RATE)
    async for msg in ws:
        if isinstance(msg, (bytes, bytearray)):
            # сырой PCM16 mono @16k. Заворачиваем в AudioFrame и ресемплим в 48k.
            samples = len(msg) // 2
            frame = av_mod.AudioFrame(format="s16", layout="mono", samples=samples)
            frame.planes[0].update(bytes(msg))
            frame.sample_rate = VAPI_RATE
            for out in resampler.resample(frame):
                await out_track.push(bytes(out.planes[0]))
        else:
            # JSON-контрол от Vapi (status/hangup/transcript). Логируем end-of-call.
            try:
                ev = json.loads(msg)
                if ev.get("type") in ("hangup", "end-of-call-report"):
                    logger.info(f"[CALL] Vapi control: {ev.get('type')}")
            except Exception:
                pass


# --------------------------------------------------------------------------- #
#  Точки входа из webhook
# --------------------------------------------------------------------------- #
async def handle_connect(call_id: str, sdp_offer: str, phone: str, user_name: str = "друг"):
    aiortc, av_mod = _deps()
    if aiortc is None:
        calling.reject(call_id)
        return

    import websockets
    from aiortc import RTCPeerConnection, RTCSessionDescription

    ac = ActiveCall(call_id, phone)
    _active[call_id] = ac

    try:
        # 1) Сначала Vapi WS — без AI принимать звонок незачем.
        ws_url = await _create_vapi_call(user_name, phone)
        if not ws_url:
            calling.reject(call_id)
            await _cleanup(call_id)
            return
        ac.vapi_ws = await websockets.connect(ws_url, max_size=None)

        # 2) WebRTC: наш исходящий трек + приём входящего.
        pc = RTCPeerConnection()
        ac.pc = pc
        ac.out_track = _make_out_track(av_mod)
        pc.addTrack(ac.out_track)

        @pc.on("track")
        def on_track(track):
            if track.kind == "audio":
                ac.tasks.append(asyncio.ensure_future(_pump_wa_to_vapi(track, ac.vapi_ws, av_mod)))

        @pc.on("connectionstatechange")
        async def on_state():
            logger.info(f"[CALL {call_id}] pc state={pc.connectionState}")
            if pc.connectionState in ("failed", "closed", "disconnected"):
                await _cleanup(call_id)

        # 3) offer -> answer, ждём полного сбора ICE (WhatsApp ждёт не-trickle SDP).
        await pc.setRemoteDescription(RTCSessionDescription(sdp=sdp_offer, type="offer"))
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await _wait_ice_complete(pc)

        # 4) Vapi -> WhatsApp насос + принимаем звонок нашим SDP-answer.
        ac.tasks.append(asyncio.ensure_future(_pump_vapi_to_wa(ac.vapi_ws, ac.out_track, av_mod)))
        calling.accept(call_id, pc.localDescription.sdp)
        logger.info(f"[CALL {call_id}] accepted, bridging {phone} <-> Vapi")
    except Exception as e:  # noqa: BLE001
        logger.error(f"[CALL {call_id}] connect error: {e}")
        calling.reject(call_id)
        await _cleanup(call_id)


async def handle_terminate(call_id: str):
    logger.info(f"[CALL {call_id}] terminate from WhatsApp")
    await _cleanup(call_id)


async def _cleanup(call_id: str):
    ac = _active.pop(call_id, None)
    if ac is not None:
        await ac.close()


async def _wait_ice_complete(pc, timeout: float = 5.0):
    if pc.iceGatheringState == "complete":
        return
    fut: asyncio.Future = asyncio.get_event_loop().create_future()

    @pc.on("icegatheringstatechange")
    def _on_change():
        if pc.iceGatheringState == "complete" and not fut.done():
            fut.set_result(True)

    try:
        await asyncio.wait_for(fut, timeout=timeout)
    except asyncio.TimeoutError:
        logger.warning("[CALL] ICE gathering timeout — отправляем SDP как есть")
