"""Тест-шаг: вернуть Дмитрия в стол, слить ~половину моков, перенести ивент на сегодня."""
import sys
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from database.database import get_supabase

EVENT_ID = "ev_ed8c1bb7"
BRONNIKOV = "usr_d93bf53952"
DROP_PER_TABLE = 2

sb = get_supabase()

# A) вернуть Дмитрия в стол (matched), confirm ещё не слали
sb.table("event_rsvps").update({"status": "matched", "notified_confirm": False}) \
    .eq("event_id", EVENT_ID).eq("user_id", BRONNIKOV).execute()
print("A) bronnikov -> matched")

# текущие посаженные
rows = sb.table("event_rsvps").select("id,user_id,table_id,status") \
    .eq("event_id", EVENT_ID).eq("status", "matched").execute().data or []
by_table = {}
for r in rows:
    by_table.setdefault(r.get("table_id"), []).append(r)
print(f"   seated now: {len(rows)} across {len(by_table)} tables")

# B) слить по DROP_PER_TABLE мока из каждого стола (не Дмитрия)
dropped = 0
for tid, members in by_table.items():
    cands = [m for m in members if str(m["user_id"]).startswith("mock_")]
    for m in cands[:DROP_PER_TABLE]:
        sb.table("event_rsvps").update({"status": "cancelled"}).eq("id", m["id"]).execute()
        dropped += 1
print(f"B) dropped {dropped} mocks (~{DROP_PER_TABLE}/table)")

# remaining matched -> сбросить notified_confirm, чтобы confirm ушёл
remain = sb.table("event_rsvps").select("id").eq("event_id", EVENT_ID).eq("status", "matched").execute().data or []
for r in remain:
    sb.table("event_rsvps").update({"notified_confirm": False}).eq("id", r["id"]).execute()
print(f"   remaining matched: {len(remain)} (notified_confirm reset)")

# C) перенести ивент на ~10ч вперёд (h в окне 24ч -> прилетит dinner_confirm)
when = datetime.now() + timedelta(hours=10)
sb.table("events").update({
    "event_date": when.strftime("%Y-%m-%d"),
    "start_time": when.strftime("%H:%M:%S"),
}).eq("id", EVENT_ID).execute()
print(f"C) event -> {when.strftime('%Y-%m-%d %H:%M')} (~10h ahead, T-24h window)")
