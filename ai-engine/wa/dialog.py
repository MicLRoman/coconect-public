"""
WhatsApp-бот: онбординг-добор (ASK), lifecycle-ответы и фидбек.

Маршрутизация входящего:
  • юзера нет           → claim (опечатка номера) ИЛИ регистрация прямо в WA
                          (mode='register': имя → LinkedIn-кандидаты списком с
                          цифрами → город → профиль → ASK-онбординг). Прямой
                          заход в WA считается вариантом B A/B-теста.
  • онбординг не done   → стейт-машина шагов (wa_conversations.step/draft)
  • есть mode в wa_conversations → lifecycle-ответ:
      rsvp        — IN/OUT на «стол готов»
      confirm     — YES на T-24h
      feedback_l1 — первое впечатление (рейтинг+текст) → переход в feedback_l2
      feedback_l2 — кого хочешь видеть / кого нет → review + matches
  • иначе               → авто-детект pending-отзыва (как было) / already_done

mode ставит демон (wa.lifecycle) при отправке уведомления через set_mode().
Ядро ASK-онбординга (onboarding_step) переиспользует /onboarding/web_turn —
вариант C проходит тот же диалог прямо в чате сайта.
"""
import os
import asyncio
import logging
import threading

from database.database import get_supabase
from wa import send

logger = logging.getLogger(__name__)

# Ссылки юзеру ведут на ФРОНТЕНД (web-app), не на ai-engine.
WEB_URL = os.getenv("WEB_URL") or os.getenv("APP_URL", "https://coconect.app")

# «Claim profile»: незнакомому номеру показываем недавние НЕзавершённые регистрации
# (на случай опечатки номера на сайте). Окно — чтобы не светить имена кому попало.
CLAIM_WINDOW_MIN = int(os.getenv("WA_CLAIM_WINDOW_MIN", "60"))

import re
_PROMO_CODE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$")


def _looks_like_promo(t: str | None) -> bool:
    """Похоже на промокод: один токен 3–32 симв., буквы/цифры/-/_ (без пробелов)."""
    t = (t or "").strip()
    return bool(t) and " " not in t and bool(_PROMO_CODE_RE.match(t))


async def _try_redeem_promo(wa_id, phone, user, code) -> bool:
    """True — это был промокод (погашен или ошибка ПО САМОМУ коду). False — такого
    кода в базе нет → это просто слово, пусть обработает обычный роутинг."""
    try:
        from main import apply_internal_promo
        res = apply_internal_promo(user["user_id"], code, notify=False)
    except Exception as e:
        logger.error(f"[promo wa] redeem failed for {phone}: {e}")
        return False
    if not res.get("ok"):
        if res.get("not_found"):
            return False  # не промокод — не перехватываем
        send.send_text(wa_id, f"Hmm, that code didn't work. {res.get('error', 'Try another one')}.")
        return True
    tier = res.get("tier")
    when = f" until {str(res['expires_at'])[:10]}" if res.get("expires_at") else ""
    quota = res.get("quota")
    extra = f" You've got *{quota}* dinner(s) this cycle." if quota else ""
    send.send_text(wa_id, f"🎟️ Done, you're on *{tier}*{when}.{extra}[SPLIT]I'll message you here when the next dinner opens.")
    logger.info(f"[promo wa] {phone} redeemed -> {tier}")
    return True


def _sb():
    return get_supabase()


def _get_user(phone: str):
    res = _sb().table("users").select("user_id, name, onboarding_completed, lang").eq("phone", phone).execute()
    return res.data[0] if res.data else None


def _get_state(phone: str):
    res = _sb().table("wa_conversations").select("*").eq("phone", phone).execute()
    return res.data[0] if res.data else None


def set_mode(phone: str, mode: str, context: dict | None = None) -> None:
    """Демон (lifecycle) зовёт это при отправке уведомления, ждущего ответа."""
    _sb().table("wa_conversations").upsert(
        {"phone": phone, "mode": mode, "context": context or {}, "step": 0},
        on_conflict="phone",
    ).execute()


def _clear(phone: str) -> None:
    _sb().table("wa_conversations").delete().eq("phone", phone).execute()


# ВАЖНО: по ЦЕЛЫМ словам, а не подстрокам — иначе «in» ловится внутри «linkedin»,
# «building», «thinking» и т.п. (был баг: «my linkedin is obsolete» → ложное «да»).
_YES_WORDS = {"in", "yes", "yeah", "yep", "yup", "да", "go", "going", "confirm", "sure", "ok", "okay"}
_NO_WORDS = {"out", "no", "nope", "nah", "нет", "cant", "skip", "пропущу"}
_NO_PHRASES = ("can't", "не смогу", "не могу")


def _words(t: str) -> set:
    return set(re.findall(r"[a-zа-яё]+", (t or "").lower()))


def _yesish(t: str) -> bool:
    return bool(_words(t) & _YES_WORDS) or any(s in (t or "") for s in ("✅", "👍", "🙌")) or (t or "").strip() == "+"


def _noish(t: str) -> bool:
    tl = (t or "").lower()
    return bool(_words(t) & _NO_WORDS) or "👎" in tl or any(p in tl for p in _NO_PHRASES)


# «У меня нет LinkedIn / не хочу искать» → собираем профиль вручную по чату.
# Нужен явный намёк на linkedin ИЛИ короткая явная форма — чтобы не перехватывать
# обычное «no» (это на шаге pick значит «никто из них», а не «нет линкедина»).
_NO_LINKEDIN_RE = re.compile(r"\b(no|not|dont|don'?t|do not|haven'?t|without|skip|manual)\b[^.]*\blinked", re.I)
_NO_LINKEDIN_EXACT = {
    "no linkedin", "no li", "skip", "manually", "manual",
    "i don't have", "i dont have", "dont have", "don't have",
    "нет линкедина", "без линкедина", "нет ли", "вручную",
}


def _wants_manual(t: str | None) -> bool:
    t = (t or "").strip().lower()
    if not t or "linkedin.com" in t:  # пусто или это ссылка (не отказ)
        return False
    return bool(_NO_LINKEDIN_RE.search(t)) or t in _NO_LINKEDIN_EXACT


async def handle_incoming(wa_id: str, text: str | None = None, reply_id: str | None = None) -> None:
    if not wa_id:
        return

    from main import normalize_phone  # lazy
    phone = normalize_phone(wa_id) or wa_id

    user = _get_user(phone)
    if user is None:
        # Номер не распознан. Возможно — опечатка номера на сайте: предлагаем «claim»
        # (выбрать себя из недавних регистраций и перепривязать номер). Иначе —
        # регистрируем прямо здесь, в WhatsApp (вариант B A/B-теста).
        st = _get_state(phone)
        mode = (st or {}).get("mode")
        ctx = (st or {}).get("context") or {}
        if mode == "claim":
            return await _handle_claim(wa_id, phone, ctx, text, reply_id)
        if mode == "register":
            return await _handle_register(wa_id, phone, ctx, text, reply_id)
        return await _offer_claim_profile(wa_id, phone, text)

    lang = user.get("lang") or "ru"

    # ---------- ПРОМОКОД (в любой момент, набранный текстом) ----------
    # Только текст (не кнопки) и только если такой код реально есть в базе — иначе
    # обычное слово упадёт в стандартный роутинг (онбординг/идл).
    if not reply_id and _looks_like_promo(text) and await _try_redeem_promo(wa_id, phone, user, (text or "").strip()):
        return

    # ---------- ОНБОРДИНГ (не завершён) ----------
    if not user.get("onboarding_completed"):
        await _onboarding(wa_id, phone, user, lang, text)
        return

    # ---------- LIFECYCLE-ОТВЕТЫ (mode) ----------
    state = _get_state(phone)
    mode = (state or {}).get("mode")
    ctx = (state or {}).get("context") or {}
    answer = (text or reply_id or "").strip()

    if mode == "rsvp":
        return await _handle_rsvp(wa_id, phone, ctx, answer, lang)
    if mode == "confirm":
        return await _handle_confirm(wa_id, phone, ctx, answer, lang)
    if mode == "feedback_l1":
        return await _handle_feedback_l1(wa_id, phone, user, ctx, text, lang)
    if mode == "feedback_l2":
        return await _handle_feedback_l2(wa_id, phone, user, ctx, text, lang)

    # ---------- FALLBACK: авто-детект pending-отзыва (как было) ----------
    await _legacy_feedback_or_idle(wa_id, phone, user, lang, text)


# ============================================================
#  ONBOARDING
# ============================================================
# Поля профиля для персонализации диалога (LinkedIn-контекст). Без векторов/телефона.
_ONB_CTX_FIELDS = "name, city, domains, hard_skills, experience_level, education, current_status, linkedin_url"


def _onb_profile_ctx(user_id: str) -> str:
    """Краткая выжимка LinkedIn-профиля для персонализации онбординг-диалога."""
    try:
        r = _sb().table("users").select(_ONB_CTX_FIELDS).eq("user_id", user_id).execute().data
    except Exception:
        r = None
    u = r[0] if r else {}
    st = u.get("current_status") or {}
    role = st.get("type") or st.get("headline") or ""
    company = st.get("company_name") or ""
    parts = [f"Name: {u.get('name') or 'there'}"]
    if u.get("city"):
        parts.append(f"City: {u['city']}")
    # Маркер «give-сторона придёт из LinkedIn» — есть даже когда скрейп ещё в фоне и
    # роль/домены пусты. По нему онбординг понимает: спрашивать только ASK, не GIVE.
    if u.get("linkedin_url"):
        parts.append("LinkedIn: on file")
    if role or company:
        parts.append(f"Role: {role}{(' at ' + company) if company else ''}".strip())
    if u.get("domains"):
        parts.append("Domains: " + ", ".join(u["domains"][:5]))
    if u.get("hard_skills"):
        parts.append("Top skills: " + ", ".join(u["hard_skills"][:6]))
    if u.get("experience_level"):
        parts.append("Seniority: " + ", ".join(u["experience_level"][:2]))
    if u.get("education"):
        parts.append(f"Education: {u['education']}")
    return "\n".join(parts)


def onboarding_greeting_text(user_id: str, name: str = "there") -> str:
    """Персональное cold-приветствие (имя + LLM-опенер по LinkedIn).
    Для free-form (в окне) — готовый текст; для шаблона {{1}}=name, {{2}}=opener."""
    from llm_extract import onboarding_opener
    opener = onboarding_opener(_onb_profile_ctx(user_id), name)
    return f"Hi, {name}! 👋 {opener}"


def _onb_fallback_reply(draft: dict) -> str:
    """Если LLM недоступен (429) — простое ведение по недостающему блоку."""
    if not draft.get("the_build"):
        return "Tell me a bit about what you're building right now. What does your company actually do? 🙂"
    if not draft.get("the_ask"):
        return "Who are you hoping to meet at these dinners? Founders in your space, someone to hire, people who've scaled, investors? 👀"
    if not draft.get("the_give"):
        return "Flip side, what are you really good at? Where could you help someone stuck at your table?"
    if not draft.get("the_goal"):
        return "And what are you really after? Advice, partnerships, a co-founder, mentors, or just good conversation? ✨"
    return "Anything else important we should know about you, or the kind of people you click with?"


# ============================================================
#  CLAIM PROFILE — опечатка номера на сайте: привязать профиль к этому WhatsApp
# ============================================================
def _claim_label(u: dict) -> str:
    """Имя + первая буква фамилии (минимизируем раскрытие): 'Abhiroop V.'"""
    parts = (u.get("name") or "Someone").split()
    out = parts[0] + (f" {parts[1][0]}." if len(parts) > 1 else "")
    return out[:24]


def _recent_unclaimed(exclude_phone: str) -> list[dict]:
    """Недавние НЕзавершённые регистрации (для claim). Только onboarding_completed=false
    и за окно CLAIM_WINDOW_MIN — чтобы нельзя было перебирать всех и угонять профили."""
    from datetime import datetime, timezone, timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=CLAIM_WINDOW_MIN)).isoformat()
    rows = (_sb().table("users").select("user_id, name, phone, created_at")
            .eq("onboarding_completed", False).gte("created_at", cutoff)
            .order("created_at", desc=True).limit(5).execute().data) or []
    # не показываем профиль, у которого номер уже совпадает с этим (на всякий случай)
    return [u for u in rows if u.get("phone") != exclude_phone and (u.get("name") or "").strip()]


def _match_claim_name(text: str | None, cands: list[dict]) -> str | None:
    """Юзер написал имя текстом → ищем среди кандидатов ОДНОЗНАЧНОЕ совпадение по имени.
    strong = все слова имени есть в тексте (или имя целиком); weak = только имя (first name).
    Возвращаем user_id только если совпадение единственное — иначе None (покажем список)."""
    t = " ".join((text or "").lower().split())
    if not t:
        return None
    words = set(re.findall(r"[a-zа-яё0-9]+", t))
    strong, weak = [], []
    for u in cands:
        name = " ".join((u.get("name") or "").lower().split())
        toks = [w for w in name.split() if len(w) >= 2]
        if not toks:
            continue
        if name in t or all(tok in words for tok in toks):
            strong.append(u["user_id"])
        elif toks[0] in words:
            weak.append(u["user_id"])
    if len(strong) == 1:
        return strong[0]
    if not strong and len(weak) == 1:
        return weak[0]
    return None


async def _claim_link(wa_id, phone, uid) -> None:
    """Перепривязываем профиль uid к этому WhatsApp и продолжаем онбординг.
    Общая точка для тапа по списку И для матча по набранному имени."""
    tgt = (_sb().table("users").select("user_id, name, onboarding_completed")
           .eq("user_id", uid).execute().data)
    if not tgt:
        _clear(phone)
        return await _start_registration(wa_id, phone)
    tgt = tgt[0]
    if tgt.get("onboarding_completed"):
        # завершённый профиль не отдаём через self-service — во избежание угона
        _clear(phone)
        send.send_text(wa_id, "That profile's already set up ✅ If it's yours, ping us at hello@coconect.io and we'll sort it.")
        return
    _sb().table("users").update({"phone": phone}).eq("user_id", uid).execute()
    _clear(phone)
    logger.info(f"[claim] {phone} claimed profile {uid} (phone relinked)")
    await _kick_onboarding(wa_id, phone, tgt, prefix=f"Got you, {(tgt.get('name') or 'there').split()[0]}! ✅ Linked this WhatsApp to your profile. ")


# Предзаполненный текст кнопки «сразу в WhatsApp» с сайта (вариант B) — явный
# интент регистрации: минуем claim-список, сразу спрашиваем имя.
_REG_INTENT_RE = re.compile(r"love to join the dinners|join the dinners", re.I)


async def _offer_claim_profile(wa_id, phone, text: str | None = None) -> None:
    """Незнакомый номер → если есть свежие незавершённые регистрации, предлагаем выбрать
    себя (опечатка номера). Если юзер СРАЗУ написал имя — матчим и линкуем без списка.
    Нет claim-кандидатов (или пришёл с сайта варианта B) → регистрируем прямо в WhatsApp."""
    if text and _REG_INTENT_RE.search(text):
        return await _start_registration(wa_id, phone)
    recents = _recent_unclaimed(phone)
    if not recents:
        return await _start_registration(wa_id, phone)
    # Юзер уже написал имя+фамилию? Привязываем сразу, минуя список.
    uid = _match_claim_name(text, recents)
    if uid:
        logger.info(f"[claim] {phone} auto-matched name -> {uid}")
        return await _claim_link(wa_id, phone, uid)
    rows = [(u["user_id"], _claim_label(u)) for u in recents]
    rows.append(("CLAIM_NONE", "I'm new / not listed"))
    send.send_list(
        wa_id,
        "Hey 👋 I don't recognize this number yet.\n\n"
        "If you just signed up on coconect.io, type your *name* (first + last) and I'll link it. "
        "Or tap it below 👇",
        "Pick your name",
        rows,
    )
    set_mode(phone, "claim", {
        "candidates": [u["user_id"] for u in recents],
        "names": {u["user_id"]: (u.get("name") or "") for u in recents},
    })


async def _handle_claim(wa_id, phone, ctx, text, reply_id) -> None:
    answer = (reply_id or text or "").strip()
    candidates = ctx.get("candidates") or []
    names = ctx.get("names") or {}

    # 1) тапнул строку списка
    if answer in candidates:
        return await _claim_link(wa_id, phone, answer)
    # 2) явное «меня тут нет» → он новый, регистрируем прямо здесь
    if answer == "CLAIM_NONE":
        _clear(phone)
        return await _start_registration(wa_id, phone)
    # 3) написал имя текстом → матчим по имени (до noish, т.к. имя может содержать 'no' и т.п.)
    if text and text.strip():
        cands = [{"user_id": i, "name": names.get(i, "")} for i in candidates]
        uid = _match_claim_name(text, cands)
        if uid:
            return await _claim_link(wa_id, phone, uid)
    # 4) отказ / не распознали
    if _noish(answer):
        _clear(phone)
        return await _start_registration(wa_id, phone)
    send.send_text(wa_id, "Type your *name* (first + last) and I'll find you. Or tap it from the list above (or pick *I'm new*).")


# ============================================================
#  WA-РЕГИСТРАЦИЯ (вариант B A/B-теста) — весь signup прямо в WhatsApp:
#  имя → поиск LinkedIn → кандидаты ТЕКСТОМ с цифрами (выбор цифрой/словами,
#  матчим алгоритмом + LLM) → город → создаём профиль → ASK-онбординг.
# ============================================================
# Города с запущенным флоу — как APPROVED_CITIES на сайте (HeroSignupChat).
APPROVED_CITIES = [c.strip().lower() for c in os.getenv("WA_APPROVED_CITIES", "toronto").split(",") if c.strip()]


def _city_approved(city: str) -> bool:
    c = (city or "").strip().lower()
    return any(a in c for a in APPROVED_CITIES)


def _log_wa_lead(phone: str, step: str, **fields) -> None:
    """Регистрация в WA пишет те же лиды, что и сайт (для общей воронки).
    lead_id стабилен по номеру; source='wa'; variant='b' — прямой заход в
    WhatsApp по договорённости считается вариантом B (сайт → сразу в WA)."""
    try:
        from datetime import datetime, timezone
        row = {
            "lead_id": f"wa_{phone.lstrip('+')}", "step": step, "phone": phone,
            "source": "wa", "variant": "b",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        row.update({k: v for k, v in fields.items() if v})
        _sb().table("leads").upsert(row, on_conflict="lead_id").execute()
    except Exception as e:
        logger.warning(f"[wa reg] lead log failed for {phone}: {e}")


def _defer_thread(fn, *args) -> None:
    """Фон для тяжёлого (LLM-добор) из sync-контекста регистрации."""
    threading.Thread(target=fn, args=args, daemon=True).start()


# Развилка ПОСЛЕ имени: тянуть бэкграунд из LinkedIn или собрать по чату.
LINKEDIN_BUTTONS = [("LI_YES", "✅ I've got one"), ("LI_NO", "Do it without")]


async def _start_registration(wa_id, phone) -> None:
    """Незнакомый номер без claim-кандидатов → регистрируем прямо здесь.
    Сначала имя, потом развилка про LinkedIn (см. _reg_ask_linkedin)."""
    _log_wa_lead(phone, "visit")
    send.send_text(wa_id, "Hey! 👋 *What's your full name?*")
    set_mode(phone, "register", {"reg_step": "name"})


# Похоже, юзер СПРОСИЛ, а не ответил (вопрос/оффтоп посреди регистрации).
_Q_STARTS = ("how", "what", "why", "when", "who", "which", "is", "are", "can", "do", "does",
             "как", "что", "почему", "сколько", "зачем")
_Q_PHRASES = ("how much", "how does", "is it", "are you", "can i", "can you", "do you", "what's",
              "whats", "wtf", "wdym", "что это", "как это", "это что")


def _is_question(t: str | None) -> bool:
    t = (t or "").strip().lower()
    if not t:
        return False
    if "?" in t:
        return True
    first = t.split()[0] if t.split() else ""
    return first in _Q_STARTS or any(f" {p} " in f" {t} " for p in _Q_PHRASES)


_REG_DATA_STEPS = {"name", "lastname", "has_linkedin", "pick", "linkedin", "city"}
_REG_STEP_ASK = {
    "name": "ask for their full name",
    "lastname": "ask for their last name",
    "has_linkedin": "ask if they have a LinkedIn we can pull their background from, or want to set it up without it",
    "pick": "ask which of the people listed is them (just the number), or to paste their LinkedIn URL",
    "linkedin": "ask them to paste their LinkedIn URL, or say they don't have one",
    "city": "ask which city they're in",
}
_REG_STEP_FALLBACK = {
    "name": "Good q 🙂 So, what's your full name?",
    "lastname": "And your last name?",
    "has_linkedin": "So, got a LinkedIn we can pull from? Or we set it up without it.",
    "pick": "So which one's you, just the number? Or paste your LinkedIn URL.",
    "linkedin": "Paste your LinkedIn URL, or say 'no linkedin' and we'll do it here.",
    "city": "So, which city are you in?",
}


async def _handle_register(wa_id, phone, ctx, text, reply_id) -> None:
    step = ctx.get("reg_step") or "name"
    answer = (text or "").strip()
    if not answer and not reply_id:
        send.send_text(wa_id, "Just type it as a message 🙏")
        return
    # Люди спрашивают что угодно посреди регистрации → отвечаем из фактов Coconect и НЕ
    # ломаем шаг (не парсим вопрос как имя/город). Кнопки (reply_id) не перехватываем.
    if not reply_id and _is_question(text) and step in _REG_DATA_STEPS:
        from llm_extract import host_line
        line = host_line(f"Answer their question, then {_REG_STEP_ASK[step]}.",
                         _REG_STEP_FALLBACK[step], user_msg=text)
        send.send_text(wa_id, line)
        return

    if step == "name":
        parts = answer.split()
        if len(parts) >= 2:
            first, last = parts[0], " ".join(parts[1:])
            _log_wa_lead(phone, "surname", first_name=first, last_name=last)
            return await _reg_ask_linkedin(wa_id, phone, ctx, first, last)
        _log_wa_lead(phone, "name", first_name=answer)
        set_mode(phone, "register", {**ctx, "reg_step": "lastname", "first_name": answer})
        send.send_text(wa_id, f"Hey, {answer} 🙌 and your last name?")
        return

    if step == "lastname":
        first = ctx.get("first_name") or ""
        _log_wa_lead(phone, "surname", first_name=first, last_name=answer)
        return await _reg_ask_linkedin(wa_id, phone, ctx, first, answer)

    if step == "has_linkedin":
        from linkedin_search import normalize_linkedin_url
        ans = (reply_id or text or "").strip()
        first = ctx.get("first_name") or ""
        last = ctx.get("last_name") or ""
        # вставил ссылку сразу → берём как LinkedIn
        if text and "linkedin.com" in text.lower():
            url = normalize_linkedin_url(text)
            if url:
                return await _reg_linkedin_chosen(wa_id, phone, ctx, url)
        # без LinkedIn → сразу город (профиль соберём по чату)
        if ans == "LI_NO" or _wants_manual(ans) or _noish(ans):
            set_mode(phone, "register", {**ctx, "reg_step": "city", "no_linkedin": True, "linkedin": None})
            send.send_text(wa_id, "No worries. *Which city are you in?*")
            return
        # с LinkedIn → ищем по уже известному имени
        if ans == "LI_YES" or _yesish(ans):
            return await _reg_search(wa_id, phone, ctx, first, last)
        send.send_buttons(wa_id, "Got a LinkedIn? I'll pull your background from it, or we set it up without.", LINKEDIN_BUTTONS)
        return

    if step == "pick":
        from linkedin_search import normalize_linkedin_url
        # прислал ссылку прямо на шаге выбора → принимаем как ручной ввод
        if "linkedin.com" in answer.lower():
            url = normalize_linkedin_url(answer)
            if url:
                return await _reg_linkedin_chosen(wa_id, phone, ctx, url)
        # «нет линкедина / никого из них нет» → собираем профиль по чату
        if _wants_manual(answer):
            return await _reg_go_manual(wa_id, phone, ctx)
        cands = ctx.get("candidates") or []
        from llm_extract import match_candidate_choice
        idx = await asyncio.to_thread(match_candidate_choice, answer, cands)
        if idx is None:
            send.send_text(wa_id, f"Just the number of the one that's you (*1-{len(cands)}*), or paste your LinkedIn URL.")
            return
        if idx < 0:
            set_mode(phone, "register", {**ctx, "reg_step": "linkedin"})
            send.send_text(wa_id, "All good. Paste your *LinkedIn URL*, or reply *no linkedin* and we'll set it up right here 👇")
            return
        c = cands[idx]
        head = f", {c['headline']}" if c.get("headline") else ""
        send.send_text(wa_id, f"Got you 🙌 *{c['name']}*{head} ✅")
        # headline есть уже сейчас (из поиска) → сохраняем для персонализации первого
        # вопроса, чтобы задать его СРАЗУ, не дожидаясь полного скрейпа.
        return await _reg_linkedin_chosen(wa_id, phone, {**ctx, "headline": c.get("headline") or ""}, c["profileUrl"])

    if step == "linkedin":
        from linkedin_search import normalize_linkedin_url
        if _wants_manual(answer):
            return await _reg_go_manual(wa_id, phone, ctx)
        url = normalize_linkedin_url(answer)
        if not url:
            send.send_text(wa_id, "Hmm, that doesn't look like a LinkedIn link. Send it like *linkedin.com/in/yourname*, or reply *no linkedin* and we'll do it here.")
            return
        return await _reg_linkedin_chosen(wa_id, phone, ctx, url)

    if step == "city":
        return await _reg_city(wa_id, phone, ctx, answer)

    # стейт разъехался — начинаем заново
    return await _start_registration(wa_id, phone)


async def _reg_ask_linkedin(wa_id, phone, ctx, first: str, last: str) -> None:
    """Имя есть → развилка: подтянуть бэкграунд из LinkedIn или собрать по чату (без него)."""
    set_mode(phone, "register", {**ctx, "reg_step": "has_linkedin", "first_name": first, "last_name": last})
    send.send_buttons(
        wa_id,
        f"Nice to meet you, {first} 🙌 Got a LinkedIn? I'll pull your background from it so you barely have to type. "
        "Or we can set it up without it.",
        LINKEDIN_BUTTONS,
    )


async def _reg_search(wa_id, phone, ctx, first: str, last: str) -> None:
    """Поиск LinkedIn по имени → кандидаты ТЕКСТОМ с цифрами (как карточки на сайте)."""
    send.send_text(wa_id, "Cool, let me find you on LinkedIn real quick 🔍")
    try:
        from linkedin_search import search_people
        found = await asyncio.to_thread(search_people, first, last)
    except Exception as e:
        logger.error(f"[wa reg] linkedin search failed: {e}")
        found = []
    base = {**ctx, "first_name": first, "last_name": last}
    if not found:
        set_mode(phone, "register", {**base, "reg_step": "linkedin"})
        send.send_text(wa_id, "Hmm, couldn't find you automatically. Paste your *LinkedIn URL*, or reply *no linkedin* and we'll build it right here in chat 🙏")
        return
    lines = []
    for i, c in enumerate(found):
        line = f"*{i + 1}.* {c['name']}"
        if c.get("headline"):
            line += f", {c['headline']}"
        if c.get("location"):
            line += f" ({c['location']})"
        lines.append(line)
    if len(found) == 1:
        header = "Found you on LinkedIn 👇"
        footer = "That you? Reply *1*, or paste your LinkedIn URL if not."
    else:
        header = f"Found {len(found)} people with a similar name 👇"
        footer = f"Which one's you? Reply with the number (*1-{len(found)}*), or paste your LinkedIn URL if none match."
    set_mode(phone, "register", {**base, "reg_step": "pick", "candidates": found})
    send.send_text(wa_id, header + "\n\n" + "\n".join(lines) + "\n\n" + footer)


async def _reg_go_manual(wa_id, phone, ctx) -> None:
    """Нет LinkedIn → профиль собираем прямо в чате. Спрашиваем только город, затем
    создаём «пустой» профиль и уходим в ASK-онбординг (он же достроит GIVE/ASK, а
    структурные поля добираем из стенограммы на финише — _complete_onboarding)."""
    _log_wa_lead(phone, "no_linkedin")
    set_mode(phone, "register", {**ctx, "reg_step": "city",
                                 "no_linkedin": True, "linkedin": None, "candidates": []})
    send.send_text(wa_id, "No worries, we'll set it up right here. *Which city are you in?*")


async def _reg_linkedin_chosen(wa_id, phone, ctx, url: str) -> None:
    _log_wa_lead(phone, "linkedin", linkedin=url,
                 first_name=ctx.get("first_name"), last_name=ctx.get("last_name"))
    # Повторка: этот LinkedIn уже зарегистрирован (возможно, на другой номер).
    dup = _sb().table("users").select("user_id").eq("linkedin_url", url).limit(1).execute().data
    if dup:
        _clear(phone)
        send.send_text(wa_id, "Looks like this profile is already registered 🤔 If that's you, ping us at hello@coconect.io and we'll link it to this number.")
        return
    set_mode(phone, "register", {**ctx, "reg_step": "city", "linkedin": url, "candidates": []})
    send.send_text(wa_id, "Last one, *which city are you in?*")


async def _reg_city(wa_id, phone, ctx, city: str) -> None:
    _log_wa_lead(phone, "city", city=city)
    if not _city_approved(city):
        _clear(phone)
        send.send_text(
            wa_id,
            f"We're not live in {city} yet, but you can change that. "
            f"Coconect launches where there's a crowd, so invite a few friends and we'll open your city.\n{WEB_URL}",
        )
        return
    first = (ctx.get("first_name") or "").strip()
    last = (ctx.get("last_name") or "").strip()
    full_name = f"{first} {last}".strip()
    url = ctx.get("linkedin")
    manual = bool(ctx.get("no_linkedin"))
    headline = (ctx.get("headline") or "").strip()
    # Профиль заводим СРАЗУ, без ожидания медленного скрейпа LinkedIn: из имени+headline
    # (есть user_id + слабый give_vector, юзер уже matchable). Полный скрейп уходит в ФОН
    # и дообогащает (give_vector/домены/скиллы) — юзер тем временем отвечает на вопрос,
    # а не смотрит на «...жду минутку».
    seed_profile = {"headline": headline} if (url and headline) else {}
    try:
        from main import create_profile_from_linkedin  # lazy (как остальные импорты из main)
        out = await asyncio.to_thread(
            create_profile_from_linkedin,
            full_name, phone, city, url, seed_profile,
            "en", "b", _defer_thread, False,  # variant='b', без WA-шаблона (юзер уже здесь)
        )
    except Exception as e:
        logger.error(f"[wa reg] profile create failed for {phone}: {e}")
        send.send_text(wa_id, "Something went wrong on my side 😅 Send me your city one more time?")
        return
    _log_wa_lead(phone, "done")
    _clear(phone)  # регистрация закончена; ASK-онбординг сеет свой стейт
    # Полный LinkedIn-скрейп в фоне (медленный) → дообогащаем профиль. give_vector он
    # перезапишет полным, ask_vector (из ответа юзера) не трогает → гонки безопасны.
    if url and not manual:
        _defer_thread(_enrich_linkedin_bg, out["user_id"], full_name, phone, city, url)
    user = _get_user(phone) or {"user_id": out["user_id"], "name": out["name"]}
    # Опенер сам персональный вопрос → без дублирующей преамбулы (для manual — тёплый ack).
    prefix = "Great, you're in ✅ " if manual else ""
    await _kick_onboarding(wa_id, phone, user, prefix=prefix)


def _enrich_linkedin_bg(user_id, full_name, phone, city, url) -> None:
    """Фон: медленный скрейп LinkedIn → дообогащаем уже созданный профиль (полный
    give_vector/домены/скиллы/опыт). Юзер в это время уже отвечает на вопрос."""
    try:
        from linkedin_search import scrape_profile
        profile = scrape_profile(url)
        if not profile:
            return
        from main import create_profile_from_linkedin
        # defer=None → бэкфилл доменов делаем прямо здесь (мы и так в фоне).
        create_profile_from_linkedin(full_name, phone, city, url, profile, "en", "b", None, False)
        logger.info(f"[wa reg] linkedin enrich done for {user_id}")
    except Exception as e:
        logger.error(f"[wa reg] linkedin enrich failed for {user_id}: {e}")


def seed_onboarding_opener(phone, user, prefix: str = "") -> str:
    """Персональный опенер + СЕЕМ историю — ответ юзера продолжит онбординг
    (LLM увидит, что вопрос уже задан, и не начнёт заново). Возвращает текст;
    отправка — на вызывающем (WA шлёт, веб-чат показывает)."""
    first = (user.get("name") or "there").split()[0]
    ctx = _onb_profile_ctx(user["user_id"])
    try:
        from llm_extract import onboarding_opener
        opener = onboarding_opener(ctx, first)
    except Exception:
        has_li = any(k in ctx for k in ("LinkedIn: on file", "Role:", "Domains:", "Top skills:", "Seniority:"))
        opener = ("Who'd be great for you to meet at the table, and what could you use right now? "
                  "(intros, a hire, first users, investors...)"
                  if has_li else "Real quick so I get you right: what do you do, and what are you best at?")
    # opener уже сам вопрос (короткий онбординг) → не дублируем преамбулой.
    msg = f"{prefix}{opener}"
    _sb().table("wa_conversations").upsert(
        {"phone": phone, "step": 0, "mode": None, "context": {},
         "draft": {"history": [{"role": "assistant", "text": msg}], "raw": []}},
        on_conflict="phone",
    ).execute()
    return msg


async def _kick_onboarding(wa_id, phone, user, prefix: str = "") -> None:
    send.send_text(wa_id, seed_onboarding_opener(phone, user, prefix))


async def onboarding_step(phone, user, text, depth: str = "short") -> dict:
    """ОДИН ход ASK-онбординга без отправки — общее ядро для WhatsApp (_onboarding)
    и чата сайта (вариант C, /onboarding/web_turn; стейт общий, в wa_conversations).
    depth='short' — быстрый (WA): ASK, +GIVE если нет LinkedIn. depth='deep' — полный
    5-блочный (веб-C / «дозаполнить профиль»). Возвращает {'reply', 'done'}."""
    state = _get_state(phone)
    if not state:
        _sb().table("wa_conversations").insert({"phone": phone, "step": 0, "draft": {}}).execute()
        state = {"draft": {}}

    draft = state.get("draft") or {}
    history = draft.get("history") or []
    raw = draft.get("raw") or []
    user_msg = (text or "").strip()
    if user_msg:
        raw.append(user_msg)

    ctx = _onb_profile_ctx(user["user_id"])
    city = ((ctx.split("City: ", 1)[1].split("\n", 1)[0]) if "City: " in ctx else "your city")

    turn, llm_ok = {}, False
    try:
        from llm_extract import onboarding_turn
        turn = onboarding_turn(ctx, history, user_msg, city=city, depth=depth)
        llm_ok = bool(turn.get("reply"))
    except Exception as e:
        logger.warning(f"[onboarding] LLM turn failed: {e}")

    # слить извлечённые сигналы в draft
    for k in ("the_build", "the_ask", "the_give", "the_goal", "extra", "match_type", "intent_tag", "communication_style"):
        v = turn.get(k)
        if v:
            draft[k] = v

    reply = turn.get("reply") if llm_ok else _onb_fallback_reply(draft)
    # Онбординг общий с веб-чатом (web_turn): маркер пузырей [SPLIT] там показался бы
    # буквально. В WA он не нужен (по одному вопросу за ход) → просто вычищаем.
    if reply and "[SPLIT]" in reply:
        reply = " ".join(reply.replace("[SPLIT]", " ").split())

    # история (ограничим, чтобы промпт не разбухал)
    if user_msg:
        history.append({"role": "user", "text": user_msg})
    if reply:
        history.append({"role": "assistant", "text": reply})
    draft["history"] = history[-14:]
    draft["raw"] = raw[-8:]
    _sb().table("wa_conversations").update({"draft": draft}).eq("phone", phone).execute()

    # финал: LLM сказал done, ЛИБО LLM лежит и юзер дал достаточно ответов.
    # Фолбэк-порог зависит от глубины: короткий — 1 ответ если есть LinkedIn, 2 если нет;
    # глубокий (веб-C) — как раньше, ≥4.
    has_li = any(k in ctx for k in ("LinkedIn: on file", "Role:", "Domains:", "Top skills:", "Seniority:"))
    if depth == "deep":
        done = bool(turn.get("done")) or (not llm_ok and len(raw) >= 4)
    else:
        # короткий: LLM ЖИВОЙ → доверяем его "done" (он сам решит, когда закруглиться,
        # и не оборвёт ответ на встречный вопрос юзера — агент остаётся живым). Промпт
        # велит ставить done после пойманного ASK (+GIVE). Сигнал/счётчик — ТОЛЬКО фолбэк,
        # если LLM лёг (иначе онбординг завис бы навсегда).
        got = bool(draft.get("the_ask")) and (has_li or bool(draft.get("the_give")))
        done = bool(turn.get("done")) or (not llm_ok and (got or len(raw) >= (2 if has_li else 3)))
    if done:
        _complete_onboarding(phone, user, draft)
        _log_wa_lead(phone, f"onb_done_{depth}")  # метрика: short vs deep completion
    return {"reply": reply, "done": done}


# Один лёгкий тизер за онбординг (не после каждого хода). Мощный «метч» — в конце
# (см. _send_match_reward), перед инвайтом на ужин.
_MAX_TEASERS = int(os.getenv("WA_MAX_TEASERS", "1"))


def _profile_city(user_id: str) -> str:
    try:
        r = _sb().table("users").select("city").eq("user_id", user_id).execute().data
        return (r[0].get("city") if r else "") or ""
    except Exception:
        return ""


def _maybe_send_teaser(wa_id, phone, user) -> None:
    """Sync (зовём через to_thread): ОДИН раз за онбординг, после первого содержательного
    сигнала (что делает / в чём силён / кого ищет) — лёгкий пузырь про реального
    анонимного человека. Не после каждого хода. Счётчик в context."""
    try:
        st = _get_state(phone) or {}
        draft = st.get("draft") or {}
        ctx = st.get("context") or {}
        if int(ctx.get("teaser_count") or 0) >= _MAX_TEASERS:
            return
        # первый содержательный сигнал: сначала GIVE («в чём силён»), иначе build/ask
        focus = draft.get("the_give") or draft.get("the_build") or draft.get("the_ask") or ""
        if not focus:
            return
        from teasers import peer_teaser
        line = peer_teaser(user["user_id"], _profile_city(user["user_id"]), focus)
        if not line:
            return
        send.send_text(wa_id, line)
        _sb().table("wa_conversations").update(
            {"context": {**ctx, "teaser_count": 1}}
        ).eq("phone", phone).execute()
        logger.info(f"[teaser] sent to {phone}")
    except Exception as e:
        logger.warning(f"[teaser] send failed for {phone}: {e}")


def _send_match_reward(wa_id, user) -> None:
    """Sync (через to_thread): в конце онбординга кидаем ОДИН реальный анонимный метч
    (приоритет — кто идёт на ужин) как вознаграждение «пока стол собирается».
    Та же логика, что и веб-«История» (см. teasers.reward_line_for)."""
    from teasers import reward_line_for
    line = reward_line_for(user["user_id"], _profile_city(user["user_id"]))
    if line:
        send.send_text(wa_id, line)
        logger.info(f"[match reward] sent to {user.get('user_id')}")


async def _onboarding(wa_id, phone, user, lang, text):
    out = await onboarding_step(phone, user, text)
    if out.get("reply"):
        send.send_text(wa_id, out["reply"])
    # «Прикол» между этапами: реальный анонимный человек, которого можно встретить.
    # Только WhatsApp (в веб-чате не шлём), максимум пару раз за онбординг.
    if not out.get("done"):
        await asyncio.to_thread(_maybe_send_teaser, wa_id, phone, user)
    if out.get("done"):
        from main import lk_link
        lk = lk_link(user["user_id"])
        send.send_text(
            wa_id,
            f"You're all set 🎉 Building your table now.\n{lk}[SPLIT]"
            "Want an even sharper table? Finish your full profile in your dashboard any time. "
            "Pin this chat so you don't lose it 🙌",
        )
        # Вознаграждение: реальный метч (по векторам), приоритет — кто идёт на ужин.
        await asyncio.to_thread(_send_match_reward, wa_id, user)
        # Сразу предлагаем ближайший субботний ужин: go/no-go (один раз, на онбординге).
        await _offer_next_dinner(wa_id, phone, user)


def _complete_onboarding(phone, user, draft, mark_deep: bool = False):
    from embeddings import generate_ask_vector_smart, get_embedding
    from llm_extract import extract_ask_signals

    the_build = draft.get("the_build", "")
    the_ask = draft.get("the_ask", "")
    the_give = draft.get("the_give", "")
    the_goal = draft.get("the_goal", "")
    extra = draft.get("extra", "")
    # ASK-сторона матчинга = что человек СТРОИТ + кого ХОЧЕТ встретить + цель + контекст.
    ask_parts = [p for p in (the_build, the_ask, the_goal, extra) if p]
    combined_raw = " | ".join(ask_parts) or " ".join(draft.get("raw") or [])

    cs = draft.get("communication_style")
    mt = draft.get("match_type")
    it = draft.get("intent_tag")
    if not (cs and mt and it):  # добор недостающего одним вызовом
        sig = extract_ask_signals(combined_raw)
        cs = cs or sig["communication_style"]
        mt = mt or sig["match_type"]
        it = it or sig["intent_tag"]

    patch = {
        "intent_goals": [the_goal] if the_goal else [],
        "communication_style": cs or "casual",
        "match_type": mt or "peer",
        "intent_tag": it or "peer_network",
        "custom_request_raw": combined_raw,
    }
    # Эмбеддинг может упасть (429 на embedding-модели и т.п.) — НЕ роняем весь онбординг
    # из-за этого: без вектора матч слабее, но профиль всё равно завершается.
    try:
        patch["ask_vector"] = generate_ask_vector_smart(patch)
    except Exception as e:
        logger.error(f"[onboarding] ask_vector build failed (embeddings?): {e}")

    # THE GIVE — чем человек полезен, своими словами → подмешиваем в give-вектор
    # (на web_start give построен из LinkedIn; усиливаем прямой формулировкой).
    if the_give:
        try:
            gv_new = get_embedding(the_give)
            cur = _sb().table("users").select("give_vector").eq("user_id", user["user_id"]).execute()
            gv_old = cur.data[0].get("give_vector") if cur.data else None
            if isinstance(gv_old, str):
                import json as _json
                try:
                    gv_old = _json.loads(gv_old)
                except Exception:
                    gv_old = None
            if gv_new and isinstance(gv_old, list) and len(gv_old) == len(gv_new):
                patch["give_vector"] = [(a + b) / 2 for a, b in zip(gv_old, gv_new)]
            elif gv_new:
                patch["give_vector"] = gv_new
        except Exception as e:
            logger.warning(f"[onboarding] give blend failed: {e}")

    # Профиль без LinkedIn: домены/скиллы/сеньорность/статус неоткуда взять, кроме
    # самого чата → достраиваем одним LLM-вызовом (иначе матчинг/тизеры пустые).
    try:
        cur = (_sb().table("users")
               .select("linkedin_url, domains, hard_skills, experience_level, current_status")
               .eq("user_id", user["user_id"]).execute().data)
        cur = cur[0] if cur else {}
        if not cur.get("linkedin_url") and not cur.get("domains"):
            from llm_extract import extract_profile_from_chat
            transcript = " ".join(p for p in (the_build, the_give, the_ask, the_goal, extra) if p) \
                or " ".join(draft.get("raw") or [])
            prof = extract_profile_from_chat(transcript)
            if prof.get("domains"):
                patch["domains"] = prof["domains"]
            if prof.get("hard_skills") and not cur.get("hard_skills"):
                patch["hard_skills"] = prof["hard_skills"]
            if prof.get("experience_level") and not cur.get("experience_level"):
                patch["experience_level"] = prof["experience_level"]
            if prof.get("current_status", {}).get("type") and not cur.get("current_status"):
                patch["current_status"] = prof["current_status"]
    except Exception as e:
        logger.warning(f"[onboarding] no-linkedin profile enrich failed: {e}")

    patch["onboarding_completed"] = True
    if mark_deep:
        patch["deep_onboarding_completed"] = True
    try:
        _sb().table("users").update(patch).eq("user_id", user["user_id"]).execute()
    except Exception as e:
        # Колонка deep_onboarding_completed ещё не накатана в БД — не роняем завершение
        # онбординга из-за отсутствующего флага (тот же паттерн, что ab_variant в main.py).
        if mark_deep and "deep_onboarding_completed" in str(e) and patch.pop("deep_onboarding_completed", None) is not None:
            logger.warning("[onboarding] users.deep_onboarding_completed missing (run: ALTER TABLE users ADD COLUMN deep_onboarding_completed boolean NOT NULL DEFAULT false) — saved without flag")
            _sb().table("users").update(patch).eq("user_id", user["user_id"]).execute()
        else:
            raise
    _clear(phone)


async def _offer_next_dinner(wa_id, phone, user) -> None:
    """Привязываем юзера к ближайшему субботнему ивенту его города и спрашиваем IN/OUT.
    Это единственная точка явного opt-in — дальше демон шлёт только анонс/адрес."""
    try:
        row = _sb().table("users").select("city").eq("user_id", user["user_id"]).execute().data
        city = (row[0].get("city") if row else None) or ""
        from wa.lifecycle import ensure_saturday_event, RSVP_BUTTONS
        ev = ensure_saturday_event(city)
        if not ev:
            return  # нет города — ужин предложим позже (демон), молчим
        # уже записан? переиспользуем RSVP, иначе создаём pending
        existing = (_sb().table("event_rsvps").select("id, preferences")
                    .eq("event_id", ev["id"]).eq("user_id", user["user_id"]).execute().data)
        if existing:
            rsvp_id = existing[0]["id"]
            prefs = existing[0].get("preferences") or {}
            _sb().table("event_rsvps").update(
                {"preferences": {**prefs, "invited": True}}
            ).eq("id", rsvp_id).execute()
        else:
            ins = (_sb().table("event_rsvps")
                   .insert({"user_id": user["user_id"], "event_id": ev["id"],
                            "status": "pending", "preferences": {"invited": True}})
                   .execute().data)
            rsvp_id = ins[0]["id"] if ins else None
        if not rsvp_id:
            return
        d = str(ev.get("event_date", ""))
        msg = (
            "One more thing 👇\n\n"
            f"*Our next dinner is this Saturday* (_{d}_).\n"
            "A table of 5-6 people in your city. Want me to save you a seat?"
        )
        send.send_buttons(wa_id, msg, RSVP_BUTTONS)
        set_mode(phone, "rsvp", {"event_id": ev["id"], "rsvp_id": rsvp_id, "source": "onboarding"})
    except Exception as e:
        logger.error(f"[onboarding] offer dinner failed: {e}")


# ============================================================
#  LIFECYCLE REPLY HANDLERS
# ============================================================
# --- 5-минутное окно на исправление случайного тапа IN/OUT и YES/NO -----------
_DECIDE_WINDOW_S = 300


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def _decided_expired(ctx: dict) -> bool:
    from datetime import datetime, timezone
    ts = ctx.get("decided_at")
    if not ts:
        return False
    try:
        dt = datetime.fromisoformat(ts)
        return (datetime.now(timezone.utc) - dt).total_seconds() > _DECIDE_WINDOW_S
    except Exception:
        return True


def _mark_decided(phone: str, ctx: dict, decision: str) -> None:
    """Вместо мгновенного _clear держим разговор открытым ещё 5 минут — если человек
    случайно тапнул не туда, он успеет исправиться. Время отсчитываем от ПЕРВОГО решения."""
    new_ctx = {**ctx, "decided": decision}
    new_ctx.setdefault("decided_at", _now_iso())
    _sb().table("wa_conversations").update({"context": new_ctx}).eq("phone", phone).execute()


def _adjust_events_used(phone: str, delta: int) -> None:
    """Расход (+1 на подтверждении дннера) / возврат (-1 на отмене) квоты.
    В FREE_MODE — no-op."""
    if os.getenv("FREE_MODE", "false").lower() in ("true", "1", "yes"):
        return
    try:
        u = _sb().table("users").select("user_id, events_used").eq("phone", phone).execute().data
        if not u:
            return
        used = max(0, (u[0].get("events_used") or 0) + delta)
        _sb().table("users").update({"events_used": used}).eq("user_id", u[0]["user_id"]).execute()
    except Exception as e:
        logger.warning(f"[quota] adjust failed: {e}")


async def _handle_rsvp(wa_id, phone, ctx, answer, lang):
    rsvp_id = ctx.get("rsvp_id")
    prior = ctx.get("decided")
    # Окно коррекции истекло → закрываем и обрабатываем сообщение как обычное.
    if prior and _decided_expired(ctx):
        _clear(phone)
        return await handle_incoming(wa_id, text=answer)
    if _yesish(answer):
        if rsvp_id:
            _sb().table("event_rsvps").update({"status": "confirmed"}).eq("id", rsvp_id).execute()
        if prior != "in":
            _adjust_events_used(phone, +1)   # подтвердил дннер → списываем квоту
        if prior == "out":
            send.send_text(wa_id, "You're *IN* now 🎉 See you!")
        elif prior == "in":
            send.send_text(wa_id, "Still in, see you 🎉")
        else:
            send.send_text(wa_id, "You're in! See you 🎉")
        _mark_decided(phone, ctx, "in")
    elif _noish(answer):
        if rsvp_id:
            _sb().table("event_rsvps").update({"status": "cancelled"}).eq("id", rsvp_id).execute()
        if prior == "in":
            _adjust_events_used(phone, -1)   # отменил → возвращаем квоту
            send.send_text(wa_id, "You're *OUT* now. Maybe next time 🙌")
        elif prior == "out":
            send.send_text(wa_id, "Got it, you're out 🙌")
        else:
            send.send_text(wa_id, "Got it, maybe next time 🙌")
        _mark_decided(phone, ctx, "out")
    else:
        if prior:  # уже решил, прислал что-то иное → закрываем, отдаём в обычный обработчик
            _clear(phone)
            return await handle_incoming(wa_id, text=answer)
        send.send_text(wa_id, "Reply *IN* or *OUT* 🙏")


async def _handle_confirm(wa_id, phone, ctx, answer, lang):
    rsvp_id = ctx.get("rsvp_id")
    prior = ctx.get("decided")
    if prior and _decided_expired(ctx):
        _clear(phone)
        return await handle_incoming(wa_id, text=answer)
    if _yesish(answer):
        if rsvp_id:
            _sb().table("event_rsvps").update({"is_confirmed": True, "status": "confirmed"}).eq("id", rsvp_id).execute()
        if prior == "out":
            send.send_text(wa_id, "Changed to *YES* ✅ See you tonight!")
        elif prior == "in":
            send.send_text(wa_id, "Still confirmed ✅ See you tonight!")
        else:
            send.send_text(wa_id, "Confirmed ✅ See you tonight!")
        _mark_decided(phone, ctx, "in")
    elif _noish(answer):
        if rsvp_id:
            _sb().table("event_rsvps").update({"status": "cancelled"}).eq("id", rsvp_id).execute()
        if prior == "in":
            send.send_text(wa_id, "Changed to *NO*, we freed your seat 🙏")
        elif prior == "out":
            send.send_text(wa_id, "Got it, seat freed 🙏")
        else:
            send.send_text(wa_id, "All good, we freed your seat 🙏")
        _mark_decided(phone, ctx, "out")
    else:
        if prior:
            _clear(phone)
            return await handle_incoming(wa_id, text=answer)
        send.send_text(wa_id, "Confirm: *YES* / *NO*")


async def _handle_feedback_l1(wa_id, phone, user, ctx, text, lang):
    """Первое впечатление. МГНОВЕННО: сохраняем сырой L1 + шлём L2-промпт (без LLM).
    Разбор рейтинга уходит в фон уже на шаге L2 (вместе с разбором людей)."""
    if not text:
        send.send_text(wa_id, "A line and a rating 1 to 5 🙂")
        return
    set_mode(phone, "feedback_l2", {**ctx, "l1_raw": text})
    names = _tablemate_names(ctx.get("event_id"), user["user_id"])
    who = ("\n".join(f"- {n}" for n in names)) if names else ""
    send.send_text(
        wa_id,
        "Thanks! 🙌 Now, who at the table would you like to stay in touch with, and who not?\n" + who,
    )


def _reset_date_str(user_id: str):
    """Дата пополнения дннеров (guarded; None если колонки/значения нет)."""
    try:
        r = _sb().table("users").select("events_reset_at").eq("user_id", user_id).execute().data
        ts = r[0].get("events_reset_at") if r else None
        if not ts:
            return None
        from datetime import datetime
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00")).strftime("%b %d")
    except Exception:
        return None


def _maybe_upsell(wa_id: str, user: dict) -> None:
    """После фидбэка, если дннеры исчерпаны — тариф-специфичный апселл/инфо.
    В FREE_MODE и при наличии дннеров — молчим."""
    if os.getenv("FREE_MODE", "false").lower() in ("true", "1", "yes"):
        return
    try:
        u = (_sb().table("users").select("subscription_tier, events_quota, events_used")
             .eq("user_id", user["user_id"]).execute().data)
        if not u:
            return
        u = u[0]
        if (u.get("events_used") or 0) < (u.get("events_quota") or 0):
            return  # ещё есть дннеры в цикле
        tier = u.get("subscription_tier") or "Starter"
        from main import lk_link
        lk = lk_link(user["user_id"])
        when = _reset_date_str(user["user_id"])
        if tier == "Starter":
            msg = ("Hope the table was great! 🙌 That was your free dinner. To keep getting matched into "
                   f"new tables, grab a membership (from $19/mo):\n{lk}")
        elif tier == "Core Membership":
            refill = f", or they refill on {when}" if when else ""
            msg = ("Glad you enjoyed it! 🙌 You've used your Core dinner this cycle. Bump up to *Premium* "
                   f"(2 dinners/mo){refill}:\n{lk}")
        else:  # Premium
            refill = f" on {when}" if when else " next renewal"
            msg = ("Glad you enjoyed it! 🙌 You've used your Premium dinners this cycle, they refill"
                   f"{refill}. Need more sooner? Email hello@coconect.io 🙏")
        send.send_text(wa_id, msg)
    except Exception as e:
        logger.warning(f"[upsell] failed: {e}")


async def _handle_feedback_l2(wa_id, phone, user, ctx, text, lang):
    """МГНОВЕННО: ack + чистим диалог. LLM-разбор (рейтинг L1 + кого оставить L2)
    и запись review/matches — в ФОН (как web_start), чтобы не было 30с-зависания."""
    event_id = ctx.get("event_id")
    if not text or not event_id:
        send.send_text(wa_id, "Tell me who's a yes and who's a no 🙂")
        return
    send.send_text(wa_id, "Saved! 🙏 Added your picks to your network and I'll use this for future seatings.")
    _clear(phone)
    _maybe_upsell(wa_id, user)
    asyncio.create_task(asyncio.to_thread(
        _persist_feedback, event_id, user["user_id"], ctx.get("l1_raw", ""), text
    ))


def _persist_feedback(event_id: str, reviewer_id: str, l1_raw: str, l2_raw: str) -> None:
    """Фон: LLM-разбор рейтинга (L1) + кого да/нет (L2) → event_reviews + matches."""
    try:
        from llm_extract import parse_whatsapp_feedback
        sb = _sb()
        me = sb.table("event_rsvps").select("table_id").eq("event_id", event_id).eq("user_id", reviewer_id).execute().data
        table_id = me[0]["table_id"] if me else None
        cands = []
        if table_id:
            rows = (sb.table("event_rsvps").select("user_id, users(name)")
                    .eq("event_id", event_id).eq("table_id", table_id).neq("user_id", reviewer_id).execute().data) or []
            cands = [{"user_id": r["user_id"], "name": (r.get("users") or {}).get("name")} for r in rows if r.get("user_id")]

        p1 = parse_whatsapp_feedback(l1_raw, []) if l1_raw else {}
        p2 = parse_whatsapp_feedback(l2_raw, cands)
        rating = p1.get("rating", p2.get("rating", 5))
        note = p1.get("moderation_note", l1_raw)
        liked = [uid for uid, v in p2.get("people_ratings", {}).items() if v == "yes"]
        disliked = [uid for uid, v in p2.get("people_ratings", {}).items() if v == "no"]

        sb.table("event_reviews").upsert({
            "event_id": event_id, "reviewer_id": reviewer_id,
            "rating": rating, "liked_users": liked, "disliked_users": disliked,
            "moderation_note": note,
        }, on_conflict="event_id,reviewer_id").execute()
        for lid in liked:
            sb.table("matches").upsert({
                "event_id": event_id, "user_a_id": reviewer_id, "user_b_id": lid,
                "match_score": 100, "breakdown": {"source": "wa_feedback"},
            }, on_conflict="event_id,user_a_id,user_b_id").execute()
        logger.info(f"[feedback bg] {reviewer_id}: rating={rating} liked={len(liked)} disliked={len(disliked)}")
    except Exception as e:
        logger.error(f"[feedback bg] persist failed for {reviewer_id}: {e}")


def _tablemate_names(event_id, user_id) -> list[str]:
    if not event_id:
        return []
    me = (_sb().table("event_rsvps").select("table_id").eq("event_id", event_id).eq("user_id", user_id).execute().data or [])
    table_id = me[0]["table_id"] if me else None
    if not table_id:
        return []
    rows = (_sb().table("event_rsvps").select("user_id, users(name)").eq("event_id", event_id).eq("table_id", table_id).execute().data) or []
    return [r["users"]["name"] for r in rows if r.get("user_id") != user_id and r.get("users")]


# ============================================================
#  FALLBACK (как было): авто-детект pending-отзыва
# ============================================================
async def _legacy_feedback_or_idle(wa_id, phone, user, lang, text):
    from main import now_toronto
    now = now_toronto()  # сравниваем с event-временем в торонтовской шкале
    rsvp_res = _sb().table("event_rsvps").select("event_id").eq("user_id", user["user_id"]).execute()
    active_ids = [r["event_id"] for r in (rsvp_res.data or [])]

    if active_ids and text:
        from main import parse_event_dt, event_candidates
        from llm_extract import parse_whatsapp_feedback
        evs = _sb().table("events").select("*").in_("id", active_ids).execute()
        past = [ev for ev in (evs.data or []) if parse_event_dt(ev) < now]
        if past:
            p_ids = [ev["id"] for ev in past]
            revs = _sb().table("event_reviews").select("event_id").eq("reviewer_id", user["user_id"]).in_("event_id", p_ids).execute()
            done_ids = {r["event_id"] for r in (revs.data or [])}
            pending = sorted([ev for ev in past if ev["id"] not in done_ids], key=lambda x: parse_event_dt(x), reverse=True)
            if pending:
                ev = pending[0]
                cands = (await event_candidates(ev["id"], user["user_id"])).get("candidates", [])
                parsed = parse_whatsapp_feedback(text, cands)
                liked = [u for u, v in parsed.get("people_ratings", {}).items() if v == "yes"]
                disliked = [u for u, v in parsed.get("people_ratings", {}).items() if v == "no"]
                _sb().table("event_reviews").upsert({
                    "event_id": ev["id"], "reviewer_id": user["user_id"], "rating": parsed.get("rating", 5),
                    "liked_users": liked, "disliked_users": disliked, "moderation_note": parsed.get("moderation_note", ""),
                }, on_conflict="event_id,reviewer_id").execute()
                for lid in liked:
                    _sb().table("matches").upsert({
                        "event_id": ev["id"], "user_a_id": user["user_id"], "user_b_id": lid,
                        "match_score": 100, "breakdown": {"source": "wa_feedback"},
                    }, on_conflict="event_id,user_a_id,user_b_id").execute()
                send.send_text(wa_id, "Thanks for the feedback! ✅")
                return

    ctx = _onb_profile_ctx(user["user_id"])
    # Завершённый юзер написал что-то осмысленное → отвечаем как помощник (вопросы про
    # оплату/промокод/отписку/ужины). Пустой пинг → тёплое «профиль готов».
    if (text or "").strip():
        from llm_extract import support_answer
        city = ((ctx.split("City: ", 1)[1].split("\n", 1)[0]) if "City: " in ctx else "your city")
        send.send_text(wa_id, support_answer(ctx, text.strip(), city=city))
        return

    from llm_extract import profile_ready_message
    _ready = profile_ready_message(ctx, user.get("name") or "there")
    send.send_text(wa_id, _ready)
