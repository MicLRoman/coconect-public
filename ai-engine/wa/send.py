"""
WhatsApp Cloud API — outgoing messages (Meta Graph API).

Тонкая обёртка над graph.facebook.com. Если WA_TOKEN/WA_PHONE_NUMBER_ID не заданы —
работает как заглушка (логирует исходящее в консоль), чтобы диалог можно было
тестировать локально без реальных токенов.
"""
import os
import time
import logging
import httpx

logger = logging.getLogger(__name__)

API_VERSION = os.getenv("WA_API_VERSION", "v21.0")
PHONE_NUMBER_ID = os.getenv("WA_PHONE_NUMBER_ID")
TOKEN = os.getenv("WA_TOKEN")


def _enabled() -> bool:
    return bool(PHONE_NUMBER_ID and TOKEN)


def _url() -> str:
    return f"https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/messages"


def _format_recipient(to: str) -> str:
    """Нормализация номера получателя под формат Meta.
    Для +7 (Россия/Казахстан) allowed-list зарегистрирован с трунк-«8»:
    7XXXXXXXXXX -> 78XXXXXXXXXX. Вставляем 8 после кода страны 7."""
    d = "".join(ch for ch in str(to or "") if ch.isdigit())
    if d.startswith("7") and len(d) == 11:
        d = "78" + d[1:]
    return d


def _dry_run() -> bool:
    """Тест-режим: НИЧЕГО не шлём в WhatsApp (только логируем). Тумблер env WA_DRY_RUN."""
    return os.getenv("WA_DRY_RUN", "").strip().lower() in ("1", "true", "yes", "on")


def _dev_mode() -> bool:
    """DEV_MODE: демон выключен (см. main._start_daemon) + APPROVED-ШАБЛОНЫ не шлём,
    НО обычные ответы (send_text/кнопки/списки) работают — чтобы пишешь боту и он
    отвечает по вебхуку. Это НЕ dry-run (тот глушит вообще всё). Тумблер env DEV_MODE."""
    return os.getenv("DEV_MODE", "").strip().lower() in ("1", "true", "yes", "on")


def _post(payload: dict, retries: int = 3) -> dict:
    if payload.get("to"):
        payload["to"] = _format_recipient(payload["to"])
    if _dry_run():
        logger.info(f"[WA DRY-RUN] blocked -> {payload.get('to')}: {payload.get('type') or payload.get('status')}")
        return {"dry_run": True}
    if not _enabled():
        logger.info(f"[WA STUB] -> {payload.get('to')}: {payload}")
        return {"stub": True}
    # Ретраи на транзиентных обрывах (SSL EOF / разрыв keep-alive из-за VPN/сети).
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            r = httpx.post(_url(), json=payload, headers={"Authorization": f"Bearer {TOKEN}"}, timeout=20)
            if r.status_code >= 400:
                # 4xx — это валидная ошибка Meta (не транзиент), ретраить смысла нет.
                logger.error(f"[WA] send failed {r.status_code}: {r.text}")
            return r.json()
        except Exception as e:
            last_err = e
            logger.warning(f"[WA] transient send error (try {attempt}/{retries}): {e}")
            if attempt < retries:
                time.sleep(1.0 * attempt)
    logger.error(f"[WA] send error after {retries} tries: {last_err}")
    return {"error": str(last_err)}


# Маркер «нескольких пузырей»: копирайт или LLM может вставить [SPLIT], и мы
# отправим куски отдельными сообщениями — так живее, чем одна простыня текста.
# Не эмодзи и не разметка, в обычной прозе не встречается → безопасно как разделитель.
_BUBBLE_SEP = "[SPLIT]"


def send_text(to: str, body: str) -> dict:
    """Обычный текст. Если тело содержит [SPLIT] — шлём каждую часть отдельным
    сообщением (короткие «человеческие» пузыри). Возвращаем результат последнего."""
    parts = [p.strip() for p in str(body or "").split(_BUBBLE_SEP) if p.strip()]
    if len(parts) <= 1:
        return _post({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": body},
        })
    res: dict = {}
    for i, part in enumerate(parts):
        res = _post({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": part},
        })
        if i < len(parts) - 1:
            time.sleep(0.7)  # держим порядок пузырей + чуть человечнее по темпу
    return res


def send_buttons(to: str, body: str, options: list[tuple[str, str]]) -> dict:
    """options: list of (id, title). WhatsApp допускает максимум 3 reply-кнопки."""
    buttons = [{"type": "reply", "reply": {"id": oid, "title": title[:20]}} for oid, title in options[:3]]
    return _post({
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": body},
            "action": {"buttons": buttons},
        },
    })


def send_template(to: str, name: str, lang: str = "en", body_params: list | None = None,
                  header_params: list | None = None) -> dict:
    """Отправка APPROVED message template. body_params -> {{1}}, {{2}}… в BODY;
    header_params -> переменные в HEADER (напр. onboarding_greeting: Hi, {{1}}!).
    Quick-reply кнопки у статичных шаблонов задаются в самом шаблоне (без параметров)."""
    if _dev_mode():
        logger.info(f"[WA DEV_MODE] template blocked -> {to}: {name}")
        return {"dev_mode_skipped": True}
    components = []
    if header_params:
        components.append({
            "type": "header",
            "parameters": [{"type": "text", "text": str(p)} for p in header_params],
        })
    if body_params:
        components.append({
            "type": "body",
            "parameters": [{"type": "text", "text": str(p)} for p in body_params],
        })
    return _post({
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {"name": name, "language": {"code": lang}, "components": components},
    })


def send_cta_url(to: str, body: str, display_text: str, url: str) -> dict:
    """Interactive CTA-кнопка со ссылкой — заметнее голого текста (юзер может закрепить)."""
    return _post({
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "cta_url",
            "body": {"text": body},
            "action": {"name": "cta_url", "parameters": {"display_text": display_text, "url": url}},
        },
    })


def send_list(to: str, body: str, button: str, options: list[tuple[str, str]]) -> dict:
    """options: list of (id, title). WhatsApp list-message — максимум 10 строк."""
    rows = [{"id": oid, "title": title[:24]} for oid, title in options[:10]]
    return _post({
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "list",
            "body": {"text": body},
            "action": {"button": button[:20], "sections": [{"title": "Варианты", "rows": rows}]},
        },
    })

def send_typing_on(message_id: str) -> dict:
    """Cloud API: помечает входящее ПРОЧИТАННЫМ + показывает 'печатает…'.
    Требует wamid ВХОДЯЩЕГО сообщения (не номер). Индикатор гаснет сам ~25с
    или при отправке нашего ответа. Без id — тихий no-op."""
    if not message_id:
        return {"skipped": True}
    return _post({
        "messaging_product": "whatsapp",
        "status": "read",
        "message_id": message_id,
        "typing_indicator": {"type": "text"},
    })
