"""
WhatsApp Business Calling API — управление звонком (сигналинг через Graph API).

Звонок юзера прилетает в webhook (`field: "calls"`, `event: "connect"`) вместе с
SDP-офером. Мы:
  1) (опц.) шлём `pre_accept` со своим SDP-answer — ранний медиа-сетап, меньше задержка;
  2) шлём `accept` со SDP-answer — принимаем звонок;
  либо `reject` (не берём), либо `terminate` (кладём трубку уже принятого).

Все действия — это POST /<PHONE_NUMBER_ID>/calls. SDP-answer генерит aiortc
(см. wa/call_bridge.py). Здесь — только тонкая HTTP-обёртка, как в wa/send.py.
Если WA_TOKEN/WA_PHONE_NUMBER_ID не заданы — stub-режим (лог в консоль).
"""
import os
import logging
import httpx

logger = logging.getLogger(__name__)

API_VERSION = os.getenv("WA_API_VERSION", "v21.0")
PHONE_NUMBER_ID = os.getenv("WA_PHONE_NUMBER_ID")
TOKEN = os.getenv("WA_TOKEN")


def _enabled() -> bool:
    return bool(PHONE_NUMBER_ID and TOKEN)


def _calls_url() -> str:
    return f"https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/calls"


def _settings_url() -> str:
    return f"https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/settings"


def _post(url: str, payload: dict) -> dict:
    if not _enabled():
        logger.info(f"[WA CALL STUB] -> {url}: {payload}")
        return {"stub": True}
    try:
        r = httpx.post(url, json=payload, headers={"Authorization": f"Bearer {TOKEN}"}, timeout=20)
        if r.status_code >= 400:
            logger.error(f"[WA CALL] {url} failed {r.status_code}: {r.text}")
        return r.json()
    except Exception as e:
        logger.error(f"[WA CALL] error: {e}")
        return {"error": str(e)}


def _action(call_id: str, action: str, sdp: str | None = None) -> dict:
    payload: dict = {
        "messaging_product": "whatsapp",
        "call_id": call_id,
        "action": action,
    }
    if sdp is not None:
        payload["session"] = {"sdp_type": "answer", "sdp": sdp}
    return _post(_calls_url(), payload)


def pre_accept(call_id: str, sdp_answer: str) -> dict:
    """Ранний accept со SDP-answer: медиа-канал поднимается заранее → меньше задержка
    до первого слова ассистента. Необязательно, но рекомендовано Meta."""
    return _action(call_id, "pre_accept", sdp_answer)


def accept(call_id: str, sdp_answer: str) -> dict:
    """Принять звонок. После этого Meta устанавливает WebRTC-медиа по нашему SDP-answer."""
    return _action(call_id, "accept", sdp_answer)


def reject(call_id: str) -> dict:
    """Отклонить входящий звонок (не берём трубку)."""
    return _action(call_id, "reject")


def terminate(call_id: str) -> dict:
    """Завершить уже принятый звонок со своей стороны."""
    return _action(call_id, "terminate")


def enable_calling() -> dict:
    """Однократно включить Calling на номере (можно дёрнуть из админки/скрипта).
    Эквивалент: POST /<PHONE_ID>/settings {"calling": {"status": "ENABLED"}}."""
    return _post(_settings_url(), {"calling": {"status": "ENABLED"}})
