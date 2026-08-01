"""
Run table seating for an event: load RSVPs, assemble tables of 5-6 using the
career give/ask scoring, and persist results to event_tables + event_rsvps.table_id.

Mirrors okruzhai's two-stage flow:
  - primary  (is_final=False): seat everyone who RSVP'd (status != cancelled)
  - final    (is_final=True):  re-seat only confirmed guests, drop no-shows
"""
import logging

from database.database import get_supabase
from matching.assembler import assemble_tables
from notifications import create_notifications

logger = logging.getLogger(__name__)


def _attach_feedback_history(guests: list[dict]) -> None:
    """Кладёт в каждого гостя _history = {disliked, liked, met} (user_id'шки) из
    event_reviews. Это «обучение на фидбеке»: feedback_factor в scoring использует
    его, чтобы не пересаживать тех, кого пометили «не хочу видеть», и реже —
    уже знакомых. Двунаправленно (учитываем и кого reviewer оценил, и кто оценил его)."""
    ids = [g.get("user_id") for g in guests if g.get("user_id")]
    if not ids:
        return
    hist = {uid: {"disliked": set(), "liked": set(), "met": set()} for uid in ids}
    try:
        sb = get_supabase()
        # отзывы, где наши гости — автор ИЛИ оценённый (фильтруем в Python).
        all_revs = (sb.table("event_reviews")
                    .select("reviewer_id, liked_users, disliked_users").execute().data) or []
        for r in all_revs:
            rid = r.get("reviewer_id")
            liked = [x for x in (r.get("liked_users") or [])]
            disliked = [x for x in (r.get("disliked_users") or [])]
            # сторона автора
            if rid in hist:
                for x in disliked:
                    hist[rid]["disliked"].add(x); hist[rid]["met"].add(x)
                for x in liked:
                    hist[rid]["liked"].add(x); hist[rid]["met"].add(x)
            # обратная сторона: оценённый тоже «виделся» с автором
            for x in liked + disliked:
                if x in hist and rid:
                    hist[x]["met"].add(rid)
            for x in disliked:
                if x in hist and rid:
                    hist[x]["disliked"].add(rid)  # симметрично избегаем
    except Exception as e:
        logger.error(f"[seating] feedback history load failed: {e}")
    for g in guests:
        g["_history"] = hist.get(g.get("user_id"), {"disliked": set(), "liked": set(), "met": set()})


def run_event_matching(event_id: str, is_final: bool = False,
                       table_size_min: int = 5, table_size_max: int = 7) -> dict:
    supabase = get_supabase()

    ev_res = supabase.table("events").select("*").eq("id", event_id).execute()
    if not ev_res.data:
        return {"ok": False, "error": "Event not found"}
    event = ev_res.data[0]

    q = supabase.table("event_rsvps").select("*, users(*)").eq("event_id", event_id).neq("status", "cancelled")
    if is_final:
        q = q.eq("is_confirmed", True)
    rsvp_res = q.execute()
    rows = [r for r in (rsvp_res.data or []) if r.get("users")]

    if len(rows) < table_size_min:
        return {"ok": False, "error": f"Not enough guests to seat ({len(rows)} < {table_size_min})",
                "guests": len(rows)}

    # Build guests: user row + per-event answers under _rsvp.
    guests = []
    for r in rows:
        u = dict(r["users"])
        u["_rsvp"] = {
            "rsvp_id": r["id"],
            "neighborhood": r.get("neighborhood"),
            "budget_pref": r.get("budget_pref") or r.get("budget_preference"),
            "diet": r.get("diet"),
            "energy_level": r.get("energy_level"),
        }
        guests.append(u)

    # Пул-нормировка relevance под этот пул события (§3.1) перед сборкой.
    from matching.scoring import calibrate_pool
    calibrate_pool(guests)

    # История фидбека (кого не хотят видеть / с кем уже виделись) -> в скоринг.
    _attach_feedback_history(guests)

    # Capacity-гейт: если гостей больше, чем мест — приоритетные садятся первыми,
    # остальные сверх лимита уходят в overflow (waitlist). capacity=NULL — без лимита.
    cap = event.get("capacity")
    cap_overflow: list[dict] = []
    if cap and len(guests) > cap:
        guests.sort(key=lambda g: 0 if g.get("priority") else 1)  # priority вперёд, стабильно
        guests, cap_overflow = guests[:cap], guests[cap:]
        logger.info("[SEATING] capacity=%s: seat %d, overflow %d (priority-first)",
                    cap, len(guests), len(cap_overflow))

    tables = assemble_tables(guests, table_size_min=table_size_min, table_size_max=table_size_max)

    # Clear previous seating for a clean re-run.
    supabase.table("event_rsvps").update({"table_id": None}).eq("event_id", event_id).execute()
    supabase.table("event_tables").delete().eq("event_id", event_id).execute()

    from collections import Counter
    seated_domains: Counter = Counter()  # для авто pool_tags карточки ивента

    seated, overflow = 0, 0
    table_number = 0
    for table in tables:
        if len(table) < table_size_min:
            # Overflow bucket — leave unseated.
            overflow += len(table)
            for g in table:
                supabase.table("event_rsvps").update({"status": "pending"}).eq("id", g["_rsvp"]["rsvp_id"]).execute()
            continue

        table_number += 1
        t_res = supabase.table("event_tables").insert({
            "event_id": event_id,
            "table_number": table_number,
            "restaurant_name": event.get("restaurant_name"),
            "address": event.get("address"),
        }).execute()
        table_id = t_res.data[0]["id"]

        seated_user_ids = []
        for g in table:
            supabase.table("event_rsvps").update({
                "table_id": table_id,
                "status": "matched",
            }).eq("id", g["_rsvp"]["rsvp_id"]).execute()
            seated_user_ids.append(g.get("user_id"))
            for d in (g.get("domains") or []):
                seated_domains[d] += 1
            seated += 1

        create_notifications(
            seated_user_ids,
            f"Your table for “{event.get('title', 'the dinner')}” is ready — open the app to see your group.",
            kind="match",
        )

    # Capacity-overflow -> waitlist (pending, без стола): их подхватит BUILD F.
    for g in cap_overflow:
        supabase.table("event_rsvps").update(
            {"status": "pending", "table_id": None}
        ).eq("id", g["_rsvp"]["rsvp_id"]).execute()
    overflow += len(cap_overflow)

    # Авто pool_tags для карточки ивента — топ-домены рассаженных (не руками в админке).
    pool_tags = [d for d, _ in seated_domains.most_common(5)]
    flag = "is_matched_final" if is_final else "is_matched_primary"
    ev_update = {flag: True}
    if pool_tags:
        ev_update["pool_tags"] = pool_tags
    supabase.table("events").update(ev_update).eq("id", event_id).execute()

    logger.info("[SEATING] event=%s seated=%d overflow=%d tables=%d", event_id, seated, overflow, table_number)
    return {"ok": True, "seated": seated, "overflow": overflow, "tables": table_number}
