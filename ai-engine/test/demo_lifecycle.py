"""
ДЕМО всей WhatsApp-петли на сжатом тайминге (минуты вместо часов).

Сидит моковый стол вокруг ТВОЕГО профиля (номер задаётся в MY_PHONE ниже), создаёт ужин
через ~3 минуты и шлёт тебе в WhatsApp всю последовательность, чтобы прогнать вживую:

  t+0:00  «стол собран» (ответь IN / OUT)
  t+1:00  «подтверди»   (ответь YES / NO)        — за 2 мин до ужина
  t+3:00  айсбрейкеры   (в момент ужина)
  t+4:00  афтерпати     (адрес)
  t+6:00  фидбек L1     (оцени + текст → бот спросит L2: с кем продолжить)

Запуск (из ai-engine), нужен ПОДНЯТЫЙ бэк+туннель+webhook (чтобы твои ОТВЕТЫ ловились):
    py test/demo_lifecycle.py

Все исходящие всё равно уходят на твой номер (WA_TEST_TO в .env), так что моки —
просто соседи по столу в тексте. Перед стартом чистит прошлую демо-сессию.
"""
import os
import sys
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database.database import get_supabase
from wa import send, lifecycle
from wa.dialog import set_mode

sb = get_supabase()
MY_PHONE = os.getenv("WA_TEST_TO", "+10000000000")  # ← свой номер в .env
EVENT_TITLE = "DEMO Dinner 🧪"

MOCKS = [
    {"user_id": "demo_anna", "name": "Anna Petrova", "education": "Rotman School of Management",
     "domains": ["Fintech", "Venture Capital"], "hard_skills": ["Venture Capital", "Due Diligence", "Fundraising"],
     "current_status": {"type": "Investor", "company_name": "NorthStar Ventures", "stage": ""}},
    {"user_id": "demo_mark", "name": "Mark Lee", "education": "University of Waterloo, CS",
     "domains": ["E-commerce", "AI"], "hard_skills": ["Python", "Machine Learning", "Backend"],
     "current_status": {"type": "Engineering Lead", "company_name": "Shopify", "stage": ""}},
    {"user_id": "demo_sofia", "name": "Sofia Reyes", "education": "University of Toronto",
     "domains": ["Healthcare", "AI"], "hard_skills": ["Product Management", "Growth", "UX"],
     "current_status": {"type": "Founder", "company_name": "HealthLoop", "stage": "Scaling"}},
    {"user_id": "demo_david", "name": "David Kim", "education": "University of Waterloo",
     "domains": ["Fintech", "Product"], "hard_skills": ["Product Management", "SQL", "Analytics"],
     "current_status": {"type": "Product Manager", "company_name": "Wealthsimple", "stage": ""}},
]


def cleanup():
    evs = sb.table("events").select("id").eq("title", EVENT_TITLE).execute().data or []
    for ev in evs:
        sb.table("event_rsvps").delete().eq("event_id", ev["id"]).execute()
        sb.table("events").delete().eq("id", ev["id"]).execute()
    for m in MOCKS:
        sb.table("users").delete().eq("user_id", m["user_id"]).execute()
    sb.table("wa_conversations").delete().eq("phone", MY_PHONE).execute()
    print("[demo] cleaned previous demo data", file=sys.stderr)


def seed():
    me = sb.table("users").select("*").eq("phone", MY_PHONE).execute().data
    if not me:
        raise SystemExit(f"нет профиля с телефоном {MY_PHONE} — пройди онбординг сначала")
    me = me[0]

    for m in MOCKS:
        sb.table("users").upsert({**m, "city": "Toronto", "languages": ["English"],
                                  "onboarding_completed": True}, on_conflict="user_id").execute()

    now = datetime.now()
    start = now + timedelta(minutes=3)
    ev = sb.table("events").insert({
        "id": f"demo_ev_{uuid.uuid4().hex[:8]}",
        "title": EVENT_TITLE, "event_date": start.strftime("%Y-%m-%d"),
        "start_time": start.strftime("%H:%M:%S"), "city": "Toronto", "status": "open",
        "is_matched_primary": True, "afterparty_location": "Bar Raval, 505 College St",
    }).execute().data[0]

    # реальный стол (event_tables.id — uuid), его id -> table_id у rsvp
    tbl = sb.table("event_tables").insert({
        "event_id": ev["id"], "table_number": 1,
        "restaurant_name": "Demo Bistro", "address": "123 King St W, Toronto",
    }).execute().data[0]
    table_id = tbl["id"]
    rows = []
    for u in [me] + MOCKS:
        rows.append({
            "user_id": u["user_id"], "event_id": ev["id"], "status": "pending", "table_id": table_id,
            # глушим matching-демон по этому ивенту — демо шлёт всё вручную
            "notified_ready": True, "notified_confirm": True, "notified_icebreakers": True,
            "notified_afterparty": True, "notified_feedback": True,
        })
    sb.table("event_rsvps").upsert(rows, on_conflict="user_id,event_id").execute()

    # rsvp_id нашего юзера — для set_mode контекста
    my_rsvp = sb.table("event_rsvps").select("id").eq("event_id", ev["id"]).eq("user_id", me["user_id"]).execute().data[0]
    print(f"[demo] event {ev['id']} @ {start:%H:%M}, table of {len(MOCKS)+1}", file=sys.stderr)
    return me, ev, my_rsvp["id"]


def step(label, secs):
    print(f"[demo] +{secs}s … {label}", file=sys.stderr)
    time.sleep(secs)


def main():
    cleanup()
    me, ev, rsvp_id = seed()
    mates = MOCKS  # соседи по столу

    print("[demo] СТАРТ — следи за WhatsApp. Можешь отвечать боту (IN/YES/фидбек).", file=sys.stderr)

    # t+0: стол собран — с quick-reply кнопками IN/OUT
    send.send_buttons(MY_PHONE.lstrip("+"), lifecycle.msg_dinner_ready(ev, mates), lifecycle.RSVP_BUTTONS)
    set_mode(MY_PHONE, "rsvp", {"event_id": ev["id"], "rsvp_id": rsvp_id})

    step("подтверждение", 60)
    send.send_buttons(MY_PHONE.lstrip("+"), lifecycle.msg_confirm(ev), lifecycle.CONFIRM_BUTTONS)
    set_mode(MY_PHONE, "confirm", {"event_id": ev["id"], "rsvp_id": rsvp_id})

    step("айсбрейкеры (момент ужина)", 120)
    send.send_text(MY_PHONE.lstrip("+"), lifecycle.msg_icebreakers(ev, me, mates))

    step("афтерпати", 60)
    send.send_text(MY_PHONE.lstrip("+"), lifecycle.msg_afterparty(ev))

    step("фидбек L1", 120)
    send.send_text(MY_PHONE.lstrip("+"), lifecycle.msg_feedback_l1(ev))
    set_mode(MY_PHONE, "feedback_l1", {"event_id": ev["id"]})

    print("[demo] Готово. Ответь на фидбек — бот спросит L2 (с кем продолжить).", file=sys.stderr)
    print("[demo] Чтобы убрать демо-данные: перезапусти скрипт (он чистит в начале).", file=sys.stderr)


if __name__ == "__main__":
    main()
