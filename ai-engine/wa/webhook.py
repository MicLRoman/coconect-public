"""
WhatsApp Cloud API — входящий webhook.

  GET  /wa/webhook  — верификация подписки (hub.challenge)
  POST /wa/webhook  — приём сообщений -> прокидываем в стейт-машину диалога

Всегда отвечаем 200 на POST, чтобы Meta не уходила в retry-шторм.
"""
import os
import time
import logging
from collections import deque

from fastapi import APIRouter, BackgroundTasks, Request, Response

from wa import dialog

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wa", tags=["whatsapp"])

VERIFY_TOKEN = os.getenv("WA_VERIFY_TOKEN", "")

# Дедуп по wamid — Meta может доставить одно сообщение несколько раз (at-least-once).
_seen_ids: deque[str] = deque(maxlen=1000)


def _seen_before(msg_id: str | None) -> bool:
    if not msg_id:
        return False
    if msg_id in _seen_ids:
        return True
    _seen_ids.append(msg_id)
    return False


# Сообщения старше этого — это retry-бэклог Meta (мы когда-то не ответили 200 вовремя),
# а не свежий ввод. Не обрабатываем, чтобы бот не отвечал на старьё после рестартов.
WA_MAX_MSG_AGE = int(os.getenv("WA_MAX_MSG_AGE", "300"))  # сек


def _stale(msg: dict) -> bool:
    try:
        ts = int(msg.get("timestamp", 0))
    except (TypeError, ValueError):
        return False
    return ts > 0 and (time.time() - ts) > WA_MAX_MSG_AGE


@router.get("/webhook")
async def verify(request: Request):
    params = request.query_params
    if params.get("hub.mode") == "subscribe" and params.get("hub.verify_token") == VERIFY_TOKEN:
        logger.info("[WA webhook] verified")
        return Response(content=params.get("hub.challenge", ""), media_type="text/plain")
    logger.warning("[WA webhook] verification failed")
    return Response(status_code=403)


def _caller_name(value: dict, wa_id: str | None) -> str:
    for c in value.get("contacts", []):
        if (not wa_id or c.get("wa_id") == wa_id) and c.get("profile", {}).get("name"):
            return c["profile"]["name"]
    return "друг"


async def _handle_call(call: dict, value: dict):
    """Событие из WhatsApp Calling API: connect (входящий звонок + SDP offer) / terminate."""
    from wa import call_bridge
    call_id = call.get("id")
    event = call.get("event")
    phone = call.get("from")
    logger.info(f"[WA call] id={call_id} event={event} from={phone}")
    if not call_id:
        return
    if event == "connect":
        sdp = (call.get("session") or {}).get("sdp")
        if not sdp:
            logger.warning(f"[WA call] connect without SDP — reject {call_id}")
            from wa import calling
            calling.reject(call_id)
            return
        await call_bridge.handle_connect(call_id, sdp, phone, _caller_name(value, phone))
    elif event == "terminate":
        await call_bridge.handle_terminate(call_id)


@router.post("/webhook")
async def receive(request: Request, background_tasks: BackgroundTasks):
    data = await request.json()
    # DIAG: сырой payload любого входящего вебхука (видно field/тип события).
    try:
        fields = [c.get("field") for e in data.get("entry", []) for c in e.get("changes", [])]
        logger.info(f"[WA webhook RAW] fields={fields} body={data}")
    except Exception:
        logger.info(f"[WA webhook RAW] body={data}")
    # Обработка в фоне → Meta получает 200 мгновенно (без timeout-ретраев и дублей).
    background_tasks.add_task(_process_webhook, data)
    return {"status": "ok"}


async def _process_webhook(data: dict):
    try:
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                # --- WhatsApp Business Calling: входящие звонки -> мост на AI ---
                for call in value.get("calls", []):
                    await _handle_call(call, value)
                for msg in value.get("messages", []):
                    if _stale(msg):
                        logger.info(f"[WA in] stale skip id={msg.get('id')} (Meta retry backlog)")
                        continue
                    if _seen_before(msg.get("id")):
                        logger.info(f"[WA in] dup skip id={msg.get('id')}")
                        continue
                    phone = msg.get("from")
                    mtype = msg.get("type")
                    text, reply_id = None, None
                    if mtype == "text":
                        text = msg.get("text", {}).get("body")
                    elif mtype == "interactive":
                        inter = msg.get("interactive", {})
                        if inter.get("type") == "button_reply":
                            reply_id = inter["button_reply"]["id"]
                        elif inter.get("type") == "list_reply":
                            reply_id = inter["list_reply"]["id"]
                    elif mtype == "button":
                        # тап по quick-reply кнопке APPROVED-ШАБЛОНА (payload/text)
                        btn = msg.get("button", {})
                        reply_id = btn.get("payload") or btn.get("text")
                    elif mtype == "audio":
                        audio_id = msg.get("audio", {}).get("id")
                        if audio_id:
                            from wa.transcribe import transcribe_audio
                            text = transcribe_audio(audio_id)
                    logger.info(f"[WA in] {phone} type={mtype} text={text!r} reply_id={reply_id!r}")
                    
                    from wa.send import send_typing_on
                    try:
                        send_typing_on(msg.get("id"))
                    except Exception as e:
                        logger.error(f"[WA in] failed to send typing indicator: {e}")

                    await dialog.handle_incoming(phone, text=text, reply_id=reply_id)
    except Exception as e:
        logger.error(f"[WA webhook] processing error: {e}")
