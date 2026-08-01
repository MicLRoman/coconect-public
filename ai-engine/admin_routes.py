"""
Admin API.
Token-gated. Login with ADMIN_LOGIN / ADMIN_PASSWORD returns ADMIN_TOKEN;
all other endpoints require `Authorization: Bearer <token>`.

Дефолтных кредов НЕТ: если ADMIN_LOGIN / ADMIN_PASSWORD / ADMIN_TOKEN не заданы
в окружении, админка отдаёт 503 и войти в неё нельзя.
"""
import os
import secrets
import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel

from database.database import get_supabase
from matching.seating import run_event_matching
from notifications import create_notifications, send_sms

logger = logging.getLogger(__name__)

# Никаких дефолтов — иначе публичный репо = публичные креды.
ADMIN_LOGIN = os.getenv("ADMIN_LOGIN", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

if not (ADMIN_LOGIN and ADMIN_PASSWORD and ADMIN_TOKEN):
    logger.warning("ADMIN_LOGIN / ADMIN_PASSWORD / ADMIN_TOKEN не заданы — "
                   "админка отключена (503 на /admin/login)")

TIER_QUOTA = {"Starter": 1, "Core Membership": 2, "Premium": 4}
TIER_FORMATS = {
    "Starter": ["Dinners"],
    "Core Membership": ["Dinners", "Activities", "Quarterly City Meetup"],
    "Premium": ["Dinners", "Activities", "Quarterly City Meetup", "Special Formats"],
}

router = APIRouter(tags=["Admin"])


def require_admin(authorization: str = Header(None)):
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=503, detail="Admin API is not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not secrets.compare_digest(authorization.split(" ", 1)[1], ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


class AdminLoginRequest(BaseModel):
    login: str
    password: str


@router.post("/admin/login")
def admin_login(payload: AdminLoginRequest):
    if not (ADMIN_LOGIN and ADMIN_PASSWORD and ADMIN_TOKEN):
        raise HTTPException(status_code=503, detail="Admin API is not configured")
    ok_login = secrets.compare_digest(payload.login, ADMIN_LOGIN)
    ok_pass = secrets.compare_digest(payload.password, ADMIN_PASSWORD)
    if ok_login and ok_pass:
        return {"status": "success", "token": ADMIN_TOKEN}
    raise HTTPException(status_code=401, detail="Invalid credentials")


protected = APIRouter(dependencies=[Depends(require_admin)])


# ---------------- Stats ----------------
@protected.get("/admin/stats")
def admin_stats():
    sb = get_supabase()

    def count(table, **filters):
        q = sb.table(table).select("id", count="exact")
        for k, v in filters.items():
            q = q.eq(k, v)
        return q.execute().count or 0

    users = sb.table("users").select("subscription_tier").execute().data or []
    premium = sum(1 for u in users if u.get("subscription_tier") == "Premium")
    paying = sum(1 for u in users if u.get("subscription_tier") in ("Core Membership", "Premium"))
    return {
        "status": "success",
        "stats": {
            "totalUsers": len(users),
            "premiumMembers": premium,
            "activeSubscribers": paying,
            "totalEvents": count("events"),
            "openEvents": count("events", status="open"),
            "totalRsvps": count("event_rsvps"),
            "totalConnections": count("matches"),
            "openModeration": count("event_reviews", moderation_status="open"),
        },
    }


# ---------------- Users ----------------
@protected.get("/admin/users")
def admin_users():
    res = get_supabase().table("users").select("*").order("created_at", desc=True).execute()
    return {"status": "success", "users": res.data or []}


class TierUpdate(BaseModel):
    tier: str


@protected.post("/admin/users/{user_id}/tier")
def admin_set_tier(user_id: str, payload: TierUpdate):
    get_supabase().table("users").update({
        "subscription_tier": payload.tier,
        "events_quota": TIER_QUOTA.get(payload.tier, 1),
        "available_formats": TIER_FORMATS.get(payload.tier, ["Dinners"]),
    }).eq("user_id", user_id).execute()
    return {"status": "success", "message": f"Updated to {payload.tier}"}


@protected.post("/admin/users/{user_id}/clear_penalty")
def admin_clear_penalty(user_id: str):
    get_supabase().table("users").update({"has_penalty": False}).eq("user_id", user_id).execute()
    return {"status": "success"}


# ---------------- Events ----------------
@protected.get("/admin/events")
def admin_events():
    sb = get_supabase()
    res = sb.table("events").select("*").order("event_date").execute()
    out = []
    for ev in res.data or []:
        cnt = sb.table("event_rsvps").select("id", count="exact").eq("event_id", ev["id"]).neq("status", "cancelled").execute()
        ev["rsvp_count"] = cnt.count or 0
        out.append(ev)
    return {"status": "success", "events": out}


class CreateEvent(BaseModel):
    id: str | None = None
    title: str
    city: str | None = None
    event_date: str
    start_time: str = "19:00:00"
    type: str = "dinner"
    restaurant_name: str | None = None
    address: str | None = None
    status: str = "open"
    required_tier: str = "Starter"
    pool_tags: list = []
    description: str | None = None
    ask_budget: bool = True
    ask_diet: bool = True


@protected.post("/admin/events")
def admin_create_event(payload: CreateEvent):
    data = payload.model_dump()
    if not data.get("id"):
        data["id"] = f"ev_{uuid.uuid4().hex[:8]}"
    get_supabase().table("events").insert(data).execute()
    return {"status": "success", "event_id": data["id"]}


@protected.patch("/admin/events/{event_id}")
def admin_update_event(event_id: str, payload: dict):
    allowed = {"title", "city", "event_date", "start_time", "type", "restaurant_name",
               "address", "status", "required_tier", "pool_tags", "description", "ask_budget", "ask_diet"}
    update = {k: v for k, v in (payload or {}).items() if k in allowed}
    if update:
        get_supabase().table("events").update(update).eq("id", event_id).execute()
    return {"status": "success"}


@protected.delete("/admin/events/{event_id}")
def admin_delete_event(event_id: str):
    get_supabase().table("events").delete().eq("id", event_id).execute()
    return {"status": "success"}


@protected.post("/admin/events/{event_id}/match")
def admin_run_match(event_id: str, payload: dict | None = None):
    p = payload or {}
    result = run_event_matching(
        event_id,
        is_final=bool(p.get("final", False)),
        table_size_min=int(p.get("table_size_min", 5)),
        table_size_max=int(p.get("table_size_max", 7)),
    )
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error", "Matching failed"))
    return {"status": "success", **result}


@protected.get("/admin/events/{event_id}/tables")
def admin_event_tables(event_id: str):
    sb = get_supabase()
    tables = sb.table("event_tables").select("*").eq("event_id", event_id).order("table_number").execute().data or []
    for t in tables:
        members = sb.table("event_rsvps").select("id, user_id, users(*)").eq("table_id", t["id"]).execute().data or []
        # отдаём и rsvp_id (нужен фронту для ручной пересадки), и профиль
        t["members"] = [{"rsvp_id": m["id"], "user": m.get("users")} for m in members if m.get("users")]
        t["users"] = [m["users"] for m in members if m.get("users")]
    # «мимо»: активные гости события без стола (для ручной рассадки)
    unseated = (sb.table("event_rsvps").select("id, user_id, users(*)")
                .eq("event_id", event_id).is_("table_id", "null").neq("status", "cancelled").execute().data) or []
    unseated = [{"rsvp_id": m["id"], "user": m.get("users")} for m in unseated if m.get("users")]
    return {"status": "success", "tables": tables, "unseated": unseated}


@protected.post("/admin/events/{event_id}/tables")
def admin_add_table(event_id: str):
    """Завести пустой стол вручную (для ручной рассадки)."""
    sb = get_supabase()
    ev = sb.table("events").select("restaurant_name, address").eq("id", event_id).execute().data
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    cnt = sb.table("event_tables").select("id", count="exact").eq("event_id", event_id).execute().count or 0
    res = sb.table("event_tables").insert({
        "event_id": event_id, "table_number": cnt + 1,
        "restaurant_name": ev[0].get("restaurant_name"), "address": ev[0].get("address"),
    }).execute()
    return {"status": "success", "table": res.data[0] if res.data else None}


class MoveSeat(BaseModel):
    table_id: str | None = None  # null = снять со стола (unseat / overflow)


@protected.patch("/admin/rsvps/{rsvp_id}/table")
def admin_move_seat(rsvp_id: str, payload: MoveSeat):
    """Ручная пересадка гостя БЕЗ уведомления. Лочит рассадку ивента (is_matched_final),
    чтобы автоматический ре-матч демона не затёр ручные правки. Адрес/предупреждение
    уйдёт уже по этой финальной рассадке на T-24h."""
    sb = get_supabase()
    rsvp = sb.table("event_rsvps").select("event_id").eq("id", rsvp_id).execute().data
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")
    event_id = rsvp[0]["event_id"]
    table_id = payload.table_id
    if table_id:
        t = sb.table("event_tables").select("event_id").eq("id", table_id).execute().data
        if not t or t[0]["event_id"] != event_id:
            raise HTTPException(status_code=400, detail="Table does not belong to this event")
        status = "matched"
    else:
        status = "pending"  # снят со стола
    sb.table("event_rsvps").update({"table_id": table_id, "status": status}).eq("id", rsvp_id).execute()
    sb.table("events").update({"is_matched_primary": True, "is_matched_final": True}).eq("id", event_id).execute()
    return {"status": "success", "locked": True}


# ---------------- Restaurants ----------------
@protected.get("/admin/restaurants")
def admin_restaurants():
    res = get_supabase().table("restaurants").select("*").order("created_at", desc=True).execute()
    return {"status": "success", "restaurants": res.data or []}


@protected.post("/admin/restaurants")
def admin_create_restaurant(payload: dict):
    row = {
        "name": payload.get("name"),
        "address": payload.get("address"),
        "city": payload.get("city"),
        "neighborhood": payload.get("neighborhood"),
        "budget_level": payload.get("budget_level"),
        "tables_count": int(payload.get("tables_count") or 1),
    }
    if not row["name"]:
        raise HTTPException(status_code=400, detail="name is required")
    res = get_supabase().table("restaurants").insert(row).execute()
    return {"status": "success", "restaurant": res.data[0] if res.data else None}


@protected.patch("/admin/restaurants/{restaurant_id}")
def admin_update_restaurant(restaurant_id: str, payload: dict):
    allowed = {"name", "address", "city", "neighborhood", "budget_level", "tables_count"}
    update = {k: v for k, v in (payload or {}).items() if k in allowed}
    if "tables_count" in update:
        update["tables_count"] = int(update["tables_count"] or 1)
    if update:
        get_supabase().table("restaurants").update(update).eq("id", restaurant_id).execute()
    return {"status": "success"}


@protected.delete("/admin/restaurants/{restaurant_id}")
def admin_delete_restaurant(restaurant_id: str):
    get_supabase().table("restaurants").delete().eq("id", restaurant_id).execute()
    return {"status": "success"}


@protected.patch("/admin/tables/{table_id}/restaurant")
def admin_assign_restaurant(table_id: str, payload: dict):
    sb = get_supabase()
    restaurant_id = (payload or {}).get("restaurant_id") or None
    update = {"restaurant_id": restaurant_id, "restaurant_name": None, "address": None}
    if restaurant_id:
        tbl = sb.table("event_tables").select("event_id").eq("id", table_id).execute()
        event_id = tbl.data[0]["event_id"] if tbl.data else None
        r = sb.table("restaurants").select("name, address, tables_count").eq("id", restaurant_id).execute()
        if not r.data:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        cap = r.data[0].get("tables_count") or 1
        used = sb.table("event_tables").select("id", count="exact") \
            .eq("event_id", event_id).eq("restaurant_id", restaurant_id).neq("id", table_id).execute().count or 0
        if used >= cap:
            raise HTTPException(status_code=400, detail=f"{r.data[0]['name']} is full for this event ({used}/{cap} tables).")
        update["restaurant_name"] = r.data[0].get("name")
        update["address"] = r.data[0].get("address")
    sb.table("event_tables").update(update).eq("id", table_id).execute()
    return {"status": "success"}


# ---------------- Moderation ----------------
@protected.get("/admin/moderation/reports")
def admin_moderation_reports(status: str = "open"):
    if status not in ("open", "reviewed", "dismissed"):
        raise HTTPException(status_code=400, detail="invalid status filter")
    sb = get_supabase()
    rows = sb.table("event_reviews").select(
        "id, event_id, rating, moderation_note, moderation_status, created_at, "
        "reviewer:users!event_reviews_reviewer_id_fkey(user_id, name)"
    ).eq("moderation_status", status).order("created_at", desc=True).execute().data or []
    return {"status": "success", "reports": rows}


@protected.patch("/admin/moderation/reports/{review_id}")
def admin_moderation_update(review_id: str, payload: dict):
    new_status = (payload or {}).get("status")
    if new_status not in ("reviewed", "dismissed"):
        raise HTTPException(status_code=400, detail="status must be 'reviewed' or 'dismissed'")
    get_supabase().table("event_reviews").update({"moderation_status": new_status}).eq("id", review_id).execute()
    return {"status": "success"}


# ---------------- Notifications (broadcast) ----------------
class NotifySend(BaseModel):
    text: str
    audience: str = "all"        # all | event | user
    ref: str | None = None       # event_id (audience=event) or user_id (audience=user)
    channel: str = "in_app"      # in_app | sms (sms is a stub)


@protected.post("/admin/notifications")
def admin_send_notification(payload: NotifySend):
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    if payload.audience not in ("all", "event", "user"):
        raise HTTPException(status_code=400, detail="invalid audience")

    sb = get_supabase()

    # Resolve recipients -> list of user rows (user_id, phone).
    if payload.audience == "user":
        if not payload.ref:
            raise HTTPException(status_code=400, detail="ref (user_id) required")
        rows = sb.table("users").select("user_id, phone").eq("user_id", payload.ref).execute().data or []
    elif payload.audience == "event":
        if not payload.ref:
            raise HTTPException(status_code=400, detail="ref (event_id) required")
        rsvps = sb.table("event_rsvps").select("user_id").eq("event_id", payload.ref).neq("status", "cancelled").execute().data or []
        ids = list({r["user_id"] for r in rsvps})
        rows = sb.table("users").select("user_id, phone").in_("user_id", ids).execute().data if ids else []
    else:  # all
        rows = sb.table("users").select("user_id, phone").execute().data or []

    user_ids = [r["user_id"] for r in rows]

    if payload.channel == "sms":
        # STUB: nothing is actually delivered; we only log per recipient.
        sent = sum(1 for r in rows if r.get("phone") and send_sms(r["phone"], text))
        return {"status": "success", "channel": "sms", "recipients": len(user_ids),
                "delivered": sent, "stub": True,
                "message": "SMS is a stub — logged only. No provider connected yet."}

    created = create_notifications(user_ids, text, kind="system")
    return {"status": "success", "channel": "in_app", "recipients": len(user_ids), "delivered": created}


# ---------------- Promo Codes ----------------
@protected.get("/admin/promo-codes")
def admin_promo_codes():
    res = get_supabase().table("promo_codes").select("*").order("created_at", desc=True).execute()
    return {"status": "success", "promo_codes": res.data or []}


class CreatePromo(BaseModel):
    code: str
    subscription_tier: str
    max_uses: int | None = None       # null = unlimited
    duration_days: int | None = None  # null = forever; else grant lasts this many days


@protected.post("/admin/promo-codes")
def admin_create_promo(payload: CreatePromo):
    code = (payload.code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")
    if payload.subscription_tier not in TIER_QUOTA:
        raise HTTPException(status_code=400, detail=f"Unknown tier '{payload.subscription_tier}'")
    max_uses = payload.max_uses
    if max_uses is not None and max_uses < 1:
        raise HTTPException(status_code=400, detail="max_uses must be >= 1 (or empty for unlimited)")
    duration_days = payload.duration_days
    if duration_days is not None and duration_days < 1:
        raise HTTPException(status_code=400, detail="duration_days must be >= 1 (or empty for forever)")

    sb = get_supabase()
    if sb.table("promo_codes").select("id").eq("code", code).execute().data:
        raise HTTPException(status_code=409, detail=f"Code '{code}' already exists")

    row = {
        "code": code,
        "subscription_tier": payload.subscription_tier,
        "max_uses": max_uses,
        "used_count": 0,
        "duration_days": duration_days,
    }
    res = sb.table("promo_codes").insert(row).execute()
    return {"status": "success", "promo_code": res.data[0] if res.data else None}


@protected.delete("/admin/promo-codes/{promo_id}")
def admin_delete_promo(promo_id: str):
    get_supabase().table("promo_codes").delete().eq("id", promo_id).execute()
    return {"status": "success"}


# ---------------- Funnel (registration drop-off, A/B/C-тест) ----------------
@protected.get("/admin/funnel")
def admin_funnel():
    """Полная воронка по своей БД:
      1) зашли                    — визиты (leads: сайт логирует step='visit' на маунте
                                    чата; регистрация прямо в WA пишет такой же лид)
      2) начали регистрацию       — ввели хоть что-то (leads с данными)
      3) прошли регистрацию       — создан профиль (web_done/completed) — сайт или WA
      4) написали в WhatsApp      — есть диалог в WA (wa_conversations)
      5) прошли онбординг         — onboarding_completed (WA, а в варианте c — сайт)
      6) пришли на первый ужин    — активный RSVP на прошедший ивент
      7) оплатили                 — Core/Premium

    A/B/C-тест: каждая стадия дополнительно разбивается по вариантам
      a = сайт -> добор в WA (как было)  |  b = сразу в WhatsApp  |  c = всё на сайте.
    Старые записи без варианта считаем вариантом a (это и есть «как было»).
    Диалог в WA без лида/профиля (органический заход) — вариант b: по договорённости
    прямой заход в WhatsApp приравнен к «сайт сразу ведёт в WA».

    Замечание: визиты/начали (1–2) считаются из таблицы `leads`, которая
    наполняется только начиная с момента, как заработал её захват (нужна RLS-
    политика в Supabase). 3–7 — из users/wa_conversations/events (есть история).
    Эндпоинт не падает, если leads пустая/недоступна — просто покажет 0.
    """
    sb = get_supabase()

    leads = sb.table("leads").select("*").order("updated_at", desc=True).execute().data or []
    users = sb.table("users").select(
        "user_id, name, phone, city, subscription_tier, onboarding_stage, onboarding_completed, ab_variant, created_at"
    ).execute().data or []

    # Написали в WhatsApp = есть запись диалога (один ряд на телефон).
    wa = sb.table("wa_conversations").select("phone").execute().data or []
    wa_phones = {c.get("phone") for c in wa if c.get("phone")}

    # Пришли на первый ужин = активный RSVP на прошедший ивент.
    passed = sb.table("events").select("id").eq("status", "passed").execute().data or []
    passed_ids = [e["id"] for e in passed]
    attended_ids = set()
    if passed_ids:
        rsvps = (sb.table("event_rsvps").select("user_id, event_id")
                 .in_("event_id", passed_ids).neq("status", "cancelled").execute().data) or []
        attended_ids = {r["user_id"] for r in rsvps if r.get("user_id")}

    def has_data(l):
        return any(l.get(k) for k in ("first_name", "last_name", "linkedin", "phone", "city"))

    def lead_variant(l):
        return l.get("variant") if l.get("variant") in ("a", "b", "c") else "a"

    def user_variant(u):
        return u.get("ab_variant") if u.get("ab_variant") in ("a", "b", "c") else "a"

    # Атрибуция WA-диалога варианту: профиль (точнее) > лид > дефолт b (органический WA).
    phone_variant: dict = {}
    for l in leads:
        if l.get("phone"):
            phone_variant[l["phone"]] = lead_variant(l)
    for u in users:
        if u.get("phone"):
            phone_variant[u["phone"]] = user_variant(u)

    def funnel_for(v):
        """Стадии воронки; v=None — всего (без разбивки)."""
        ls = [l for l in leads if v is None or lead_variant(l) == v]
        us = [u for u in users if v is None or user_variant(u) == v]
        completed_site = [u for u in us if u.get("onboarding_completed") or u.get("onboarding_stage") in ("web_done", "completed")]
        completed_onb = [u for u in us if u.get("onboarding_completed")]
        paid = [u for u in us if u.get("subscription_tier") in ("Core Membership", "Premium")]
        attended = [u for u in us if u["user_id"] in attended_ids]
        wrote_wa = (len(wa_phones) if v is None
                    else sum(1 for p in wa_phones if phone_variant.get(p, "b") == v))
        return [
            {"key": "visits", "count": len(ls)},
            {"key": "entered", "count": sum(1 for l in ls if (l.get("step") or "") != "visit" or has_data(l))},
            {"key": "site_done", "count": len(completed_site)},
            {"key": "wrote_wa", "count": wrote_wa},
            {"key": "completed_wa", "count": len(completed_onb)},
            {"key": "attended", "count": len(attended)},
            {"key": "paid", "count": len(paid)},
        ]

    return {
        "status": "success",
        "funnel": funnel_for(None),
        "by_variant": {v: funnel_for(v) for v in ("a", "b", "c")},
        "leads": leads,
        "totals": {"leads": len(leads), "users": len(users), "wa": len(wa_phones)},
    }


router.include_router(protected)
