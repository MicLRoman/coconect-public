"""
Аддитивный сид моковых юзеров для теста матчинга (НЕ вайпает существующих).

Берёт ai-engine/test/users.json (реальные give/ask векторы из кэша LinkedIn),
кладёт в БД 24 мок-юзера с user_id 'mock_*':
  • 12 в Toronto (метчатся на Toronto-ивент),
  • 12 в другом городе (London) — отсекаются city-фильтром.
Номера ЗАВЕДОМО битые (+1999...) — Meta не доставит, темплейты не тратятся.
onboarding_completed=True, чтобы попадали в пул матчинга.

Запуск (из ai-engine):  py test/seed_mocks.py
Удалить потом:           py test/seed_mocks.py --clear
"""
import json
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from database.database import get_supabase

HERE = Path(__file__).resolve().parent
TORONTO_N = 14          # >12, чтобы при capacity=12 двое ушли в overflow
OTHER_CITY = "London"
TARGET_N = 26
PRIORITY_IDS = {"mock_00", "mock_01"}   # приоритетные Toronto — всегда садятся

# Поля из users.json, которые реально являются колонками users.
COPY_FIELDS = [
    "name", "languages", "education", "hard_skills", "domains", "experience_level",
    "current_status", "avatar", "experiences", "projects", "honors",
    "communication_style", "match_type", "intent_tag", "intent_goals",
    "custom_request_raw", "give_vector", "ask_vector",
]


def _rows():
    src = json.loads((HERE / "users.json").read_text(encoding="utf-8"))
    if not src:
        raise SystemExit("users.json пуст — сначала py test/build_users.py")
    # добиваем до TARGET_N дубликатами (для 'другого города' векторы не важны)
    pool = list(src)
    while len(pool) < TARGET_N:
        pool.append(dict(src[len(pool) % len(src)]))
    pool = pool[:TARGET_N]

    rows = []
    for i, u in enumerate(pool):
        city = "Toronto" if i < TORONTO_N else OTHER_CITY
        uid = f"mock_{i:02d}"
        row = {
            "user_id": uid,
            "phone": f"+1999{i:07d}",          # битый номер: не доставится
            "city": city,
            "priority": uid in PRIORITY_IDS,
            "onboarding_completed": True,
            "subscription_tier": "Starter",
            "events_quota": 1,
            "events_used": 0,
            "available_formats": ["Dinners"],
            "lang": "en",
        }
        for f in COPY_FIELDS:
            if u.get(f) is not None:
                row[f] = u[f]
        rows.append(row)
    return rows


def seed():
    sb = get_supabase()
    rows = _rows()
    for r in rows:
        sb.table("users").upsert(r, on_conflict="user_id").execute()
    tor = sum(1 for r in rows if r["city"] == "Toronto")
    print(f"[seed_mocks] inserted {len(rows)} mock users: {tor} Toronto, {len(rows)-tor} {OTHER_CITY}")
    print(f"[seed_mocks] ids: mock_00..mock_{len(rows)-1:02d} (phones +1999xxxxxxx are fake/undeliverable)")


def rsvp(event_id: str, capacity: int = 12):
    """Записать 14 Toronto-моков на ивент (status pending) + выставить capacity.
    Дальше демон сам авто-метчит (ивент ≤73ч, без рассадки)."""
    sb = get_supabase()
    tor_ids = [f"mock_{i:02d}" for i in range(TORONTO_N)]
    for uid in tor_ids:
        sb.table("event_rsvps").upsert(
            {"user_id": uid, "event_id": event_id, "status": "pending"},
            on_conflict="user_id,event_id",
        ).execute()
    sb.table("events").update({"capacity": capacity}).eq("id", event_id).execute()
    print(f"[seed_mocks] RSVP'd {len(tor_ids)} Toronto mocks to {event_id}, capacity={capacity}")


def clear():
    sb = get_supabase()
    ids = [f"mock_{i:02d}" for i in range(TARGET_N)]
    sb.table("event_rsvps").delete().in_("user_id", ids).execute()
    sb.table("users").delete().in_("user_id", ids).execute()
    print(f"[seed_mocks] cleared mock_00..mock_{TARGET_N-1:02d}")


if __name__ == "__main__":
    if "--clear" in sys.argv:
        clear()
    elif "--rsvp" in sys.argv:
        i = sys.argv.index("--rsvp")
        event_id = sys.argv[i + 1]
        cap = 12
        if "--capacity" in sys.argv:
            cap = int(sys.argv[sys.argv.index("--capacity") + 1])
        rsvp(event_id, cap)
    else:
        seed()
