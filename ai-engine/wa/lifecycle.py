"""
WhatsApp lifecycle-уведомления вокруг ужина (исходящие, English).

Тайминг (демон, run_due_notifications):
  • T-72h  «стол готов»  — дата/время + кто за столом → reply IN/OUT
  • T-24h  «подтверди»   — напоминание + подтверждение
  • в ивент «афтерпати»  — место афтерпати
  • T+12h  «фидбек L1»   — первое впечатление (L2 «с кем встретиться» — входящий шаг)

Идемпотентность — флаги в event_rsvps (notified_*). Каждое шлётся один раз.

ВАЖНО: это business-initiated сообщения. Вне 24-часового окна Meta требует
approved message templates; в тесте на свой номер работает в пределах окна.
Формат — WhatsApp-разметка: *bold*, _italic_, ~strike~, ```mono```, списки `- `.
"""
import logging
import os

from database.database import get_supabase
from wa import send

logger = logging.getLogger(__name__)

# Слать ли через APPROVED templates (для business-initiated вне 24ч-окна).
# false (по умолчанию) — free-form (тест внутри окна, пока шаблоны не одобрены).
# true — после апрува в Meta. Имена шаблонов = как в WhatsApp Manager (см. WHATSAPP_TEMPLATES.md).
USE_TEMPLATES = os.getenv("WA_USE_TEMPLATES", "false").lower() in ("true", "1", "yes")
TPL_LANG = os.getenv("WA_TEMPLATE_LANG", "en")

# Тайминг вокруг ивента (часы до старта):
#   T-6d (144ч) — записываем участников и шлём go/no-go «идёшь?»
#   T-4d (96ч)  — рассадка (метч); остаётся время поправить вручную в админке
#   T-3d (72ч)  — анонс «стол собран + кто будет» (без вопроса)
#   T-24h       — подтверждение + адрес
INVITE_WINDOW_H = float(os.getenv("WA_INVITE_WINDOW_H", "144"))   # T-6d
AUTO_MATCH_WINDOW_H = float(os.getenv("AUTO_MATCH_WINDOW_H", "96"))  # T-4d
# Куда слать админ-пинг про авто-метч (пусто -> только лог).
ADMIN_WA = os.getenv("ADMIN_WA", "")
TPL = {
    "invite":       os.getenv("TPL_INVITE", "dinner_invite"),
    "dinner_ready": os.getenv("TPL_DINNER_READY", "dinner_ready"),
    "confirm":      os.getenv("TPL_CONFIRM", "dinner_confirm"),
    "icebreakers":  os.getenv("TPL_ICEBREAKERS", "icebreakers"),
    "afterparty":   os.getenv("TPL_AFTERPARTY", "afterparty"),
    "feedback":     os.getenv("TPL_FEEDBACK", "feedback_l1"),
}


def _sb():
    return get_supabase()


def _to(phone: str) -> str:
    return (phone or "").lstrip("+")


# Quick-reply кнопки (id ловит роутер через reply_id; _yesish/_noish их понимают).
RSVP_BUTTONS = [("IN", "✅ I'm in"), ("OUT", "❌ Can't make it")]
CONFIRM_BUTTONS = [("YES", "✅ Confirm"), ("NO", "❌ Cancel")]


def _when(ev: dict) -> str:
    d = str(ev.get("event_date", ""))
    t = str(ev.get("start_time", ""))[:5]
    return f"_{d}, {t}_" if d else ""


def _mates_flat(mates: list[dict]) -> str:
    """Соседи одной строкой через ' · ' (для template-переменной — без переносов)."""
    roles = []
    for u in mates:
        st = u.get("current_status") or {}
        roles.append(u.get("headline") or st.get("type") or "Interesting person")
    return " · ".join(roles) if roles else "a group of 5-6 people"


def _tablemates_block(mates: list[dict]) -> str:
    lines = []
    for u in mates:
        st = u.get("current_status") or {}
        role = u.get("headline") or st.get("type") or "Interesting person"
        lines.append(f"- {role}")
    return "\n".join(lines) if lines else "- A group of 5-6 people"


# ---------------- message builders (WhatsApp markdown) ----------------
def _venue_text(ev: dict) -> str:
    """Первый инвайт: ресторан цепляют позже, точного адреса ещё нет → говорим об этом."""
    city = (ev.get("city") or "").split(",")[0].strip()
    return f"{city}, exact address about 24h before" if city else "Exact address about 24h before"


def msg_invite(ev: dict) -> str:
    """T-6d go/no-go: спрашиваем, идёт ли человек на ближайший ужин (IN/OUT)."""
    return (
        f"*🍽 {ev.get('title', 'Coconect dinner')} this Saturday!*\n"
        f"{_when(ev)}\n\n"
        "A table of 5-6 people in your city. Are you in?\n"
        "_Tap below and I'll start building your table 👇_"
    )


def _person_role(u: dict) -> str:
    st = u.get("current_status") or {}
    return u.get("headline") or st.get("type") or "Interesting person to meet"


def msg_dinner_ready(ev: dict, mates: list[dict], blurbs: dict | None = None) -> str:
    """T-3d анонс «стол собран» — БЕЗ вопроса «идёшь?» (go/no-go уже был на онбординге).
    Для каждого соседа — короткий LLM-блёрб «кто это» (про получателя НЕ пишем — он не в mates)."""
    blurbs = blurbs or {}
    lines = []
    for u in mates:
        b = blurbs.get(u.get("user_id")) or _person_role(u)
        nm = u.get("name") or "Someone interesting"
        lines.append(f"*{nm}*: {b}")
    who = "\n".join(lines) if lines else "- A group of 5-6 people"
    return (
        f"*🍽 Your Saturday table is coming together!*\n\n"
        f"*{ev.get('title', 'Coconect dinner')}*\n{_when(ev)}\n"
        f"📍 {_venue_text(ev)}\n\n"
        f"*Who you'll meet:*\n{who}\n\n"
        f"_Exact address lands about 24h before. No need to reply, just save the date 🗓️_"
    )


def msg_confirm(ev: dict, venue: str = "") -> str:
    loc = f"📍 {venue}\n\n" if venue else ""
    return (
        f"*⏰ Dinner is tomorrow!*\n\n"
        f"*{ev.get('title', 'Coconect dinner')}*, {_when(ev)}\n"
        f"{loc}"
        f"Quick confirm so we hold your seat 👇"
    )


def msg_finalizing(ev: dict) -> str:
    """T-24h, но гость ещё без стола («мимо») — не молчим и не врём адресом."""
    return (
        f"*⏰ {ev.get('title', 'Your dinner')} is tomorrow!*\n\n"
        "We're finalizing your exact table right now. I'll send the address here shortly 🙏"
    )


def icebreaker_params(me: dict | None = None, mates: list[dict] | None = None) -> list[str]:
    """3 динамических вопроса (по составу стола) — как {{1}}/{{2}}/{{3}} для шаблона."""
    from matching.rerank import icebreaker_questions
    return icebreaker_questions(me, mates)


def msg_icebreakers(qs: list[str]) -> str:
    """В момент ужина — готовые вопросы по составу стола (free-form вид)."""
    body = "\n".join(f"{i}. {q}" for i, q in enumerate(qs, 1))
    return (
        "*🧊 Icebreakers for your table*\n\n"
        "Go around and try these:\n"
        f"{body}\n\n"
        "Have a great dinner 🍝"
    )


def msg_afterparty(ev: dict) -> str:
    place = ev.get("afterparty_location") or ev.get("address") or ""
    tail = f"*{place}*" if place else "drop a message here for the spot"
    return (
        "*🎉 The night continues!*\n\n"
        f"Afterparty: {tail}\nSee you there 🍸"
    )


def msg_feedback_l1(ev: dict) -> str:
    return (
        "*How was last night?* ✨\n\n"
        f"_{ev.get('title', 'the dinner')}_\n\n"
        "Rate the vibe *1-5* and drop a line. What was great, what wasn't?\n"
        "_(next I'll ask who you'd like to meet again)_"
    )


# ---------------- авто-метчинг (BUILD A) ----------------
def _notify_admin_match(ev: dict, res: dict) -> None:
    """Лог + (опц.) WhatsApp-пинг админу про результат авто-метча."""
    title = ev.get("title") or ev.get("id")
    if res.get("ok"):
        msg = (f"🪑 Auto-matched “{title}”: seated {res.get('seated')}, "
               f"overflow {res.get('overflow')}, tables {res.get('tables')}.")
    else:
        msg = f"⚠️ Auto-match skipped “{title}”: {res.get('error')}"
    logger.info("[lifecycle] %s", msg)
    if ADMIN_WA and res.get("ok"):
        try:
            send.send_text(_to(ADMIN_WA), msg)
        except Exception as e:
            logger.error(f"[lifecycle] admin ping failed: {e}")


def _opted_in_user_ids() -> set:
    """Кто хоть раз сказал «иду» = есть не-cancelled RSVP в истории. Это наш гейт
    еженедельной авто-записи вместо слепого набора по городу (чинит рассылку
    незаинтересованным — человек без единого RSVP больше не попадает под раздачу)."""
    rows = _sb().table("event_rsvps").select("user_id").neq("status", "cancelled").execute().data or []
    return {r["user_id"] for r in rows if r.get("user_id")}


def _auto_enroll_optin(event_id: str, city: str | None) -> int:
    """Авто-RSVP в ивент только тех, кто УЖЕ опт-инулся ранее (см. _opted_in_user_ids)
    и ещё не записан в этот ивент. Первичный opt-in делается явным go/no-go на финише
    онбординга (wa.dialog), а НЕ здесь — поэтому новые/незаинтересованные не гребутся."""
    if not city:
        return 0
    key = city.split(",")[0].strip()  # "Toronto, Canada" -> "Toronto" (форматы городов разнятся)
    sb = _sb()
    existing = sb.table("event_rsvps").select("user_id").eq("event_id", event_id).execute().data or []
    have = {r["user_id"] for r in existing}
    optin = _opted_in_user_ids()
    users = (sb.table("users").select("user_id, events_quota, events_used")
             .eq("onboarding_completed", True).ilike("city", f"%{key}%").execute().data) or []
    free_mode = os.getenv("FREE_MODE", "false").lower() in ("true", "1", "yes")

    def _has_quota(u: dict) -> bool:
        # Платный режим: записываем только тех, у кого остались дннеры в цикле.
        return free_mode or (u.get("events_used") or 0) < (u.get("events_quota") or 0)

    new = [{"user_id": u["user_id"], "event_id": event_id, "status": "pending"}
           for u in users if u["user_id"] not in have and u["user_id"] in optin and _has_quota(u)]
    if new:
        sb.table("event_rsvps").insert(new).execute()
    return len(new)


# ---------------- субботний ивент (авто-создание) ----------------
def _next_saturday(now=None):
    """Дата ближайшей предстоящей субботы (если сегодня сб — берём следующую)."""
    from datetime import timedelta
    if now is None:
        from main import now_toronto
        now = now_toronto()
    days = (5 - now.weekday()) % 7  # Mon=0…Sun=6, Sat=5
    if days == 0:
        days = 7
    return (now + timedelta(days=days)).date()


def ensure_saturday_event(city: str | None) -> dict | None:
    """Находит/создаёт open-ивент на ближайшую субботу для города. Дедуп по city+date.
    Используется при финише онбординга (go/no-go) и еженедельным тиком демона."""
    if not city:
        return None
    import uuid
    sb = _sb()
    key = city.split(",")[0].strip()
    date = _next_saturday().isoformat()
    # Пропуск конкретных суббот (напр. бывают ужины раз в 2 недели): даты в
    # WA_SKIP_EVENT_DATES (через запятую, YYYY-MM-DD) демон НЕ создаёт.
    skip = {d.strip() for d in os.getenv("WA_SKIP_EVENT_DATES", "").split(",") if d.strip()}
    if date in skip:
        logger.info("[lifecycle] auto-event on %s skipped (WA_SKIP_EVENT_DATES)", date)
        return None
    existing = (sb.table("events").select("*")
                .ilike("city", f"%{key}%").eq("event_date", date)
                .neq("status", "passed").execute().data) or []
    if existing:
        return existing[0]
    ev = {
        "id": f"ev_{uuid.uuid4().hex[:8]}",
        "title": "Saturday Dinner",
        "city": city,
        "event_date": date,
        "start_time": "19:00:00",
        "type": "dinner",
        "status": "open",
        "required_tier": "Starter",
        "capacity": 60,
        "ask_budget": True,
        "ask_diet": True,
    }
    try:
        sb.table("events").insert(ev).execute()
        logger.info("[lifecycle] created Saturday event %s for '%s' on %s", ev["id"], city, date)
    except Exception as e:
        logger.error(f"[lifecycle] ensure_saturday_event failed for {city}: {e}")
        return None
    return ev


def _maybe_auto_match(ev: dict, h: float) -> None:
    """Двухфазно вокруг ивента (если ещё не рассажен):
      • T-6d (h ≤ INVITE_WINDOW_H): только ЗАПИСЫВАЕМ участников (opt-in) — чтобы было
        кого спросить go/no-go в этот же тик (см. ветку invite в run_due_notifications).
      • T-4d (h ≤ AUTO_MATCH_WINDOW_H): РАССАЖИВАЕМ — остаётся время поправить руками."""
    if ev.get("is_matched_primary"):
        return
    if not (0 < h <= INVITE_WINDOW_H):
        return
    try:
        enrolled = _auto_enroll_optin(ev["id"], ev.get("city"))
        if enrolled:
            logger.info("[lifecycle] auto-enrolled %d '%s' users -> %s", enrolled, ev.get("city"), ev["id"])
    except Exception as e:
        logger.error(f"[lifecycle] auto-enroll failed for {ev.get('id')}: {e}")
    if h > AUTO_MATCH_WINDOW_H:
        return  # ещё рано рассаживать — только запись + go/no-go
    try:
        from matching.seating import run_event_matching
        logger.info("[lifecycle] auto-match: event=%s h=%.1f", ev["id"], h)
        res = run_event_matching(ev["id"], is_final=False)
        if res.get("ok"):
            ev["is_matched_primary"] = True
        _notify_admin_match(ev, res)
    except Exception as e:
        logger.error(f"[lifecycle] auto-match failed for {ev.get('id')}: {e}")


# ---------------- daemon ----------------
def run_due_notifications():
    """Один тик: разослать назревшие уведомления (вызывается из демона main)."""
    from main import hours_until  # lazy: избегаем циклического импорта
    from wa.dialog import set_mode  # ставим режим ожидаемого ответа

    evs = _sb().table("events").select("*").neq("status", "passed").execute().data or []
    for ev in evs:
        try:
            h = hours_until(ev)
        except Exception:
            continue

        # Авто-метчинг до рассылки: ивент скоро и без рассадки → метчим сами.
        _maybe_auto_match(ev, h)

        rsvps = (_sb().table("event_rsvps").select("*, users(*)")
                 .eq("event_id", ev["id"]).neq("status", "cancelled").execute().data) or []
        rsvps = [r for r in rsvps if r.get("users") and r.get("users", {}).get("phone")]
        if not rsvps:
            continue

        # группировка по столу — для блока «кто за столом»
        by_table: dict = {}
        for r in rsvps:
            by_table.setdefault(r.get("table_id"), []).append(r)

        ib_cache: dict = {}  # icebreakers генерим ОДИН раз на стол (LLM), не на юзера
        blurb_cache: dict = {}  # «кто это» на каждого — тоже один LLM-вызов на стол
        unseated: list = []  # активные гости без стола на T-24h («где мимо» → пинг админу)

        # рестораны столов одним запросом (надёжнее, чем per-user) -> {table_id: "name, addr"}
        venues: dict = {}
        try:
            for t in (_sb().table("event_tables").select("id,restaurant_name,address")
                      .eq("event_id", ev["id"]).execute().data or []):
                venues[t["id"]] = ", ".join(p for p in [t.get("restaurant_name"), t.get("address")] if p)
        except Exception as e:
            logger.error(f"[lifecycle] venues load failed: {e}")

        for r in rsvps:
            u = r["users"]
            phone = u.get("phone")
            rid = r["id"]
            try:
                title = ev.get("title", "Coconect dinner")
                date = str(ev.get("event_date", ""))
                tm = str(ev.get("start_time", ""))[:5]
                # T-6d: go/no-go «идёшь на ужин?» — один раз на ивент (preferences.invited).
                # Новичков спрашивает онбординг сразу; здесь — еженедельный заход для записанных.
                prefs = r.get("preferences") or {}
                if (INVITE_WINDOW_H >= h > AUTO_MATCH_WINDOW_H) and r.get("status") == "pending" and not prefs.get("invited"):
                    if USE_TEMPLATES:
                        send.send_template(_to(phone), TPL["invite"], TPL_LANG, [title, f"{date}, {tm}"])
                    else:
                        send.send_buttons(_to(phone), msg_invite(ev), RSVP_BUTTONS)
                    set_mode(phone, "rsvp", {"event_id": ev["id"], "rsvp_id": rid, "source": "weekly"})
                    _sb().table("event_rsvps").update(
                        {"preferences": {**prefs, "invited": True}}
                    ).eq("id", rid).execute()

                # T-72h: стол собран → ИНФО «вот твой стол + кто будет» БЕЗ вопроса.
                # go/no-go спрашиваем один раз на онбординге (wa.dialog), здесь только анонс.
                elif (72 >= h > 24) and r.get("table_id") and ev.get("is_matched_primary") and not r.get("notified_ready"):
                    tid = r.get("table_id")
                    mates = [m["users"] for m in by_table.get(tid, []) if m["id"] != rid]
                    if tid not in blurb_cache:  # один LLM-вызов на весь стол
                        table_people = [m["users"] for m in by_table.get(tid, []) if m.get("users")]
                        from llm_extract import tablemate_blurbs
                        blurb_cache[tid] = tablemate_blurbs(table_people)
                    blurbs = blurb_cache[tid]
                    if USE_TEMPLATES:
                        send.send_template(_to(phone), TPL["dinner_ready"], TPL_LANG,
                                           [title, date, tm, _venue_text(ev), _mates_flat(mates)])
                    else:
                        send.send_text(_to(phone), msg_dinner_ready(ev, mates, blurbs))
                    _sb().table("event_rsvps").update({"notified_ready": True}).eq("id", rid).execute()

                # T-24h: подтверждение + адрес по ФИНАЛЬНОЙ рассадке (учитывая ручные правки).
                elif (24 >= h > 1) and not r.get("notified_confirm"):
                    tid = r.get("table_id")
                    venue = venues.get(tid, "")
                    if not tid:
                        # «мимо»: активный гость без стола за 24ч — флаг админу, юзеру честно
                        unseated.append(u.get("name") or phone)
                        send.send_text(_to(phone), msg_finalizing(ev))
                    else:
                        if USE_TEMPLATES:
                            when = f"{date}, {tm}" + (f" · {venue}" if venue else "")
                            send.send_template(_to(phone), TPL["confirm"], TPL_LANG, [title, when])
                        else:
                            send.send_buttons(_to(phone), msg_confirm(ev, venue), CONFIRM_BUTTONS)
                        set_mode(phone, "confirm", {"event_id": ev["id"], "rsvp_id": rid})
                    _sb().table("event_rsvps").update({"notified_confirm": True}).eq("id", rid).execute()

                # за 1 час до ужина: айсбрейкеры (3 динамических вопроса, ответа не ждём)
                elif (1.5 >= h >= 0) and r.get("table_id") and not r.get("notified_icebreakers"):
                    tid = r.get("table_id")
                    if tid not in ib_cache:  # один LLM-вызов на весь стол
                        table_people = [m["users"] for m in by_table.get(tid, []) if m.get("users")]
                        ib_cache[tid] = icebreaker_params(None, table_people)
                    qs = ib_cache[tid]
                    if USE_TEMPLATES:
                        send.send_template(_to(phone), TPL["icebreakers"], TPL_LANG, qs)
                    else:
                        send.send_text(_to(phone), msg_icebreakers(qs))
                    _sb().table("event_rsvps").update({"notified_icebreakers": True}).eq("id", rid).execute()

                # после старта: афтерпати (ответа не ждём)
                elif (-1 >= h > -4) and not r.get("notified_afterparty"):
                    if USE_TEMPLATES:
                        send.send_template(_to(phone), TPL["afterparty"], TPL_LANG,
                                           [ev.get("afterparty_location") or ev.get("address") or "TBA"])
                    else:
                        send.send_text(_to(phone), msg_afterparty(ev))
                    _sb().table("event_rsvps").update({"notified_afterparty": True}).eq("id", rid).execute()

                # T+12h: фидбек L1 (первое впечатление) → дальше router ведёт в L2
                elif (h <= -12) and not r.get("notified_feedback"):
                    if USE_TEMPLATES:
                        send.send_template(_to(phone), TPL["feedback"], TPL_LANG, [title])
                    else:
                        send.send_text(_to(phone), msg_feedback_l1(ev))
                    set_mode(phone, "feedback_l1", {"event_id": ev["id"]})
                    _sb().table("event_rsvps").update({"notified_feedback": True}).eq("id", rid).execute()
            except Exception as e:
                logger.error(f"[lifecycle] notify failed ev={ev.get('id')} rsvp={rid}: {e}")

        # «где мимо»: активные гости без стола на T-24h → один пинг админу на ивент.
        if unseated:
            warn = (f"⚠️ {ev.get('title') or ev['id']}: {len(unseated)} guest(s) still UNSEATED at T-24h "
                    f"— {', '.join(unseated[:10])}. Seat them in admin before address goes out.")
            logger.warning("[lifecycle] %s", warn)
            if ADMIN_WA:
                try:
                    send.send_text(_to(ADMIN_WA), warn)
                except Exception as e:
                    logger.error(f"[lifecycle] unseated admin ping failed: {e}")


# ---------------- re-engagement nudges (BUILD: бросил онбординг / не ответил на go-no-go) ----------------
# Молчит NUDGE_FIRST_H → нудж #1; ещё NUDGE_SECOND_DAYS → нудж #2 (последний); потом стоп.
NUDGE_FIRST_H = float(os.getenv("WA_NUDGE_FIRST_H", "24"))
NUDGE_SECOND_DAYS = float(os.getenv("WA_NUDGE_SECOND_DAYS", "7"))
TPL_REENGAGE = os.getenv("TPL_REENGAGE", "reengage")


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def _age_hours(ts) -> float:
    from datetime import datetime, timezone
    if not ts:
        return 1e9
    try:
        dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).total_seconds() / 3600.0
    except Exception:
        return 1e9


# Коды Meta «доставить нельзя / нужен ре-инициат» — после такого нуджи останавливаем.
_UNDELIVERABLE_CODES = {131026, 131047, 131051, 131052, 131000, 470}


def _send_failed(res: dict | None) -> bool:
    """True, если Meta вернула ошибку недоставляемости (номер не в WA / окно закрыто и т.п.)."""
    if not isinstance(res, dict):
        return False
    err = res.get("error")
    if isinstance(err, dict):
        code = err.get("code")
        try:
            return int(code) in _UNDELIVERABLE_CODES
        except Exception:
            return True  # любая структурная ошибка Meta — считаем недоставкой
    return bool(err)  # наш wrapper {"error": "..."} после ретраев


def _get_user_min(phone: str) -> dict | None:
    r = _sb().table("users").select("user_id, name, onboarding_completed, city").eq("phone", phone).execute().data
    return r[0] if r else None


def run_due_nudges():
    """Один тик: добить тех, кто бросил WA-онбординг или не ответил на go/no-go.
    Стадии и тайминг — в wa_conversations.context (nudge_stage / nudged_at)."""
    sb = _sb()
    rows = sb.table("wa_conversations").select("*").execute().data or []
    for st in rows:
        phone = st.get("phone")
        if not phone:
            continue
        try:
            ctx = st.get("context") or {}
            if ctx.get("undeliverable"):
                continue
            stage = int(ctx.get("nudge_stage") or 0)
            if stage >= 2:
                continue

            mode = st.get("mode")
            draft = st.get("draft") or {}
            user = _get_user_min(phone)

            # цель нуджа
            if user and not user.get("onboarding_completed") and (draft.get("history") or draft.get("raw")):
                target = "onboarding"
            elif mode == "rsvp" and ctx.get("source") == "onboarding" and not ctx.get("decided"):
                target = "gonogo"
            else:
                continue

            # тайминг: stage0 — молчание от updated_at; stage1 — неделя от nudged_at
            if stage == 0:
                if _age_hours(st.get("updated_at")) < NUDGE_FIRST_H:
                    continue
            else:
                if _age_hours(ctx.get("nudged_at")) < NUDGE_SECOND_DAYS * 24:
                    continue

            new_stage = stage + 1
            name = ((user.get("name") if user else None) or "there").split()[0]
            if USE_TEMPLATES:
                res = send.send_template(_to(phone), TPL_REENGAGE, TPL_LANG, [name])
            else:
                from llm_extract import reengage_opener
                pctx = ""
                if user:
                    try:
                        from wa.dialog import _onb_profile_ctx
                        pctx = _onb_profile_ctx(user["user_id"])
                    except Exception:
                        pctx = ""
                res = send.send_text(_to(phone), reengage_opener(pctx, name, stage=new_stage))

            if _send_failed(res):
                # недоставляемо (возможно, чат удалён/номер не в WA) → стоп нуджей
                sb.table("wa_conversations").update(
                    {"context": {**ctx, "undeliverable": True}}
                ).eq("phone", phone).execute()
                logger.info("[nudge] %s undeliverable — stop", phone)
                continue

            sb.table("wa_conversations").update(
                {"context": {**ctx, "nudge_stage": new_stage, "nudged_at": _now_iso()}}
            ).eq("phone", phone).execute()
            logger.info("[nudge] %s -> %s stage=%d", phone, target, new_stage)
        except Exception as e:
            logger.error(f"[nudge] failed for {phone}: {e}")
