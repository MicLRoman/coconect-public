import sys
import asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from dotenv import load_dotenv
load_dotenv()

import os
import re
import json
import uuid
import time
import base64
import logging
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request, Response, Depends, BackgroundTasks, UploadFile, File
from auth import require_uid, optional_uid, assert_self, require_admin
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models.schemas import (
    SmartOnboardingRequest, MatchSearchRequest,
    SendCodeRequest, VerifyCodeRequest, JoinEventRequest,
    WebStartRequest,
)
from database.database import get_supabase
from matching.matcher import execute_tier2_deep_match, get_tier1_teaser_pool
from matching.seating import run_event_matching
from embeddings import generate_give_vector_smart, generate_ask_vector_smart
from notifications import create_notification
from voice_agent import get_vapi_assistant_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Coconect AI Engine", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = get_supabase()

# Любой код в деве; "0000" — как в окружае. Реальный SMS-провайдер подключим позже.
DEV_AUTH = os.getenv("AUTH_DEV_MODE", "true").lower() in ("true", "1", "yes")

# ТЕСТ: бесплатный режим — без квот/оплаты, все ивенты доступны. Выключить после теста.
FREE_MODE = os.getenv("FREE_MODE", "false").lower() in ("true", "1", "yes")
TIER_QUOTA = {"Starter": 1, "Core Membership": 1, "Premium": 2}
TIER_FORMATS = {
    "Starter": ["Dinners"],
    "Core Membership": ["Dinners"],
    "Premium": ["Dinners", "Quarterly Meetup", "New Formats"],
}

# ---- Stripe / billing config (всё через env; пусто -> stub-режим) ----
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
WEB_URL = os.getenv("WEB_URL") or os.getenv("APP_URL", "http://localhost:3000")
TIER_PRICE_IDS = {  # Stripe Price IDs (recurring) для подписок
    "Core Membership": os.getenv("STRIPE_PRICE_CORE", ""),
    "Premium": os.getenv("STRIPE_PRICE_PREMIUM", ""),
}
EXTRA_EVENT_PRICE_ID = os.getenv("STRIPE_PRICE_EXTRA_EVENT", "")  # one-time price


# ---------------- Helpers ----------------
def normalize_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return None
    # NANP без кода страны: ровно 10 цифр (напр. Toronto 437-463-2099) → добавляем «1»,
    # чтобы совпало с wa_id из WhatsApp (он приходит как 1XXXXXXXXXX). Иначе профиль с
    # сайта не находится по номеру и онбординг в WA не подхватывается (см. баг Abhiroop).
    if len(digits) == 10:
        digits = "1" + digits
    return "+" + digits


# Таймзона приложения. Все ивенты (event_date + start_time) трактуем как ЛОКАЛЬНОЕ
# время этой таймзоны (Торонто). Контейнер живёт в UTC, поэтому раньше 19:00 считалось
# как 19:00 UTC (= 15:00 в Торонто) и все тайминги демона уезжали на ~4ч. Работаем в
# naive wall-clock Торонто: и "сейчас", и start_time — в одной шкале, без tz-конфликтов.
from datetime import timezone as _tz, timedelta as _td
try:
    from zoneinfo import ZoneInfo as _ZoneInfo
    APP_TZ = _ZoneInfo(os.getenv("APP_TZ", "America/Toronto"))
except Exception:  # нет tzdata — фоллбэк на фиксированный EDT (-4)
    APP_TZ = _tz(_td(hours=-4))


def now_toronto() -> datetime:
    """'Сейчас' по таймзоне приложения (Торонто), как naive wall-clock."""
    return datetime.now(APP_TZ).replace(tzinfo=None)


def parse_event_dt(ev: dict) -> datetime:
    date_str = str(ev.get("event_date", "2000-01-01"))
    time_str = str(ev.get("start_time", "00:00:00"))
    if len(time_str.split(":")) == 2:
        time_str += ":00"
    try:
        return datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return datetime.strptime(date_str, "%Y-%m-%d")


def hours_until(ev: dict, now: datetime | None = None) -> float:
    now = now or now_toronto()
    return (parse_event_dt(ev) - now).total_seconds() / 3600.0


# ---------------- Matching daemon ----------------
# Primary seating at T-72h, final rebalance (confirmed only) at T-24h.
MATCHING_DAEMON = os.getenv("MATCHING_DAEMON", "true").lower() in ("true", "1", "yes")
DAEMON_INTERVAL = int(os.getenv("MATCHING_DAEMON_INTERVAL", "300"))
# Авто-создание субботних ивентов раз в неделю. По умолчанию ВЫКЛ — ивенты создаём руками.
# (Матчинг due-ивентов по таймингам T-96h/T-24h остаётся — он цепляется за уже созданные.)
AUTO_WEEKLY_EVENTS = os.getenv("AUTO_WEEKLY_EVENTS", "false").lower() in ("true", "1", "yes")


def _run_due_matching():
    evs = supabase.table("events").select("*").neq("status", "passed").execute().data or []
    for ev in evs:
        h = hours_until(ev)
        if h < 0:
            continue
        try:
            if h <= 24 and ev.get("is_matched_primary") and not ev.get("is_matched_final"):
                logger.info(f"[DAEMON] final rebalance {ev['id']} (T-{h:.1f}h)")
                run_event_matching(ev["id"], is_final=True)
            elif h <= 96 and not ev.get("is_matched_primary"):
                logger.info(f"[DAEMON] primary seating {ev['id']} (T-{h:.1f}h)")
                run_event_matching(ev["id"], is_final=False)
        except Exception as e:
            logger.error(f"[DAEMON] matching {ev.get('id')} failed: {e}")


def _run_due_notifications():
    from wa.lifecycle import run_due_notifications
    run_due_notifications()


def _run_due_nudges():
    from wa.lifecycle import run_due_nudges
    run_due_nudges()


def _parse_iso(ts):
    if not ts:
        return None
    try:
        import datetime
        return datetime.datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except Exception:
        return None


def _run_due_promo():
    """Промо-гранты (subscription_source='promo', без Stripe): помесячный refill квоты
    и авто-даунгрейд до Starter по истечении duration. Аналог invoice.paid /
    subscription.deleted, но по таймстампам, а не по вебхуку Stripe."""
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc)
    try:
        rows = supabase.table("users").select(
            "user_id, phone, events_reset_at, promo_expires_at"
        ).eq("subscription_source", "promo").execute().data or []
    except Exception as e:
        logger.warning(f"[PROMO] daemon select skipped (cols missing?): {e}")
        return
    for u in rows:
        uid = u["user_id"]
        exp = _parse_iso(u.get("promo_expires_at"))
        if exp and now >= exp:
            try:
                supabase.table("users").update({
                    "subscription_tier": "Starter",
                    "events_quota": TIER_QUOTA["Starter"],
                    "available_formats": TIER_FORMATS["Starter"],
                    "subscription_source": None,
                    "promo_expires_at": None,
                    "events_reset_at": None,
                }).eq("user_id", uid).execute()
                logger.info(f"[PROMO] grant expired -> Starter for {uid}")
            except Exception as e:
                logger.warning(f"[PROMO] expire downgrade failed for {uid}: {e}")
            continue
        rst = _parse_iso(u.get("events_reset_at"))
        if rst and now >= rst:
            nxt = now + datetime.timedelta(days=30)
            if exp and nxt > exp:
                nxt = exp
            try:
                supabase.table("users").update({
                    "events_used": 0,
                    "events_reset_at": nxt.isoformat(),
                }).eq("user_id", uid).execute()
                logger.info(f"[PROMO] monthly refill for {uid}")
            except Exception as e:
                logger.warning(f"[PROMO] refill failed for {uid}: {e}")


def _ensure_weekly_events():
    """Гарантируем субботний ивент на ближайшую субботу в каждом городе, где есть
    опт-инувшиеся юзеры — иначе еженедельная авто-запись/рассадка не за что зацепится."""
    from wa.lifecycle import ensure_saturday_event, _opted_in_user_ids
    optin = _opted_in_user_ids()
    if not optin:
        return
    ids = list(optin)
    cities: set = set()
    # города опт-инувшихся (батчами, чтобы не упереться в длину запроса)
    for i in range(0, len(ids), 100):
        rows = supabase.table("users").select("city").in_("user_id", ids[i:i + 100]).execute().data or []
        cities.update((r.get("city") or "").strip() for r in rows if (r.get("city") or "").strip())
    for city in cities:
        ensure_saturday_event(city)


async def matching_daemon():
    while True:
        if AUTO_WEEKLY_EVENTS:
            try:
                await asyncio.to_thread(_ensure_weekly_events)
            except Exception as e:
                logger.error(f"[DAEMON] weekly events tick failed: {e}")
        try:
            await asyncio.to_thread(_run_due_matching)
        except Exception as e:
            logger.error(f"[DAEMON] tick failed: {e}")
        try:
            await asyncio.to_thread(_run_due_notifications)
        except Exception as e:
            logger.error(f"[DAEMON] notifications tick failed: {e}")
        try:
            await asyncio.to_thread(_run_due_nudges)
        except Exception as e:
            logger.error(f"[DAEMON] nudges tick failed: {e}")
        try:
            await asyncio.to_thread(_run_due_promo)
        except Exception as e:
            logger.error(f"[DAEMON] promo tick failed: {e}")
        await asyncio.sleep(DAEMON_INTERVAL)


@app.on_event("startup")
async def _start_daemon():
    from wa.send import _dry_run, _dev_mode
    # DEV_MODE: демон не поднимаем совсем (нет матча/notifications/nudges/promo-тика,
    # значит нет флуда и нежданных пинков). Ответы боту по вебхуку при этом работают,
    # только шаблоны глушатся (см. wa.send.send_template).
    if _dev_mode():
        logger.info("[DAEMON] DEV_MODE on — daemon off, templates blocked, webhook replies still work")
        return
    if MATCHING_DAEMON:
        asyncio.create_task(matching_daemon())
        logger.info(f"[DAEMON] matching daemon on (every {DAEMON_INTERVAL}s, auto_events={AUTO_WEEKLY_EVENTS}, wa_dry_run={_dry_run()})")


@app.get("/")
def read_root():
    return {"status": "online", "mode": "Coconect — Deep Match + Table Seating"}


# ============================================================
#  AUTH  (phone + code, dev-mock SMS — no Telegram)
# ============================================================
@app.post("/auth/send_code")
async def send_code(payload: SendCodeRequest):
    phone = normalize_phone(payload.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="Некорректный номер телефона")
    # В деве SMS не шлём — код всегда "0000".
    logger.info(f"[AUTH] send_code -> {phone} (dev code 0000)")
    return {"status": "success", "message": "Код отправлен"}


@app.post("/auth/verify_code")
async def verify_code(payload: VerifyCodeRequest):
    # В деве принимаем любой код; в проде — только "0000" пока нет SMS-провайдера.
    if not DEV_AUTH and payload.code != "0000":
        raise HTTPException(status_code=400, detail="Неверный код из СМС")

    phone = normalize_phone(payload.phone)
    res = supabase.table("users").select("user_id, onboarding_completed").eq("phone", phone).execute()
    if res.data:
        u = res.data[0]
        return {
            "status": "success",
            "is_new": False,
            "user_id": u["user_id"],
            "token": issue_lk_token(u["user_id"]),
            "onboarding_completed": bool(u.get("onboarding_completed")),
        }
    return {"status": "success", "is_new": True, "onboarding_completed": False}


# ============================================================
#  VOICE AI (VAPI) WEBHOOKS
# ============================================================
@app.post("/vapi/inbound")
async def vapi_inbound(request: Request):
    """Called by Vapi when a call is initiated."""
    try:
        body = await request.json()
        msg = body.get("message", {})
        call = msg.get("call", {})
        
        # Phone number of the caller (if PSTN) or passed via customData (if Web)
        phone = call.get("customer", {}).get("number")
        user_name = "друг"
        
        if phone:
            norm_phone = normalize_phone(phone)
            res = supabase.table("users").select("name").eq("phone", norm_phone).execute()
            if res.data and res.data[0].get("name"):
                user_name = res.data[0]["name"]
                
        assistant_config = get_vapi_assistant_config(user_name, phone)
        
        return {
            "assistant": assistant_config
        }
    except Exception as e:
        logger.error(f"[VAPI] inbound error: {e}")
        return {"assistant": get_vapi_assistant_config("пользователь", "")}

@app.post("/vapi/status")
async def vapi_status(request: Request):
    """Called by Vapi at the end of the call with transcripts and extracted data."""
    try:
        body = await request.json()
        msg = body.get("message", {})
        
        if msg.get("type") == "end-of-call-report":
            analysis = msg.get("analysis", {})
            structured_data = analysis.get("structuredData", {})
            call = msg.get("call", {})
            phone = call.get("customer", {}).get("number")
            
            if not phone:
                logger.warning("[VAPI] call ended but no phone number found")
                return {"status": "ignored"}
                
            norm_phone = normalize_phone(phone)
            goals = structured_data.get("goals", "")
            match_type = structured_data.get("match_type", "")
            logistics = structured_data.get("logistics", "")
            
            # Update user in DB
            res = supabase.table("users").select("user_id").eq("phone", norm_phone).execute()
            if res.data:
                user_id = res.data[0]["user_id"]
                custom_request = f"Goals: {goals}\nMatch type: {match_type}\nLogistics: {logistics}"
                
                # Generate new vector based on extracted voice data
                ask_vector = generate_ask_vector_smart({
                    "intents": [],
                    "custom_request_raw": custom_request
                })
                
                supabase.table("users").update({
                    "custom_request_raw": custom_request,
                    "ask_vector": ask_vector,
                    "onboarding_completed": True
                }).eq("user_id", user_id).execute()
                
                # Send WhatsApp completion message
                from wa import send as wa_send
                wa_send.send_text(norm_phone, f"Твой профиль полностью собран по итогам звонка! 🎉\nВот ссылка на твой личный кабинет: {lk_link(user_id)}")
                logger.info(f"[VAPI] Profile updated for {user_id}")
                
        return {"status": "success"}
    except Exception as e:
        logger.error(f"[VAPI] status error: {e}")
        return {"status": "error"}

# ============================================================
#  ONBOARDING INGEST
# ============================================================
@app.post("/smart_ingest")
async def smart_ingest_profile(payload: SmartOnboardingRequest):
    logger.info("[API] POST /smart_ingest")
    try:
        profile = payload.user_profile
        phone = normalize_phone(payload.phone or profile.basic_info.phone)

        # Если телефон уже привязан к юзеру — обновляем его, иначе создаём.
        user_id = payload.user_id
        if not user_id and phone:
            existing = supabase.table("users").select("user_id").eq("phone", phone).execute()
            if existing.data:
                user_id = existing.data[0]["user_id"]
        if not user_id:
            user_id = f"usr_{uuid.uuid4().hex[:10]}"

        logger.info("1. AI: embedding give/ask vectors...")
        give_vector = generate_give_vector_smart(profile.gives.model_dump(by_alias=False))
        ask_vector = generate_ask_vector_smart(profile.asks.model_dump())

        user_data = {
            "user_id": user_id,
            "name": profile.basic_info.name,
            "age": profile.basic_info.age,
            "city": profile.basic_info.city,
            "district": profile.basic_info.district,
            "languages": profile.basic_info.languages,
            "inferred_segment": profile.inferred_segment,
            "education": profile.gives.education,
            "experience_level": profile.gives.experience_level,
            "domains": profile.gives.domains,
            "hard_skills": profile.gives.hard_skills,
            "current_status": profile.gives.current_status.model_dump(),
            "pace": profile.gives.work_style.pace,
            "social_battery": profile.gives.work_style.social_battery,
            "intents": profile.asks.intents,
            "custom_request_raw": profile.asks.custom_request_raw,
            "ask_vector": ask_vector,
            "give_vector": give_vector,
            "onboarding_completed": True,
        }
        if phone:
            user_data["phone"] = phone

        supabase.table("users").upsert(user_data, on_conflict="user_id").execute()

        rsvp = payload.current_event_rsvp
        if rsvp and rsvp.event_id and rsvp.event_id != "ev_future":
            supabase.table("event_rsvps").upsert({
                "user_id": user_id,
                "event_id": rsvp.event_id,
                "energy_level": rsvp.energy_level,
                "budget_preference": rsvp.budget_preference,
            }, on_conflict="user_id,event_id").execute()

        logger.info(f"[SUCCESS] Profile saved. ID: {user_id}")
        return {"status": "success", "user_id": user_id, "token": issue_lk_token(user_id), "is_new": payload.user_id is None}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


def _backfill_extraction(user_id: str, give_text: str, had_domains: bool, had_level: bool):
    """Фоновая LLM-экстракция доменов/сеньорности — не блокирует web_start.
    gemini-flash долго думает и часто отдаёт 503, поэтому делаем это после ответа."""
    try:
        from llm_extract import extract_domains_and_level
        extra = extract_domains_and_level(give_text)
        patch = {}
        if not had_domains and extra.get("domains"):
            patch["domains"] = extra["domains"]
        if not had_level and extra.get("experience_level"):
            patch["experience_level"] = extra["experience_level"]
        if patch:
            supabase.table("users").update(patch).eq("user_id", user_id).execute()
            logger.info(f"[web_start bg] extraction backfilled {list(patch)} for {user_id}")
        else:
            logger.info(f"[web_start bg] extraction: nothing to backfill for {user_id}")
    except Exception as e:
        logger.error(f"[web_start bg] extraction failed for {user_id}: {e}")


# Проактивный cold-старт в WhatsApp СРАЗУ после регистрации на сайте: бот первым
# пишет approved-шаблоном onboarding_greeting ({{1}}=имя, {{2}}=LLM-опенер по LinkedIn)
# и сеет wa_conversations, чтобы ответ юзера продолжил онбординг (а не начался заново).
# Один раз на номер (если диалог в WA уже есть — пропускаем).
WA_GREETING_ENABLED = os.getenv("WA_PROACTIVE_GREETING", "true").lower() in ("true", "1", "yes")
TPL_GREETING = os.getenv("TPL_GREETING", "onboarding_greeting")
WA_TEMPLATE_LANG = os.getenv("WA_TEMPLATE_LANG", "en")


def _send_wa_greeting(user_id: str, phone: str, name: str):
    if not WA_GREETING_ENABLED or not phone:
        return
    try:
        from datetime import datetime, timezone, timedelta
        from wa import send as wa_send

        # Скипаем ТОЛЬКО если онбординг реально идёт (есть ответы/история) или
        # приветствие уже слали недавно. Старые служебные диалоги (напр. mode='claim',
        # пустой draft) НЕ мешают — иначе бы зря не слали (это и был баг).
        existing = (supabase.table("wa_conversations").select("draft, context")
                    .eq("phone", phone).limit(1).execute().data)
        if existing:
            draft = existing[0].get("draft") or {}
            if any(draft.get(k) for k in ("the_build", "the_ask", "the_give", "the_goal")) \
               or len(draft.get("history") or []) > 1:
                logger.info(f"[web_start] WA greeting skipped — onboarding already active for {phone}")
                return
            ga = (existing[0].get("context") or {}).get("web_greeted_at")
            if ga:
                try:
                    if datetime.fromisoformat(str(ga)) > datetime.now(timezone.utc) - timedelta(hours=12):
                        logger.info(f"[web_start] WA greeting skipped — greeted recently {phone}")
                        return
                except Exception:
                    pass

        first = (name or "there").split()[0]
        to = phone.lstrip("+")
        # Шаблon onboarding_greeting: HEADER «Hi, {{1}}!» (имя) + статичный BODY (без переменных).
        res = wa_send.send_template(to, TPL_GREETING, WA_TEMPLATE_LANG, header_params=[first])

        # Сеем историю под фактический текст шаблона + метку web_greeted_at — реплика
        # юзера продолжит онбординг (LLM увидит, что приветствие уже было).
        greeting_text = (f"Hi, {first}! Let's get you set for the dinners, takes 20 seconds. "
                         f"Reply however you like (text or voice).")
        supabase.table("wa_conversations").upsert(
            {"phone": phone, "step": 0, "mode": None,
             "context": {"web_greeted_at": datetime.now(timezone.utc).isoformat()},
             "draft": {"history": [{"role": "assistant", "text": greeting_text}], "raw": []}},
            on_conflict="phone",
        ).execute()
        logger.info(f"[web_start] proactive WA greeting -> {phone}: {res}")
    except Exception as e:
        logger.error(f"[web_start] WA greeting failed for {phone}: {e}")


class CheckRequest(BaseModel):
    linkedin_url: str | None = None
    phone: str | None = None


@app.post("/onboarding/check")
async def onboarding_check(payload: CheckRequest):
    """Лёгкая проверка на повторку для лендинга: есть ли уже юзер с таким
    linkedin_url или телефоном. Зовётся на шаге выбора LinkedIn и ввода номера —
    чтобы написать «вы уже с нами». Никогда не бросает: при сбое => exists=false,
    онбординг продолжается как обычно."""
    try:
        row = None
        if payload.phone:
            ph = normalize_phone(payload.phone)
            if ph:
                r = supabase.table("users").select("user_id, name, onboarding_completed").eq("phone", ph).limit(1).execute()
                if r.data:
                    row = r.data[0]
        if row is None and payload.linkedin_url:
            r = supabase.table("users").select("user_id, name, onboarding_completed").eq("linkedin_url", payload.linkedin_url).limit(1).execute()
            if r.data:
                row = r.data[0]
        if row:
            return {"exists": True, "name": row.get("name") or "", "onboarding_completed": bool(row.get("onboarding_completed"))}
        return {"exists": False}
    except Exception as e:
        logger.error(f"[API] /onboarding/check failed: {e}")
        return {"exists": False}


class LeadStepRequest(BaseModel):
    leadId: str
    step: str
    firstName: str | None = None
    lastName: str | None = None
    linkedin: str | None = None
    phone: str | None = None
    city: str | None = None
    variant: str | None = None   # A/B/C-тест: a | b | c
    source: str | None = None    # site | wa


@app.post("/leads/step")
async def leads_step(payload: LeadStepRequest):
    """Инкрементальный захват лида на КАЖДОМ шаге чата регистрации (чтобы не терять
    тех, кто отвалился в середине). Один ряд на lead_id — upsert. Раньше уходило в
    Google Sheet (SheetDB); теперь в свою таблицу `leads` для воронки в админке.
    Никогда не бросает наружу: при сбое возвращает success=false."""
    if not payload.leadId:
        return {"success": False}
    try:
        row: dict = {
            "lead_id": payload.leadId,
            "step": payload.step,
            "updated_at": datetime.utcnow().isoformat(),
        }
        if payload.firstName is not None:
            row["first_name"] = payload.firstName
        if payload.lastName is not None:
            row["last_name"] = payload.lastName
        if payload.linkedin is not None:
            row["linkedin"] = payload.linkedin
        if payload.phone is not None:
            row["phone"] = payload.phone
        if payload.city is not None:
            row["city"] = payload.city
        if payload.variant in ("a", "b", "c"):
            row["variant"] = payload.variant
        if payload.source in ("site", "wa"):
            row["source"] = payload.source
        try:
            supabase.table("leads").upsert(row, on_conflict="lead_id").execute()
        except Exception as e:
            # Миграция 022 (leads.variant/source) ещё не применена — не теряем сам лид.
            if ("variant" in str(e) or "source" in str(e)) and (row.pop("variant", None) or row.pop("source", None)):
                supabase.table("leads").upsert(row, on_conflict="lead_id").execute()
            else:
                raise
        return {"success": True}
    except Exception as e:
        logger.error(f"[API] /leads/step failed: {e}")
        return {"success": False}


def create_profile_from_linkedin(
    name: str,
    phone_raw: str | None,
    city: str | None,
    linkedin_url: str | None,
    linkedin_profile: dict,
    lang: str = "ru",
    variant: str | None = None,
    defer=None,
    send_greeting: bool = True,
) -> dict:
    """Ядро web_start: создаём/обновляем юзера из (распарсенного) LinkedIn, строим
    GIVE-вектор. Общее для регистрации на сайте и регистрации прямо в WhatsApp
    (вариант B A/B-теста — там send_greeting=False, юзер уже в чате).

    defer(fn, *args) — как выполнять тяжёлое (LLM-добор, WA-шаблон): в вебе это
    BackgroundTasks.add_task; None — выполняем сразу (вызывающий сам в фоне).
    Возвращает {'user_id','name','token','already_done'}. ValueError — кривой телефон.
    """
    from linkedin_map import linkedin_to_give
    from embeddings import get_embedding

    phone = normalize_phone(phone_raw)
    if not phone:
        raise ValueError("Некорректный номер телефона")
    if defer is None:
        def defer(fn, *args):
            fn(*args)

    columns, give_text = linkedin_to_give(linkedin_profile, name)
    give_vector = get_embedding(give_text) if give_text else None

    # Домены/сеньорность: из LinkedIn сразу; пустое — дотянет фон (_backfill_extraction).
    domains = columns["domains"]
    experience_level = columns["experience_level"]

    # Дедуп: один человек = один профиль. Ищем существующего юзера
    # по телефону, а если не нашли — по linkedin_url (чтобы тот же LinkedIn
    # с другим номером не создавал второй профиль). Совпадение => апдейтим
    # найденного, новый ряд не создаём.
    existing_row = None
    by_phone = supabase.table("users").select("user_id, onboarding_completed").eq("phone", phone).limit(1).execute()
    if by_phone.data:
        existing_row = by_phone.data[0]
    elif linkedin_url:
        by_li = supabase.table("users").select("user_id, onboarding_completed").eq("linkedin_url", linkedin_url).limit(1).execute()
        if by_li.data:
            existing_row = by_li.data[0]

    is_existing = existing_row is not None
    already_done = is_existing and bool(existing_row.get("onboarding_completed"))
    user_id = existing_row["user_id"] if is_existing else f"usr_{uuid.uuid4().hex[:10]}"

    user_data = {
        "user_id": user_id,
        "phone": phone,
        "name": columns["name"],
        "city": (city or columns["city"]),
        "languages": columns["languages"],
        "education": columns["education"],
        "hard_skills": columns["hard_skills"],
        "domains": domains,
        "experience_level": experience_level,
        "current_status": columns["current_status"],
        "linkedin_url": linkedin_url,
        "lang": lang if lang in ("ru", "en") else "ru",
        "experiences": columns.get("experiences", []),
        "projects": columns.get("projects", []),
        "honors": columns.get("honors", []),
    }
    # A/B-вариант фиксируем только при СОЗДАНИИ (повторная рега не перекрашивает тест).
    if variant in ("a", "b", "c") and not is_existing:
        user_data["ab_variant"] = variant
    # Повторная отправка сайта НЕ должна раззавершать уже завершённый онбординг.
    if not already_done:
        user_data["onboarding_stage"] = "web_done"
        user_data["onboarding_completed"] = False
    if columns.get("avatar"):
        user_data["avatar"] = columns["avatar"]
    if give_vector:
        user_data["give_vector"] = give_vector

    try:
        supabase.table("users").upsert(user_data, on_conflict="user_id").execute()
    except Exception as e:
        # Миграция 022 (users.ab_variant) ещё не применена — регу не роняем, вариант теряем.
        if "ab_variant" in str(e) and user_data.pop("ab_variant", None) is not None:
            logger.warning("[web_start] users.ab_variant missing (run migration 022) — saved without variant")
            supabase.table("users").upsert(user_data, on_conflict="user_id").execute()
        else:
            raise
    logger.info(f"[web_start] GIVE saved for {user_id} ({phone}) variant={variant or '-'}")

    # LLM-домены/сеньорность — в фон (после ответа), чтобы не ждать gemini-flash/503.
    if give_text:
        defer(
            _backfill_extraction, user_id, give_text,
            bool(columns["domains"]), bool(columns["experience_level"]),
        )

    # Проактивный шаблон в WhatsApp сразу после регистрации (только для НЕзавершённых).
    # Вариант C заканчивает онбординг на сайте, вариант B уже сидит в WA-чате — им не шлём.
    if not already_done and send_greeting:
        defer(_send_wa_greeting, user_id, phone, columns["name"])

    return {
        "user_id": user_id,
        "name": columns["name"],
        "token": issue_lk_token(user_id),
        "already_done": already_done,
    }


@app.post("/onboarding/web_start")
async def onboarding_web_start(payload: WebStartRequest, background_tasks: BackgroundTasks):
    """
    Веб-шаг: имя + телефон + распарсенный LinkedIn -> создаём/обновляем юзера,
    строим GIVE-вектор. Домены/сеньорность (LLM) дотягиваются фоном — ответ сразу.
    ASK + психотип добираются в WhatsApp (stage='web_done'), кроме варианта C —
    там ASK-онбординг продолжается прямо на сайте (/onboarding/web_turn).
    """
    logger.info(f"[API] POST /onboarding/web_start variant={payload.variant or '-'}")
    try:
        out = create_profile_from_linkedin(
            name=payload.name,
            phone_raw=payload.phone,
            city=payload.city,
            linkedin_url=payload.linkedin_url,
            linkedin_profile=payload.linkedin_profile,
            lang=payload.lang,
            variant=payload.variant,
            defer=background_tasks.add_task,
            send_greeting=(payload.variant != "c"),
        )
        return {"status": "success", "user_id": out["user_id"], "token": out["token"], "name": out["name"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


class WebTurnRequest(BaseModel):
    token: str      # lk-токен, выданный web_start
    message: str


@app.post("/onboarding/web_turn")
async def onboarding_web_turn(payload: WebTurnRequest):
    """Вариант C A/B-теста: ASK-онбординг (THE BUILD/ASK/GIVE/GOAL) прямо в чате
    сайта. Один ход диалога — то же ядро, что и WhatsApp-онбординг (wa/dialog.py),
    стейт лежит в wa_conversations по телефону: если юзер потом напишет в WA,
    диалог продолжится с того же места. По done возвращаем ссылку на ЛК."""
    res = supabase.table("lk_tokens").select("user_id").eq("token", payload.token).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = res.data[0]["user_id"]
    u = supabase.table("users").select("user_id, name, phone, lang, onboarding_completed").eq("user_id", user_id).execute()
    if not u.data:
        raise HTTPException(status_code=404, detail="User not found")
    user = u.data[0]
    if user.get("onboarding_completed"):
        return {"status": "success", "reply": "", "done": True, "lk": lk_link(user_id)}
    if not user.get("phone"):
        raise HTTPException(status_code=400, detail="No phone on profile")

    from wa import dialog
    # Веб-чат (вариант C и «дозаполнить профиль» по ссылке) = ПОЛНЫЙ онбординг.
    out = await dialog.onboarding_step(user["phone"], user, (payload.message or "").strip(), depth="deep")
    resp = {"status": "success", "reply": out.get("reply") or "", "done": bool(out.get("done"))}
    if resp["done"]:
        resp["lk"] = lk_link(user_id)
    return resp


class StoryRequest(BaseModel):
    token: str          # lk-токен (тот же, что открывает /lk)
    the_build: str = ""
    the_ask: str = ""
    the_give: str = ""
    the_goal: str = ""
    challenge: str = ""             # «с чем нужна помощь» → идёт в extra (обогащает ask_vector)
    pace: int | None = None         # 0-10, work vibe (структурное поле, не вектор)
    social_battery: str = ""        # Introvert/Ambivert/Extrovert
    education: str = ""             # универ (чистое имя школы → alumni-бонус в reranker)
    education_status: str = ""      # 'current' | 'alum' (guarded-колонка)
    stage: str = ""                 # стадия → мержим в current_status.stage
    new_to_city: bool | None = None # недавно в городе (guarded-колонка)


@app.post("/onboarding/story")
async def onboarding_story(payload: StoryRequest):
    """«Глубокий» онбординг из ЛК («Your Story», mad-libs-форма): все 5 полей подаются
    ОДНИМ разом (не пошаговый чат) — тот же completion-пайплайн, что у WA/веб-чата
    (wa.dialog._complete_onboarding), просто без диалога. Юзер уже мог пройти короткий
    онбординг (onboarding_completed=True) — это НЕ гейтится тем флагом, только своим
    deep_onboarding_completed. Ставит флаг + отдаёт награду-метч (см. teasers.reward_line_for)."""
    res = supabase.table("lk_tokens").select("user_id").eq("token", payload.token).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = res.data[0]["user_id"]
    u = supabase.table("users").select("user_id, name, phone, city, current_status").eq("user_id", user_id).execute()
    if not u.data:
        raise HTTPException(status_code=404, detail="User not found")
    user = u.data[0]
    if not user.get("phone"):
        raise HTTPException(status_code=400, detail="No phone on profile")
    if not payload.the_ask.strip():
        raise HTTPException(status_code=400, detail="the_ask is required")

    draft = {
        "the_build": payload.the_build.strip(),
        "the_ask": payload.the_ask.strip(),
        "the_give": payload.the_give.strip(),
        "the_goal": payload.the_goal.strip(),
        "extra": payload.challenge.strip(),  # «что помогло бы» усиливает ASK-вектор
    }
    from wa.dialog import _complete_onboarding
    await asyncio.to_thread(_complete_onboarding, user["phone"], user, draft, True)

    # Вайб — структурные поля (не векторы), пишем напрямую. В матч сегодня не входят,
    # но заполняют профиль (и можно подключить в soft-скоринг позже).
    vibe = {}
    if payload.pace is not None:
        vibe["pace"] = max(0, min(10, int(payload.pace)))
    if payload.social_battery.strip():
        vibe["social_battery"] = payload.social_battery.strip()
    if vibe:
        try:
            supabase.table("users").update(vibe).eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"[story] vibe save failed for {user_id}: {e}")

    # «Факты»: универ (влияет на alumni-бонус в reranker), стадия, новичок в городе.
    facts = {}
    if payload.education.strip():
        facts["education"] = payload.education.strip()  # ЧИСТОЕ имя школы (равенство = alumni-матч)
    if payload.stage.strip():
        cs = dict(user.get("current_status") or {})     # стадия живёт в current_status jsonb, не топ-колонка
        cs["stage"] = payload.stage.strip()
        facts["current_status"] = cs
    optional = {}                                        # новые колонки — могут быть ещё не накатаны
    if payload.education_status.strip():
        optional["education_status"] = payload.education_status.strip()
    if payload.new_to_city is not None:
        optional["new_to_city"] = bool(payload.new_to_city)
    if facts or optional:
        try:
            supabase.table("users").update({**facts, **optional}).eq("user_id", user_id).execute()
        except Exception as e:
            # optional-колонки могут отсутствовать до миграции — сохраняем хотя бы гарантированные facts
            if optional and any(k in str(e) for k in optional) and facts:
                logger.warning(f"[story] optional facts cols missing, saving core: {e}")
                try:
                    supabase.table("users").update(facts).eq("user_id", user_id).execute()
                except Exception as e2:
                    logger.warning(f"[story] facts save failed for {user_id}: {e2}")
            else:
                logger.warning(f"[story] facts save failed for {user_id}: {e}")

    from teasers import reward_line_for
    reward = await asyncio.to_thread(reward_line_for, user_id, user.get("city") or "")
    logger.info(f"[story] deep onboarding completed for {user_id}")
    return {"status": "success", "reward": reward, "lk": lk_link(user_id)}


class SuggestRequest(BaseModel):
    token: str


@app.post("/onboarding/suggestions")
async def onboarding_suggestions_ep(payload: SuggestRequest):
    """Персонализированные чипы-подсказки для «Истории», по данным короткого онбординга.
    LLM (llm_extract.onboarding_suggestions) + мгновенный эвристический fallback из их же
    структурных полей, чтобы поля никогда не были без подсказок."""
    res = supabase.table("lk_tokens").select("user_id").eq("token", payload.token).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Ссылка недействительна")
    user_id = res.data[0]["user_id"]
    u = supabase.table("users").select(
        "city,domains,hard_skills,current_status,intents,custom_request_raw"
    ).eq("user_id", user_id).execute()
    user = (u.data or [{}])[0]

    domains = [str(d) for d in (user.get("domains") or []) if d]
    skills = [str(s) for s in (user.get("hard_skills") or []) if s]
    st = user.get("current_status") or {}
    ctx = (
        f"Role: {st.get('type') or ''}\nCity: {user.get('city') or ''}\n"
        f"Domains: {', '.join(domains)}\nSkills: {', '.join(skills)}\n"
        f"Intents: {', '.join(str(i) for i in (user.get('intents') or []))}\n"
        f"Their ask in their own words: {user.get('custom_request_raw') or ''}"
    )

    # Fallback из структурных полей (мгновенно, всегда персонализирован их же данными).
    fb_ask = [f"other {d.lower()} founders" for d in domains[:2]] + ["a seed investor", "someone who's scaled"]
    fb_give = [s.lower() for s in skills[:4]] or ["fundraising", "growth", "product"]
    fb_help = ["a key intro", "a first hire", "first users", "honest advice"]

    from llm_extract import onboarding_suggestions as _sugg
    llm = await asyncio.to_thread(_sugg, ctx)

    def pick(key, fb):
        vals = [x for x in (llm.get(key) or []) if x]
        return (vals or fb)[:4]

    return {"ask": pick("ask", fb_ask), "give": pick("give", fb_give), "help": pick("help", fb_help)}


@app.post("/onboarding/transcribe")
async def onboarding_transcribe(file: UploadFile = File(...)):
    """Веб голосовой ввод для «Истории»: аудио-blob из браузера (MediaRecorder) ->
    Gemini speech-to-text. Утилитарный эндпоинт, без привязки к юзеру/токену."""
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio")
    from wa.transcribe import transcribe_bytes
    text = await asyncio.to_thread(transcribe_bytes, audio_bytes, file.content_type or "audio/webm")
    if text is None:
        raise HTTPException(status_code=502, detail="Transcription failed")
    return {"status": "success", "text": text}


# Поля, которые можно показать ДРУГОМУ юзеру (без phone, векторов, биллинга).
PUBLIC_USER_FIELDS = (
    "user_id,name,avatar,age,city,district,languages,education,experience_level,"
    "domains,hard_skills,current_status,pace,social_battery,intents,"
    "custom_request_raw,linkedin_url,experiences,projects,honors"
)


@app.get("/users/{target_id}")
async def get_user_profile(target_id: str, uid: str = Depends(require_uid)):
    # Своя карточка — всё (без внутренних векторов/пароля).
    if target_id == uid:
        res = supabase.table("users").select("*").eq("user_id", target_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="User not found")
        return {"status": "success", "user": strip_internal(res.data[0]), "matched": True}

    # Чужой профиль: ПОЛНЫЕ публичные поля (имя/LinkedIn) — ТОЛЬКО при подтверждённом матче.
    # Иначе аноним-карточка (роль/теги, без имени/контактов) — личность не раскрываем до матча.
    m = (supabase.table("matches").select("id")
         .or_(f"and(user_a_id.eq.{uid},user_b_id.eq.{target_id}),"
              f"and(user_a_id.eq.{target_id},user_b_id.eq.{uid})")
         .limit(1).execute().data)
    matched = bool(m)
    res = supabase.table("users").select("*").eq("user_id", target_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    person = res.data[0]
    if matched:
        return {"status": "success", "user": strip_internal({k: person.get(k) for k in PUBLIC_USER_FIELDS.split(",")}), "matched": True}
    return {"status": "success", "user": public_card(person, reveal_name=False), "matched": False}


# ============================================================
#  LK (личный кабинет) — magic-link вход по токену (без uid в ссылке)
# ============================================================
import secrets

# Поля профиля для ЛК (всё, кроме тяжёлых векторов).
LK_FIELDS = (
    "user_id,name,avatar,age,city,district,languages,education,experience_level,"
    "domains,hard_skills,current_status,pace,social_battery,intents,"
    "custom_request_raw,linkedin_url,subscription_tier,available_formats,"
    "events_quota,events_used,lang,onboarding_completed,"
    "experiences,projects,honors"
    # deep_onboarding_completed приезжает отдельным guarded select ниже (колонка может
    # быть ещё не накатана в БД — см. ALTER TABLE в комментарии к _complete_onboarding).
)


def issue_lk_token(user_id: str) -> str:
    """Постоянный токен ЛК. Переиспользуем существующий -> ссылка 'закреплена'."""
    existing = supabase.table("lk_tokens").select("token").eq("user_id", user_id).limit(1).execute()
    if existing.data:
        return existing.data[0]["token"]
    token = secrets.token_urlsafe(24)
    supabase.table("lk_tokens").insert({"token": token, "user_id": user_id}).execute()
    return token


def lk_link(user_id: str) -> str:
    base = WEB_URL  # ЛК живёт на фронтенде, не на ai-engine
    return f"{base}/lk?token={issue_lk_token(user_id)}"


@app.get("/lk/profile")
async def lk_profile(token: str):
    res = supabase.table("lk_tokens").select("user_id").eq("token", token).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Ссылка недействительна")
    user_id = res.data[0]["user_id"]
    u = supabase.table("users").select(LK_FIELDS).eq("user_id", user_id).execute()
    if not u.data:
        raise HTTPException(status_code=404, detail="User not found")
    prof = u.data[0]
    prof["events_reset_at"] = _get_events_reset_at(user_id)  # дата пополнения (guarded)
    prof["deep_onboarding_completed"] = _get_deep_onboarding_completed(user_id)  # guarded (колонка может отсутствовать)
    return {"status": "success", "user": prof, "token": token}


def _get_deep_onboarding_completed(user_id: str) -> bool:
    """Guarded select — до накатки ALTER TABLE колонки нет, тогда просто False (баннер
    «дозаполни профиль» показывается всем, что и так корректно для этого состояния)."""
    try:
        r = supabase.table("users").select("deep_onboarding_completed").eq("user_id", user_id).execute()
        return bool(r.data and r.data[0].get("deep_onboarding_completed"))
    except Exception:
        return False


class LkRequest(BaseModel):
    phone: str


@app.post("/lk/request")
async def lk_request(payload: LkRequest):
    """Вход в ЛК с подтверждением через WhatsApp: шлём magic-link в чат юзера."""
    phone = normalize_phone(payload.phone)
    res = supabase.table("users").select("user_id").eq("phone", phone).execute() if phone else None
    if res and res.data:
        from wa import send as wa_send
        wa_send.send_text(phone, f"Вход в личный кабинет Coconect 🔑\n{lk_link(res.data[0]['user_id'])}")
    # не раскрываем, существует ли номер
    return {"status": "ok"}


@app.patch("/users/{user_id}")
async def update_user_profile(user_id: str, payload: dict, uid: str = Depends(require_uid)):
    """Edit profile fields (incl. avatar). Re-embeds give/ask vectors when relevant fields change."""
    assert_self(user_id, uid)
    cur = supabase.table("users").select("*").eq("user_id", user_id).execute()
    if not cur.data:
        raise HTTPException(status_code=404, detail="User not found")
    user = cur.data[0]

    allowed = {
        "name", "age", "city", "district", "languages", "avatar",
        "education", "experience_level", "domains", "hard_skills", "current_status",
        "pace", "social_battery", "intents", "custom_request_raw",
    }
    update = {k: v for k, v in (payload or {}).items() if k in allowed}
    if "industry" in (payload or {}) and "domains" not in update:
        update["domains"] = payload["industry"]
    if not update:
        return {"status": "success", "user": user}

    merged = {**user, **update}
    give_fields = {"education", "experience_level", "domains", "hard_skills", "current_status"}
    ask_fields = {"intents", "custom_request_raw"}
    if give_fields.intersection(update):
        update["give_vector"] = generate_give_vector_smart({
            "education": merged.get("education", ""),
            "experience_level": merged.get("experience_level", []),
            "domains": merged.get("domains", []),
            "hard_skills": merged.get("hard_skills", []),
            "current_status": merged.get("current_status", {}),
        })
    if ask_fields.intersection(update):
        update["ask_vector"] = generate_ask_vector_smart({
            "intents": merged.get("intents", []),
            "custom_request_raw": merged.get("custom_request_raw", ""),
        })

    supabase.table("users").update(update).eq("user_id", user_id).execute()
    res = supabase.table("users").select("*").eq("user_id", user_id).execute()
    return {"status": "success", "user": res.data[0]}


@app.post("/users/{user_id}/pay-penalty")
async def pay_penalty(user_id: str, uid: str = Depends(require_uid)):
    """Stub payment: clears the no-show penalty so the user can join again."""
    assert_self(user_id, uid)
    supabase.table("users").update({"has_penalty": False}).eq("user_id", user_id).execute()
    create_notification(user_id, "Penalty cleared — you can join dinners again.", kind="system")
    return {"status": "success"}


AVATAR_BUCKET = os.getenv("AVATAR_BUCKET", "avatars")


@app.post("/users/{user_id}/avatar")
async def upload_avatar(user_id: str, payload: dict, uid: str = Depends(require_uid)):
    """Accepts a resized JPEG data URL, stores it in Supabase Storage, returns a public URL."""
    assert_self(user_id, uid)
    data_url = (payload or {}).get("data_url") or ""
    if "," not in data_url:
        raise HTTPException(status_code=400, detail="Invalid image data")
    try:
        raw = base64.b64decode(data_url.split(",", 1)[1])
    except Exception:
        raise HTTPException(status_code=400, detail="Bad image encoding")

    storage = supabase.storage
    try:
        storage.create_bucket(AVATAR_BUCKET, options={"public": True})
    except Exception:
        pass  # bucket already exists

    path = f"{user_id}.jpg"
    try:
        try:
            storage.from_(AVATAR_BUCKET).remove([path])
        except Exception:
            pass
        storage.from_(AVATAR_BUCKET).upload(path, raw, {"content-type": "image/jpeg"})
    except Exception as e:
        logger.error(f"[AVATAR] upload failed: {e}")
        raise HTTPException(status_code=500, detail="Upload failed. Is the 'avatars' storage bucket created & public?")

    url = storage.from_(AVATAR_BUCKET).get_public_url(path).rstrip("?")
    sep = "&" if "?" in url else "?"
    return {"status": "success", "url": f"{url}{sep}t={int(time.time())}"}


# ============================================================
#  NOTIFICATIONS (in-app)
# ============================================================
@app.get("/users/{user_id}/notifications")
async def list_notifications(user_id: str, uid: str = Depends(require_uid)):
    assert_self(user_id, uid)
    res = supabase.table("user_notifications").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
    return {"status": "success", "notifications": res.data or []}


@app.get("/users/{user_id}/notifications/unread-count")
async def unread_count(user_id: str, uid: str = Depends(require_uid)):
    assert_self(user_id, uid)
    res = supabase.table("user_notifications").select("id", count="exact").eq("user_id", user_id).eq("is_read", False).execute()
    return {"status": "success", "count": res.count or 0}


@app.patch("/users/{user_id}/notifications/read-all")
async def mark_all_read(user_id: str, uid: str = Depends(require_uid)):
    assert_self(user_id, uid)
    supabase.table("user_notifications").update({"is_read": True}).eq("user_id", user_id).eq("is_read", False).execute()
    return {"status": "success"}


# ============================================================
#  MATCH SEARCH (pairwise tiers — kept from Tablr)
# ============================================================
@app.post("/search")
async def search_matches(payload: MatchSearchRequest, uid: str = Depends(require_uid)):
    matches = execute_tier2_deep_match(user_a_id=uid, event_id=payload.event_id)
    return {"status": "success", "matches": matches}


@app.post("/teaser")
async def get_teaser(payload: MatchSearchRequest, uid: str = Depends(require_uid)):
    pool = get_tier1_teaser_pool(user_id=uid, event_id=payload.event_id, query=payload.query)
    return {"status": "success", "teaser_pool": pool}


# ============================================================
#  PUBLIC DISCOVERY TEASER (лендинг: «кого ты хочешь найти?»)
#  Только ЧТЕНИЕ: ищем среди зареганных юзеров и отдаём АНОНИМНО
#  (без имён/контактов). Никаких сообщений реальным людям не шлём.
#  Публичный → простой per-IP rate-limit против прощупывания базы.
# ============================================================
class DiscoveryPreviewRequest(BaseModel):
    query: str = ""

_DISCOVERY_HITS: dict[str, list[float]] = {}
_DISCOVERY_LIMIT = 20        # запросов
_DISCOVERY_WINDOW = 60.0     # за N секунд с одного IP


@app.post("/discovery/preview")
async def discovery_preview(payload: DiscoveryPreviewRequest, request: Request):
    # --- rate-limit по IP ---
    ip = ((request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
          or (request.client.host if request.client else "unknown"))
    now = time.time()
    recent = [t for t in _DISCOVERY_HITS.get(ip, []) if now - t < _DISCOVERY_WINDOW]
    if len(recent) >= _DISCOVERY_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests")
    recent.append(now)
    _DISCOVERY_HITS[ip] = recent

    q = (payload.query or "").strip().lower()
    try:
        rows = supabase.table("users").select(
            "domains, hard_skills, current_status, city, experience_level"
        ).eq("onboarding_completed", True).limit(400).execute().data or []
    except Exception as e:
        logger.warning(f"[discovery_preview] db error: {e}")
        return {"total": 0, "samples": []}

    def _searchable(u: dict) -> str:
        cs = u.get("current_status") or {}
        cs_text = " ".join(str(v) for v in cs.values()) if isinstance(cs, dict) else str(cs)
        return " ".join([
            " ".join(u.get("domains") or []),
            " ".join(u.get("hard_skills") or []),
            cs_text,
            u.get("city") or "",
        ]).lower()

    tokens = [t for t in re.split(r"[\s,/]+", q) if len(t) > 2]
    matched = [u for u in rows if not tokens or any(t in _searchable(u) for t in tokens)]

    def _anon(u: dict) -> dict:
        domains = u.get("domains") or []
        skills = u.get("hard_skills") or []
        role = domains[0] if domains else (skills[0] if skills else "Builder")
        tagline = " · ".join(skills[:2]) if skills else (domains[1] if len(domains) > 1 else "")
        return {"role": role, "tagline": tagline, "city": u.get("city") or ""}

    # Анонимно, только читаем — никому не пишем.
    return {"total": len(matched), "samples": [_anon(u) for u in matched[:3]]}


# ============================================================
#  SUBSCRIPTION (stub — no real payment yet)
# ============================================================
class SubscriptionPurchaseRequest(BaseModel):
    user_id: str
    tier: str


class AdminTierUpdateRequest(BaseModel):
    tier: str


@app.post("/subscription/purchase")
async def purchase_subscription(payload: SubscriptionPurchaseRequest, _admin: bool = Depends(require_admin)):
    # Прямая выдача тарифа — ТОЛЬКО админ (реальные покупки идут через /billing/checkout + Stripe webhook).
    logger.info(f"[SUBSCRIPTION] (admin) {payload.user_id} -> {payload.tier}")
    tier = payload.tier
    quota = TIER_QUOTA.get(tier, 1)
    formats = TIER_FORMATS.get(tier, ["Dinners"])
    check = supabase.table("users").select("id").eq("user_id", payload.user_id).execute()
    if not check.data:
        supabase.table("users").insert({
            "user_id": payload.user_id, "name": "Test User", "city": "London",
            "subscription_tier": tier, "events_quota": quota, "events_used": 0,
            "available_formats": formats,
        }).execute()
    else:
        supabase.table("users").update({
            "subscription_tier": tier, "events_quota": quota, "events_used": 0,
            "available_formats": formats,
        }).eq("user_id", payload.user_id).execute()
    return {"status": "success", "message": f"Purchased {tier}"}


# ============================================================
#  BILLING (Stripe Checkout)
# ============================================================
class BillingCheckoutRequest(BaseModel):
    user_id: str
    type: str                 # "extra_event" | "upgrade"
    plan: str | None = None   # для upgrade — имя тарифа
    promo: str | None = None  # промокод (вводится в Stripe Checkout)


def _notify_purchase(phone: str | None, what: str, quota: int | None):
    """WhatsApp-подтверждение успешной покупки."""
    if not phone:
        return
    try:
        from wa import send
        if quota:
            msg = (f"🎉 You're on *{what}*! That's {quota} dinner{'s' if quota != 1 else ''} a month. "
                   "I'll start matching you for good tables. Welcome aboard!")
        else:
            msg = f"🎉 Payment received, your *{what}* is added. See you at the table!"
        send.send_text(phone, msg)
    except Exception as e:
        logger.error(f"[billing] purchase notify failed: {e}")


def _get_events_reset_at(user_id: str):
    """Дата пополнения дннеров. None, если колонки ещё нет (миграция не прогнана)."""
    try:
        r = supabase.table("users").select("events_reset_at").eq("user_id", user_id).execute()
        return r.data[0].get("events_reset_at") if r.data else None
    except Exception:
        return None


def _set_events_reset_at(user_id: str, iso_ts: str | None):
    if not iso_ts:
        return
    try:
        supabase.table("users").update({"events_reset_at": iso_ts}).eq("user_id", user_id).execute()
    except Exception as e:
        logger.warning(f"[billing] events_reset_at skipped (col missing?): {e}")


def _set_reset_from_subscription(user_id: str, sub_id: str | None):
    """Берём конец текущего периода подписки из Stripe → дата пополнения дннеров."""
    if not sub_id:
        return
    try:
        import stripe, datetime
        stripe.api_key = STRIPE_SECRET_KEY
        sub = stripe.Subscription.retrieve(sub_id)
        end = sub.get("current_period_end")
        if end:
            iso = datetime.datetime.fromtimestamp(end, datetime.timezone.utc).isoformat()
            _set_events_reset_at(user_id, iso)
    except Exception as e:
        logger.warning(f"[billing] reset_from_sub failed: {e}")


def _uid_from_subscription(sub_id: str | None):
    if not sub_id:
        return None
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        sub = stripe.Subscription.retrieve(sub_id)
        return (sub.get("metadata") or {}).get("user_id")
    except Exception:
        return None


def _apply_billing(user_id: str, kind: str, plan: str | None):
    """Начислить покупку после успешной оплаты (вызывается из вебхука / стаба)."""
    u = supabase.table("users").select("events_quota, events_used, phone").eq("user_id", user_id).execute()
    cur = u.data[0] if u.data else {}
    phone = cur.get("phone")
    if kind == "extra_event":
        supabase.table("users").update({
            "events_quota": (cur.get("events_quota") or 0) + 1
        }).eq("user_id", user_id).execute()
        _notify_purchase(phone, "extra dinner", None)
    elif kind == "upgrade" and plan:
        supabase.table("users").update({
            "subscription_tier": plan,
            "events_quota": TIER_QUOTA.get(plan, 1),
            "events_used": 0,
            "available_formats": TIER_FORMATS.get(plan, ["Dinners"]),
        }).eq("user_id", user_id).execute()
        # Платная подписка вытесняет промо-грант: снимаем daemon-управление (refill/expiry),
        # иначе промо-демон может неожиданно сбросить квоту/даунгрейднуть платящего.
        try:
            supabase.table("users").update(
                {"subscription_source": "stripe", "promo_expires_at": None}
            ).eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"[billing] clear promo flag skipped (cols missing?): {e}")
        _notify_purchase(phone, plan, TIER_QUOTA.get(plan, 1))


@app.post("/billing/checkout")
async def billing_checkout(payload: BillingCheckoutRequest, uid: str = Depends(require_uid)):
    """Создаёт Stripe Checkout session и возвращает {url}. Без ключей — stub (url=None)."""
    payload.user_id = uid  # личность — из сессии, не из тела
    if payload.promo:
        logger.info(f"[BILLING] promo entered by {uid}: {payload.promo}")
    if not STRIPE_SECRET_KEY:
        logger.warning("[BILLING] STRIPE_SECRET_KEY не задан — stub-режим")
        return {"url": None, "detail": "Payments are being set up — coming soon."}
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        if payload.type == "extra_event":
            mode, price = "payment", EXTRA_EVENT_PRICE_ID
        elif payload.type == "upgrade":
            mode, price = "subscription", TIER_PRICE_IDS.get(payload.plan or "", "")
        else:
            raise HTTPException(400, "bad type")
        if not price:
            return {"url": None, "detail": "This price is not configured yet."}
        kwargs = dict(
            mode=mode,
            line_items=[{"price": price, "quantity": 1}],
            allow_promotion_codes=True,  # позволяем вводить промокоды на странице оплаты
            success_url=f"{WEB_URL}/lk?billing=success",
            cancel_url=f"{WEB_URL}/lk?billing=cancel",
            client_reference_id=payload.user_id,
            metadata={"user_id": payload.user_id, "kind": payload.type, "plan": payload.plan or "", "promo": payload.promo or ""},
        )
        if mode == "subscription":
            # метаданные на саму подписку — чтобы ловить продления/отмены (invoice.paid и пр.)
            kwargs["subscription_data"] = {"metadata": {"user_id": payload.user_id}}
        session = stripe.checkout.Session.create(**kwargs)
        return {"url": session.url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[BILLING] checkout failed: {e}")
        return {"url": None, "detail": "Could not start checkout."}


def apply_internal_promo(uid: str, code: str, notify: bool = True) -> dict:
    """Ядро погашения ВНУТРЕННЕГО промокода (таблица promo_codes): выдаёт тариф
    БЕСПЛАТНО на duration_days (null = навсегда), мимо Stripe. Возвращает
    {ok:True, tier, expires_at, quota} или {ok:False, error, status, not_found}.
    Зовётся и из веб-эндпоинта, и из WhatsApp-бота (notify=False — без дубль-уведомления)."""
    import datetime
    code = (code or "").strip().upper()
    if not code:
        return {"ok": False, "error": "Enter a promo code", "status": 400}
    rows = supabase.table("promo_codes").select("*").eq("code", code).execute().data or []
    if not rows:
        return {"ok": False, "error": "Invalid promo code", "status": 404, "not_found": True}
    promo = rows[0]
    max_uses = promo.get("max_uses")
    used = promo.get("used_count") or 0
    if max_uses is not None and used >= max_uses:
        return {"ok": False, "error": "This code has already been fully used", "status": 409}
    tier = promo.get("subscription_tier")
    if tier not in TIER_QUOTA:
        return {"ok": False, "error": "This code is misconfigured — contact support", "status": 400}

    now = datetime.datetime.now(datetime.timezone.utc)
    dur = promo.get("duration_days")
    expires = (now + datetime.timedelta(days=int(dur))) if dur else None
    reset = now + datetime.timedelta(days=30)          # следующий помесячный refill
    if expires and reset > expires:                    # но не дальше окончания гранта
        reset = expires

    supabase.table("users").update({
        "subscription_tier": tier,
        "events_quota": TIER_QUOTA.get(tier, 1),
        "events_used": 0,
        "available_formats": TIER_FORMATS.get(tier, ["Dinners"]),
        "subscription_source": "promo",
        "promo_expires_at": expires.isoformat() if expires else None,
        "events_reset_at": reset.isoformat(),
    }).eq("user_id", uid).execute()
    supabase.table("promo_codes").update({"used_count": used + 1}).eq("id", promo["id"]).execute()

    if notify:
        try:
            u = supabase.table("users").select("phone").eq("user_id", uid).execute().data
            _notify_purchase((u[0].get("phone") if u else None), tier, TIER_QUOTA.get(tier, 1))
        except Exception as e:
            logger.warning(f"[PROMO] notify failed: {e}")
    logger.info(f"[PROMO] {uid} redeemed {code} -> {tier} (until {expires})")
    return {"ok": True, "tier": tier, "expires_at": expires.isoformat() if expires else None,
            "duration_days": dur, "quota": TIER_QUOTA.get(tier, 1)}


class PromoRedeemRequest(BaseModel):
    code: str


@app.post("/billing/redeem-promo")
async def redeem_promo(payload: PromoRedeemRequest, uid: str = Depends(require_uid)):
    """Погашение внутреннего промокода через сайт (биллинг). Демон _run_due_promo
    помесячно пополняет квоту и даунгрейдит до Starter по истечении срока."""
    res = apply_internal_promo(uid, payload.code, notify=True)
    if not res.get("ok"):
        raise HTTPException(res.get("status", 400), res.get("error", "Promo failed"))
    return {"ok": True, "tier": res["tier"], "expires_at": res.get("expires_at")}


@app.post("/billing/webhook")
async def billing_webhook(request: Request):
    """Stripe webhook: на checkout.session.completed начисляем покупку."""
    if not STRIPE_SECRET_KEY:
        return {"status": "stub"}
    import stripe
    stripe.api_key = STRIPE_SECRET_KEY
    body = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        if STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
        else:
            event = json.loads(body)
    except Exception as e:
        logger.error(f"[BILLING] webhook verify failed: {e}")
        return Response(status_code=400)
    et = event.get("type")
    obj = event["data"]["object"]
    if et == "checkout.session.completed":
        md = obj.get("metadata") or {}
        uid = md.get("user_id") or obj.get("client_reference_id")
        if uid:
            _apply_billing(uid, md.get("kind", "extra_event"), md.get("plan") or None)
            _set_reset_from_subscription(uid, obj.get("subscription"))
            logger.info(f"[BILLING] applied {md.get('kind')} for {uid}")
    elif et == "invoice.paid":
        # ежемесячное продление: новый цикл → сброс использованных + новая дата пополнения
        sub_id = obj.get("subscription")
        uid = _uid_from_subscription(sub_id)
        if uid:
            try:
                supabase.table("users").update({"events_used": 0}).eq("user_id", uid).execute()
            except Exception as e:
                logger.warning(f"[BILLING] renew reset failed: {e}")
            _set_reset_from_subscription(uid, sub_id)
            logger.info(f"[BILLING] renewed (quota reset) for {uid}")
    elif et == "customer.subscription.deleted":
        uid = (obj.get("metadata") or {}).get("user_id") or _uid_from_subscription(obj.get("id"))
        if uid:
            try:
                supabase.table("users").update({
                    "subscription_tier": "Starter",
                    "events_quota": TIER_QUOTA["Starter"],
                    "available_formats": TIER_FORMATS["Starter"],
                }).eq("user_id", uid).execute()
            except Exception as e:
                logger.warning(f"[BILLING] downgrade failed: {e}")
            logger.info(f"[BILLING] subscription canceled -> Starter for {uid}")
    return {"status": "ok"}


# ============================================================
#  EVENTS FEED
# ============================================================
def _rsvp_registered(row: dict | None) -> bool:
    """«Записан на ужин» для дашборда/детали. КЛЮЧЕВОЕ: отличаем реальную запись от
    WA-инвайта, на который ещё НЕ ответили. status='pending'+preferences.invited=True (и не
    confirmed) = «пригласили, ждём IN/OUT» → это НЕ регистрация (иначе ЛК показывает «ты
    записан», хотя человек не отвечал 'I'm in'). Записью считаем:
      • confirmed / is_confirmed — сказал «I'm in» в WhatsApp;
      • pending БЕЗ invited — осознанная запись в пул через веб (/events/{id}/rsvp);
      • легаси-строки без status — на всякий случай (старые данные)."""
    if not row:
        return False
    st = row.get("status")
    if st == "cancelled":
        return False
    if st == "confirmed" or row.get("is_confirmed"):
        return True
    if st == "pending":
        return not (row.get("preferences") or {}).get("invited")
    return True  # неизвестный/None статус (легаси) — не теряем


@app.get("/events/feed")
async def get_events_feed(user_id: str, city: str | None = None, uid: str = Depends(require_uid)):
    assert_self(user_id, uid)
    try:
        now = now_toronto()
        today_str = now.strftime("%Y-%m-%d")

        user_res = supabase.table("users").select("city, subscription_tier, has_penalty, events_quota, events_used").eq("user_id", user_id).execute()
        u0 = user_res.data[0] if user_res.data else {}
        user_home_city = u0.get("city", "Toronto") or "Toronto"
        user_tier = u0.get("subscription_tier", "Starter") or "Starter"
        has_penalty = u0.get("has_penalty", False)
        events_quota = u0.get("events_quota", 1) or 0
        events_used = u0.get("events_used", 0) or 0
        # City being viewed (switcher) — defaults to the user's home city.
        view_city = city or user_home_city
        user_city = view_city

        rsvp_res = supabase.table("event_rsvps").select("event_id, status, preferences, is_confirmed").eq("user_id", user_id).execute()
        active_ids = [r["event_id"] for r in rsvp_res.data if _rsvp_registered(r)]

        upcoming_events, past_events_to_review, history_events = [], [], []

        if active_ids:
            mine = supabase.table("events").select("*").in_("id", active_ids).order("event_date").execute()
            for ev in mine.data:
                if parse_event_dt(ev) < now:
                    past_events_to_review.append(ev)
                    history_events.append(ev)
                else:
                    ev["is_rsvped"] = True
                    upcoming_events.append(ev)

            # Отфильтровываем уже оценённые ивенты.
            if past_events_to_review:
                ids = [ev["id"] for ev in past_events_to_review]
                reviewed = supabase.table("event_reviews").select("event_id").eq("reviewer_id", user_id).in_("event_id", ids).execute()
                reviewed_ids = {r["event_id"] for r in (reviewed.data or [])}
                past_events_to_review = [ev for ev in past_events_to_review if ev["id"] not in reviewed_ids]

        # Открытые пулы: будущие, со статусом open, в которые ещё не записан.
        open_q = supabase.table("events").select("*").eq("status", "open").gte("event_date", today_str).order("event_date").execute()
        all_open = [ev for ev in open_q.data if ev["id"] not in active_ids]
        # Список городов, где вообще есть открытые ивенты (для переключателя).
        cities = sorted({ev.get("city") for ev in all_open if ev.get("city")})
        # Фильтруем по просматриваемому городу (события без города показываем везде).
        open_events = [ev for ev in all_open if (not ev.get("city")) or ev.get("city") == view_city]

        return {
            "status": "success",
            "city": user_city,
            "home_city": user_home_city,
            "cities": cities,
            "tier": user_tier,
            "events_quota": events_quota,
            "events_used": events_used,
            "has_penalty": has_penalty,
            "upcoming_events": upcoming_events,
            "open_events": open_events,
            "past_events": past_events_to_review,
            "history_events": history_events,
        }
    except Exception as e:
        logger.error(f"[ERROR] Events feed failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
#  EVENT JOIN / CANCEL / CONFIRM
# ============================================================
@app.post("/events/{event_id}/join")
async def join_event(event_id: str, payload: JoinEventRequest, uid: str = Depends(require_uid)):
    payload.user_id = uid  # личность — из сессии
    logger.info(f"[RSVP] {payload.user_id} -> {event_id} prefs={payload.preferences}")
    try:
        user_res = supabase.table("users").select("events_quota, events_used, has_penalty").eq("user_id", payload.user_id).execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="User not found")
        u = user_res.data[0]
        if u.get("has_penalty"):
            raise HTTPException(status_code=403, detail="Unpaid penalty — settle it in your profile to join.")
        if not FREE_MODE and u.get("events_used", 0) >= u.get("events_quota", 1):
            raise HTTPException(status_code=402, detail="No tickets left. Upgrade your plan.")

        prefs = payload.preferences or {}
        supabase.table("event_rsvps").upsert({
            "user_id": payload.user_id,
            "event_id": event_id,
            "neighborhood": prefs.get("neighborhood"),
            "budget_pref": prefs.get("budget"),
            "diet": prefs.get("diet"),
            "energy_level": prefs.get("energy_level", "balanced"),
            "budget_preference": prefs.get("budget"),
            "status": "pending",
        }, on_conflict="user_id,event_id").execute()

        supabase.table("users").update({"events_used": u.get("events_used", 0) + 1}).eq("user_id", payload.user_id).execute()

        ev = supabase.table("events").select("title").eq("id", event_id).execute()
        title = ev.data[0]["title"] if ev.data else "the dinner"
        create_notification(payload.user_id, f"You're in the pool for {title}. We'll reveal your table 24h before.", kind="event")
        return {"status": "success", "message": "Joined the pool"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] RSVP failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/events/{event_id}/cancel")
async def cancel_rsvp(event_id: str, payload: dict, uid: str = Depends(require_uid)):
    user_id = uid  # личность — из сессии
    try:
        ev_res = supabase.table("events").select("*").eq("id", event_id).execute()
        late = False
        if ev_res.data:
            late = hours_until(ev_res.data[0]) < 24

        res = supabase.table("event_rsvps").delete().eq("event_id", event_id).eq("user_id", user_id).execute()
        if res.data:
            if late:
                # Поздняя отмена — штраф, квота не возвращается.
                supabase.table("users").update({"has_penalty": True}).eq("user_id", user_id).execute()
            else:
                ur = supabase.table("users").select("events_used").eq("user_id", user_id).execute()
                if ur.data:
                    used = max(0, ur.data[0].get("events_used", 1) - 1)
                    supabase.table("users").update({"events_used": used}).eq("user_id", user_id).execute()
        return {"status": "success", "penalty": late}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/events/{event_id}/confirm")
async def confirm_attendance(event_id: str, payload: dict, uid: str = Depends(require_uid)):
    supabase.table("event_rsvps").update({"is_confirmed": True}).eq("event_id", event_id).eq("user_id", uid).execute()
    return {"status": "success"}


# ============================================================
#  PRIVACY — чужие профили до матча отдаём БЕЗ PII
# ============================================================
# Никогда не уходит наружу (даже после матча): хэш пароля и векторы.
_SENSITIVE_INTERNAL = {"password", "ask_vector", "give_vector", "semantic_vector", "gender_confidence"}


def public_card(u: dict, reveal_name: bool = False) -> dict:
    """Безопасная проекция чужого профиля для показа ДО матча: только
    профессиональный контекст (роль/компания/теги) — без имени, аватара и контактов.
    reveal_name=True (ужин прошёл — люди уже встретились) добавляет имя+аватар,
    но НИКОГДА не телефон/email/linkedin/векторы. Полные данные — только в
    /matches/confirmed (после взаимного матча)."""
    st = u.get("current_status") or {}
    card = {
        "user_id": u.get("user_id"),
        "headline": u.get("headline") or st.get("type") or "",
        "role": st.get("type") or "",
        "company": st.get("company_name") or "",
        "domains": u.get("domains") or [],
        "hard_skills": (u.get("hard_skills") or [])[:6],
        "experience_level": u.get("experience_level") or [],
        "city": u.get("city") or "",
    }
    if reveal_name:
        card["name"] = u.get("name")
        card["avatar"] = u.get("avatar")
    return card


def strip_internal(u: dict) -> dict:
    """Убрать внутренние/чувствительные поля из профиля матча (пароль, векторы)."""
    return {k: v for k, v in (u or {}).items() if k not in _SENSITIVE_INTERNAL}


# ============================================================
#  EVENT DETAILS  (progressive reveal: group @24h, location @12h)
# ============================================================
@app.get("/events/{event_id}/details")
async def event_details(event_id: str, user_id: str, uid: str = Depends(require_uid)):
    assert_self(user_id, uid)
    ev_res = supabase.table("events").select("*").eq("id", event_id).execute()
    if not ev_res.data:
        raise HTTPException(status_code=404, detail="Event not found")
    ev = ev_res.data[0]
    h = hours_until(ev)

    rsvp_res = supabase.table("event_rsvps").select("*").eq("event_id", event_id).eq("user_id", user_id).execute()
    rsvp = rsvp_res.data[0] if rsvp_res.data else None
    table_id = rsvp.get("table_id") if rsvp else None

    u = supabase.table("users").select("has_penalty").eq("user_id", user_id).execute()
    has_penalty = bool(u.data[0].get("has_penalty")) if u.data else False

    group = []
    if h <= 24:
        if table_id:
            g = supabase.table("event_rsvps").select("users(*)").eq("table_id", table_id).neq("user_id", user_id).execute()
        else:
            g = supabase.table("event_rsvps").select("users(*)").eq("event_id", event_id).neq("user_id", user_id).execute()
        # До ужина — карточки без PII (роль/теги). Имена/аватары — только когда уже встретились.
        reveal = h <= 0
        group = [public_card(r["users"], reveal_name=reveal) for r in (g.data or []) if r.get("users")]

    location_revealed = h <= 12
    
    # Check for review
    review = None
    if h < 0:
        rev_res = supabase.table("event_reviews").select("*").eq("event_id", event_id).eq("reviewer_id", user_id).execute()
        if rev_res.data:
            review = rev_res.data[0]

    return {
        "status": "success",
        "event": ev,
        "is_rsvped": _rsvp_registered(rsvp),
        "is_confirmed": bool(rsvp.get("is_confirmed")) if rsvp else False,
        "has_penalty": has_penalty,
        "hours_until": h,
        "group_revealed": h <= 24,
        "location_revealed": location_revealed,
        "group": group,
        "location_name": (ev.get("restaurant_name") or "Location TBA") if location_revealed else "Secret location",
        "location_address": ev.get("address") if location_revealed else None,
        "review": review,
    }


@app.get("/events/{event_id}/candidates")
async def event_candidates(event_id: str, user_id: str, uid: str = Depends(require_uid)):
    """Tablemates to review after the dinner."""
    assert_self(user_id, uid)
    rsvp_res = supabase.table("event_rsvps").select("table_id").eq("event_id", event_id).eq("user_id", user_id).execute()
    table_id = rsvp_res.data[0].get("table_id") if rsvp_res.data else None
    if table_id:
        res = supabase.table("event_rsvps").select("users(*)").eq("table_id", table_id).neq("user_id", user_id).execute()
    else:
        res = supabase.table("event_rsvps").select("users(*)").eq("event_id", event_id).neq("user_id", user_id).execute()
    # Ревью после ужина → имена нужны (уже встретились); до ужина — без PII.
    ev_t = supabase.table("events").select("event_date, start_time").eq("id", event_id).execute().data
    reveal = bool(ev_t) and hours_until(ev_t[0]) <= 0
    candidates = [public_card(r["users"], reveal_name=reveal) for r in (res.data or []) if r.get("users")]
    return {"status": "success", "candidates": candidates}


@app.post("/events/{event_id}/reviews")
async def submit_review(event_id: str, payload: dict, uid: str = Depends(require_uid)):
    try:
        reviewer_id = uid  # личность — из сессии
        liked = payload.get("liked_users", []) or []
        disliked = payload.get("disliked_users", []) or []
        review = {
            "event_id": event_id,
            "reviewer_id": reviewer_id,
            "rating": payload.get("rating"),
            "liked_users": liked,
            "disliked_users": disliked,
        }
        note = (payload.get("moderation_note") or "").strip()
        if note:
            review["moderation_note"] = note
            review["moderation_status"] = "open"
        supabase.table("event_reviews").upsert(review, on_conflict="event_id,reviewer_id").execute()

        # Лайки превращаются в подтверждённые связи.
        for liked_id in liked:
            supabase.table("matches").upsert({
                "event_id": event_id,
                "user_a_id": reviewer_id,
                "user_b_id": liked_id,
                "match_score": 100,
                "breakdown": {"source": "manual_feedback", "rating": payload.get("rating")},
            }, on_conflict="event_id,user_a_id,user_b_id").execute()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"[ERROR] reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
#  CONNECTIONS  (confirmed matches from past dinners)
# ============================================================
@app.post("/matches/feedback")
async def save_feedback(payload: dict, uid: str = Depends(require_uid)):
    try:
        if payload.get("status") == "yes":
            supabase.table("matches").upsert({
                "user_a_id": uid,
                "user_b_id": payload["target_id"],
                "event_id": payload["event_id"],
                "match_score": 1.0,
            }, on_conflict="event_id,user_a_id,user_b_id").execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/matches/confirmed")
async def get_confirmed_matches(user_id: str, uid: str = Depends(require_uid)):
    assert_self(user_id, uid)
    try:
        from matching.rerank import why_lines, icebreaker
        me_res = supabase.table("users").select("*").eq("user_id", user_id).execute()
        me = me_res.data[0] if me_res.data else {}

        res = supabase.table("matches").select(
            "user_b_id, users_b:users!matches_user_b_id_fkey(*)"
        ).eq("user_a_id", user_id).execute()
        confirmed = []
        for item in res.data:
            person = item.get("users_b")
            if not person:
                continue
            person = strip_internal(person)  # после матча — полный профиль, но без пароля/векторов
            # WHY-карточка + айсбрейкер (слой показа матча, §0.1)
            person["why"] = why_lines(me, person)
            person["icebreaker"] = icebreaker(me, person)
            confirmed.append(person)
        return {"status": "success", "matches": confirmed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
#  ADMIN  (token-gated, see admin_routes.py)
# ============================================================
from admin_routes import router as admin_router
app.include_router(admin_router)

# ============================================================
#  WHATSAPP  (Cloud API webhook + onboarding dialog, see wa/)
# ============================================================
from wa.webhook import router as wa_router
app.include_router(wa_router)
