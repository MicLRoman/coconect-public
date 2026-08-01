"""
LLM-извлечение domains + experience_level из текста профиля (Gemini).

LinkedIn не отдаёт ни доменов/индустрий, ни уровня сеньорности структурно —
выводим их из rich-текста (headline + about + опыт + проекты). Best-effort:
при IMITATION_MODE или ошибке возвращаем пустое (онбординг не падает).
"""
import json
import logging
import os
import re
import time

# ---------------------------------------------------------------------------
# ПУБЛИЧНАЯ ВЕРСИЯ: тексты промптов к LLM вырезаны.
# Структура пайплайна, разбор ответа и обработка ошибок оставлены как есть,
# но сами инструкции модели — закрытая часть Coconect.
# Чтобы поднять форк, подставьте свои промпты вместо _REDACTED_PROMPT.
# ---------------------------------------------------------------------------
_REDACTED_PROMPT = "PROMPT REDACTED IN PUBLIC BUILD"


logger = logging.getLogger(__name__)

ALLOWED_LEVELS = ["Beginner", "Middle", "Senior", "Executive"]
GEN_MODEL = os.getenv("GEMINI_GEN_MODEL", "gemini-flash-latest")

# ─────────────────────────────────────────────────────────────────────────────
# Единый «человеческий» голос для ВСЕХ генерируемых сообщений. Цель — чтобы текст
# не выдавал в себе ИИ и читался как живой человек в чате. Инжектится в промпты.
# ─────────────────────────────────────────────────────────────────────────────
HUMAN_VOICE = (
    "HOW TO WRITE (this matters as much as what you say):\n"
    "- Write like a real person texting on WhatsApp. Not like an AI assistant, not like a brand.\n"
    "- NEVER use an em dash or en dash (the — or – character). Use a period, a comma, or start a new short "
    "sentence instead. This is the single most important rule, break it and the message reads as AI.\n"
    "- Keep it short. A line or two, sometimes just a few words. Cut anything that isn't needed.\n"
    "- Relaxed and human, but you're talking to founders and entrepreneurs, so stay sharp, not goofy. "
    "Use contractions and plain everyday words.\n"
    "- Emoji: at most one, and not in every message. Often none. Never stack two together.\n"
    "- Don't over-cheer. Skip openers like \"Perfect!\", \"Amazing!\", \"Absolutely!\", \"Awesome!\", \"Love it!\".\n"
    "- Avoid these words/phrases, they sound like AI or ad copy: curated, genuinely, seamless, elevate, unlock, "
    "\"dive in\", \"sit tight\", \"hang tight\", \"the right people\", \"the right table\", \"reach out\", "
    "\"feel free\", \"rest assured\", \"a curated group of\". Say the plain version.\n"
    "- NEVER output square-bracket placeholders like [Name], [My Name], [Company]. If you don't have a value, "
    "leave it out. Never introduce yourself by a person's name, you're just the Coconect host.\n"
)

# «Крутой интервьюер»: живость + характер, реагирует на сказанное. Инжектится туда,
# где идёт РАЗГОВОР (opener, онбординг-ходы), чтобы агент не был плоским опросником.
INTERVIEWER = (
    "BE A GREAT INTERVIEWER, not a form. Genuinely curious and sharp, with real personality. REACT to what they "
    "actually said (grab a specific detail and run with it) before asking the next thing. Make them feel like the "
    "most interesting person you've talked to today. Playful, warm, a little bold, quick wit. Never fake-hype or "
    "cheesy, never a flat \"Got it. What...\".\n"
)

# Добавляется ТОЛЬКО к сообщениям, которые уходят исключительно в WhatsApp (send.send_text),
# а не в веб-чат: можно раздробить ответ на 2 коротких пузыря маркером [SPLIT].
MULTI_BUBBLE = (
    "- You may occasionally split the reply into two tiny separate messages by putting [SPLIT] between them, "
    "but only when it genuinely reads more naturally. Usually one short message is better.\n"
)

# Плейсхолдеры вида [Name] = провал генерации → отдаём фолбэк, не показываем юзеру.
_PLACEHOLDER_RE = re.compile(r"\[[^\]]{0,40}\]")


def _clean_line(line: str, fallback: str) -> str:
    line = " ".join((line or "").split()).strip()
    if not line or _PLACEHOLDER_RE.search(line):
        return fallback
    return line


def _imitation() -> bool:
    return os.getenv("IMITATION_MODE", "true").lower() in ("true", "1", "yes")


def _generate_json(prompt: str, retries: int = 5, temperature: float = 0) -> dict:
    """Gemini generate_content -> JSON, с ретраями на 429/503 (free-tier rate limit).
    Уважает retryDelay из ошибки. Бросает исключение, если не вышло за retries."""
    from google import genai
    from google.genai import types
    client = genai.Client()
    last = None
    for attempt in range(retries):
        try:
            resp = client.models.generate_content(
                model=GEN_MODEL, contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json", temperature=temperature),
            )
            return json.loads(resp.text or "{}")
        except Exception as e:
            last = e
            msg = str(e)
            transient = any(x in msg for x in ("429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE"))
            if transient and attempt < retries - 1:
                m = re.search(r"retry in ([0-9.]+)s|retryDelay['\"]?:?\s*['\"]?([0-9.]+)s", msg)
                delay = float(next((g for g in (m.groups() if m else []) if g), 0) or 0)
                delay = min(max(delay, 6), 65) + 1
                logger.warning(f"[llm_extract] transient ({msg[:40]}…) — retry in {delay:.0f}s [{attempt+1}/{retries}]")
                time.sleep(delay)
                continue
            raise
    if last:
        raise last
    return {}


def extract_domains_and_level(give_text: str) -> dict:
    """-> {'domains': [..≤5], 'experience_level': [..≤2 из ALLOWED_LEVELS]}."""
    empty = {"domains": [], "experience_level": []}
    if not give_text or not give_text.strip() or _imitation():
        return empty

    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    try:
        data = _generate_json(prompt)
        domains = [str(d).strip() for d in (data.get("domains") or []) if str(d).strip()][:5]
        levels = [lvl for lvl in (data.get("experience_level") or []) if lvl in ALLOWED_LEVELS][:2]
        return {"domains": domains, "experience_level": levels}
    except Exception as e:
        logger.error(f"[llm_extract] failed: {e}")
        return empty


def extract_profile_from_chat(transcript: str) -> dict:
    """Для юзеров БЕЗ LinkedIn: вытащить структурные поля профиля прямо из
    стенограммы онбординга (домены/скиллы/сеньорность/текущий статус) — то, что
    обычно даёт LinkedIn. Best-effort: пустое при IMITATION/ошибке."""
    empty = {"domains": [], "hard_skills": [], "experience_level": [], "current_status": {}}
    if not transcript or not transcript.strip() or _imitation():
        return empty
    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    try:
        d = _generate_json(prompt)
        cs = d.get("current_status") if isinstance(d.get("current_status"), dict) else {}
        return {
            "domains": [str(x).strip() for x in (d.get("domains") or []) if str(x).strip()][:5],
            "hard_skills": [str(x).strip() for x in (d.get("hard_skills") or []) if str(x).strip()][:8],
            "experience_level": [lvl for lvl in (d.get("experience_level") or []) if lvl in ALLOWED_LEVELS][:2],
            "current_status": {
                "type": str(cs.get("type", "")).strip(),
                "company_name": str(cs.get("company_name", "")).strip(),
            },
        }
    except Exception as e:
        logger.error(f"[llm_extract] profile_from_chat failed: {e}")
        return empty


def extract_communication_style(custom_request_text: str) -> str:
    """
    Analyzes the user's free text request and returns one of the following communication styles:
    'formal', 'casual', 'direct', 'enthusiastic'.
    """
    if not custom_request_text or not custom_request_text.strip() or _imitation():
        return "casual"

    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    
    try:
        data = _generate_json(prompt)
        style = str(data.get("style", "")).lower().strip()
        if style in ["formal", "casual", "direct", "enthusiastic"]:
            return style
        return "casual"
    except Exception as e:
        logger.error(f"[llm_extract] style extraction failed: {e}")
        return "casual"

MATCH_TYPES = ["peer", "seeking_mentor", "offering_mentorship"]
# Интент-теги: «замок↔ключ» комплементарность + анти-каннибализация (см. scoring).
INTENT_TAGS = [
    "seeks_tech_cofounder", "seeks_business_cofounder", "hiring", "job_seeking",
    "fundraising", "investing", "clients", "peer_network",
]


def extract_ask_signals(text: str) -> dict:
    """ОДИН LLM-вызов: communication_style + match_type + intent_tag из текста ASK.
    Экономит квоту (вместо 3 вызовов). Best-effort: дефолты при IMITATION/ошибке."""
    default = {"communication_style": "casual", "match_type": "peer", "intent_tag": "peer_network"}
    if not text or not text.strip() or _imitation():
        return default
    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    try:
        d = _generate_json(prompt)
        cs = str(d.get("communication_style", "")).lower().strip()
        mt = str(d.get("match_type", "")).lower().strip()
        it = str(d.get("intent_tag", "")).lower().strip()
        return {
            "communication_style": cs if cs in ("formal", "casual", "direct", "enthusiastic") else "casual",
            "match_type": mt if mt in MATCH_TYPES else "peer",
            "intent_tag": it if it in INTENT_TAGS else "peer_network",
        }
    except Exception as e:
        logger.error(f"[llm_extract] ask_signals failed: {e}")
        return default


_STYLES = ("formal", "casual", "direct", "enthusiastic")


def onboarding_turn(profile_ctx: str, history: list[dict], user_msg: str, city: str = "your city",
                    depth: str = "short") -> dict:
    """ОДИН разговорный ход онбординга (Boardy-стиль).

    depth='short' — быстрый онбординг (WhatsApp): один вопрос ASK, если LinkedIn есть;
      два (GIVE→ASK), если нет. Ровно то, что нужно матчингу, дальше — по ссылке.
    depth='deep' — полный 5-блочный разговор (веб-C / «дозаполнить профиль»).

    Болтает по-человечески, персонализирует по LinkedIn, отвечает на встречные/
    левые реплики (кратко) либо мягко возвращает к цели — и параллельно извлекает
    наши сигналы. Возвращает {reply, the_*, match_type, intent_tag,
    communication_style, done}. Бросает исключение при сбое LLM — фолбэк на вызывающем.
    """
    hist = "\n".join(
        f"{'User' if m.get('role') == 'user' else 'Host'}: {m.get('text', '')}"
        for m in (history or [])
    ) or "(no messages yet, open the conversation)"

    # Есть ли реальный LinkedIn-сигнал в контексте (роль/домены/скиллы), а не только имя.
    has_li = any(k in (profile_ctx or "") for k in ("LinkedIn: on file", "Role:", "Domains:", "Top skills:", "Seniority:"))

    about = (
        "ABOUT COCONECT (use these facts to answer their questions, never invent beyond this):\n"
        "- What it is: dinners of 5-6 people, matched by what each person is building, what they need, and what they can "
        "offer, so every seat is actually useful. Not random networking.\n"
        "- How it works: you finish this short chat, we build your table from people who fit, you get the dinner details "
        "right here on WhatsApp and just show up.\n"
        "- Their dashboard (the link we send after this chat): there they see everything visually. Upcoming dinners, "
        "who's at the table, their connections, their profile. Anything about money lives there too.\n"
        "- Timeline per dinner: about 3 days before the Saturday we send the table tags (who they'll sit with), about a "
        "day before we send the restaurant and exact time.\n"
        f"- When/where: dinners run on Saturdays in {city}, the venue lands about 24h before. This chat is in English.\n"
        "- Cost: there's a free tier to start, plus paid memberships (from $19/mo) for more dinners. Full pricing on coconect.io.\n"
        "- Paying / upgrading membership: all done in their dashboard (the link), not here in chat.\n"
        "- Promo / discount codes: open the dashboard, go to the Payment/Billing section, scroll to the BOTTOM, there's a "
        "field to enter the code.\n"
        "- Cancelling / managing / unsubscribing: same Payment/Billing section in the dashboard.\n"
        "- Who's behind it: a real community. For anything you can't answer, point them to hello@coconect.io.\n\n"
    )

    if depth == "deep":
        job = (
            "YOUR JOB: through natural back and forth (ONE question at a time, building on their answers), "
            "cover these FIVE things, roughly in this order, personalized with their LinkedIn:\n"
            "1) THE BUILD: make sure you actually get what they (or their company) DO. If LinkedIn already makes it obvious, "
            "confirm it lightly and move to how it's going. If it's fuzzy, ask them to say it in a sentence. "
            "Don't pretend to know what you don't. Then get to the most exciting OR most painful part right now. "
            "That pain is their bottleneck, exactly what a tablemate could help solve.\n"
            "2) THE ASK (MOST IMPORTANT for matching): who they're hoping to meet at these dinners "
            "(e.g. founders in a specific space, a developer to hire, people who've already scaled something, investors...).\n"
            "3) THE GIVE: flip side, what they're great at, where they could really help someone else at the table. "
            "This is what makes a table that gives back instead of a table of takers.\n"
            "4) THE GOAL: what they actually want out of the dinners (honest advice, partnerships, a co-founder, "
            "mentors, or just good conversation with people like them...).\n"
            "5) EXTRA (optional): anything else important about them, or the kind of people they click with.\n"
            "Once you have THE BUILD, THE ASK, THE GIVE and THE GOAL (extra is optional), set \"done\": true and "
            "send a warm, short closing line (the dashboard link is added separately).\n\n"
        )
    elif has_li:
        job = (
            "YOUR JOB (keep it SHORT, this is a 20-second intro, NOT a full profile). Talk like a real founder friend "
            "texting: casual, a bit of energy, human. NOT a form, NOT a brand.\n"
            "You already have their work side from LinkedIn (above), so DON'T ask what they do or build. Ask ONE thing: "
            "who they'd love to meet at the table, AND what they could actually use right now. Give a couple of concrete "
            "examples so it's easy to answer, and keep it opportunity-framed (NOT \"what's your problem / what are you "
            "stuck on\"). NAME their actual project/company so it lands personal, roughly: \"so you're building <X> 👀 "
            "who'd be great to meet at the table, and what could you use right now? (intros, a hire, first users, "
            "investors...)\".\n"
            "When they answer:\n"
            "- Concrete enough to match on (a kind of person and/or a clear need) -> set \"done\": true with a short warm "
            "closing line.\n"
            "- Too vague (\"interesting people\", \"like-minded folks\", \"idk\") -> ask ONE quick, casual follow-up to "
            "make it concrete, then set done:true on the next answer no matter what. NEVER more than one follow-up.\n"
            "Put their answer into the_ask (and the_give/the_build only if they volunteer it).\n\n"
        )
    else:  # short, no LinkedIn
        job = (
            "YOUR JOB (keep it SHORT, 2 quick questions max):\n"
            "There's no LinkedIn on file, so get two things, ONE at a time:\n"
            "1) GIVE first: what they do and what they're best at. One line, roughly: "
            "\"First, in a line: what do you do, and what are you best at?\" -> put into the_give (and the_build).\n"
            "2) Then ASK: who they most want to meet and what would help them most right now, roughly: "
            "\"Got it. Now the important bit: who do you most want to meet, and what would help you most right now?\" "
            "-> put into the_ask.\n"
            "Once you have BOTH a give answer AND an ask answer, set \"done\": true with a short warm closing line. "
            "At most ONE clarifying follow-up total, only if something is genuinely too vague.\n\n"
        )

    rules = (
        "RULES:\n"
        "- Ask ONE thing at a time, never dump several at once. Keep each message short.\n"
        "- You're their host AND their helper. If they ask a real question (what Coconect is, how it works, cost, "
        "when/where, is it legit, billing, promo codes, cancelling), answer it from the ABOUT facts first (a sentence "
        "or two), THEN continue where you left off. Never brush off a real question. For money/promo/membership, point "
        "them to their dashboard.\n"
        "- If they go off-topic or joke: roll with it briefly (one short line), then steer back. NEVER ignore them.\n"
        "- If you don't know a fact, say you're the host and keep it light, never invent.\n"
        "- Don't ask about budget, price, days, scheduling, city areas, or languages. Dinners are in English and "
        "dates/venues are set by us.\n\n"
    )

    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    d = _generate_json(prompt, temperature=0.7)
    mt = str(d.get("match_type", "")).lower().strip()
    it = str(d.get("intent_tag", "")).lower().strip()
    cs = str(d.get("communication_style", "")).lower().strip()
    # Плейсхолдер в reply = провал → пустим "", чтобы вызывающий ушёл в фолбэк-вопрос.
    _reply = str(d.get("reply", "")).strip()
    if _PLACEHOLDER_RE.search(_reply):
        _reply = ""
    return {
        "reply": _reply,
        "the_build": str(d.get("the_build", "")).strip(),
        "the_ask": str(d.get("the_ask", "")).strip(),
        "the_give": str(d.get("the_give", "")).strip(),
        "the_goal": str(d.get("the_goal", "")).strip(),
        "extra": str(d.get("extra", "")).strip(),
        "match_type": mt if mt in MATCH_TYPES else "",
        "intent_tag": it if it in INTENT_TAGS else "",
        "communication_style": cs if cs in _STYLES else "",
        "done": bool(d.get("done")),
    }


def onboarding_opener(profile_ctx: str, name: str = "there") -> str:
    """Первое сообщение КОРОТКОГО онбординга = сам вопрос (Direct-тон, одна строка).

    Есть LinkedIn → спрашиваем ASK (кого встретить + что поможет), GIVE берём из LinkedIn.
    Нет LinkedIn → спрашиваем GIVE (чем занят + в чём силён), ASK будет вторым ходом.
    Best-effort: фолбэк при сбое."""
    has_li = any(k in (profile_ctx or "") for k in ("LinkedIn: on file", "Role:", "Domains:", "Top skills:", "Seniority:"))
    if has_li:
        fallback = ("Got your work side from LinkedIn already, so no need to retype it 👌 "
                    "Who'd be great for you to meet at the table, and what could you use right now? "
                    "(intros, a hire, first users, investors...)")
    else:
        fallback = "Real quick so I get you right: what do you do, and what are you best at?"
    if _imitation():
        return fallback
    if has_li:
        # ── промпт вырезан в публичной версии репозитория ──
        prompt = _REDACTED_PROMPT
    else:
        # ── промпт вырезан в публичной версии репозитория ──
        prompt = _REDACTED_PROMPT
    try:
        d = _generate_json(prompt, temperature=0.8)
        return _clean_line(str(d.get("opener", "")), fallback)
    except Exception as e:
        logger.error(f"[llm_extract] opener failed: {e}")
        return fallback


def profile_ready_message(profile_ctx: str = "", name: str = "there") -> str:
    """Кастомное «профиль готов — скоро будет ужин» сообщение для WhatsApp.
    Тёплое, чуть игривое, намекает что инфа об ужине придёт сюда. Без ссылки,
    без вопроса. Best-effort: фолбэк при сбое LLM."""
    fallback = "Your profile's all set 🎉 I'll message you right here the moment a good dinner is coming together.[SPLIT]And if anything comes up before then, just ask me here."
    if _imitation():
        return fallback
    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    try:
        d = _generate_json(prompt, temperature=0.9)
        msg = " ".join(str(d.get("message", "")).split()).strip()
        return msg or fallback
    except Exception as e:
        logger.error(f"[llm_extract] profile_ready failed: {e}")
        return fallback


# Факты о продукте — чтобы «хост» мог ответить на ЛЮБОЙ вопрос юзера посреди флоу.
_ABOUT_COCONECT = (
    "ABOUT COCONECT (answer questions ONLY from these facts, never invent):\n"
    "- What it is: small-group dinners of 5-6 people, matched by what each person is building, what they need, and what "
    "they can offer, so every seat is actually useful. Not random networking.\n"
    "- How it works: a quick chat here to set up your profile, we build your table from people who fit, you get the "
    "dinner details right here on WhatsApp and just show up.\n"
    "- When/where: dinners run on Saturdays in your city, exact venue lands about 24h before. This chat is in English.\n"
    "- Cost: free tier to start, plus paid memberships from $19/mo for more dinners. Full pricing on coconect.io.\n"
    "- Dashboard: after setup you get a link with your upcoming dinners, your table, connections, profile, and billing.\n"
    "- Promo codes / paying / upgrading / cancelling: all in the dashboard's Payment/Billing section.\n"
    "- Who's behind it: a real community. For anything you can't answer, point them to hello@coconect.io.\n"
)


def host_line(instruction: str, fallback: str, user_msg: str = "", profile_ctx: str = "") -> str:
    """Одна человеческая строка «хоста» под конкретную задачу (instruction): поздороваться,
    подтвердить выбор, спросить город, закрыть онбординг и т.п. Если latest-сообщение юзера
    это ВОПРОС/оффтоп — СНАЧАЛА отвечает из фактов Coconect, потом делает задачу (люди могут
    спросить что угодно посреди флоу). Fallback при IMITATION/сбое."""
    if _imitation():
        return fallback
    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    try:
        d = _generate_json(prompt, temperature=0.7)
        return _clean_line(str(d.get("line", "")), fallback)
    except Exception as e:
        logger.error(f"[llm_extract] host_line failed: {e}")
        return fallback


def onboarding_suggestions(profile_ctx: str) -> dict:
    """Персонализированные чипы-подсказки для глубокого онбординга, ПО ДАННЫМ короткого.
    Возвращает {"ask": [...], "give": [...], "help": [...]} — короткие (2-4 слова) фразы,
    заточенные под конкретного человека (его домен/скиллы/город/стадию). Пустой dict при
    IMITATION/сбое — тогда main.py/фронт подставят эвристический fallback из структурных полей."""
    empty = {"ask": [], "give": [], "help": []}
    if not profile_ctx or not profile_ctx.strip() or _imitation():
        return empty
    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT

    def _clean_chips(items):
        out = []
        for c in (items or []):
            s = " ".join(str(c).split()).strip().strip(".,").lower()
            if s and len(s) <= 40 and not _PLACEHOLDER_RE.search(s):
                out.append(s)
        return out[:4]

    try:
        d = _generate_json(prompt, temperature=0.7)
        return {"ask": _clean_chips(d.get("ask")), "give": _clean_chips(d.get("give")), "help": _clean_chips(d.get("help"))}
    except Exception as e:
        logger.error(f"[llm_extract] onboarding_suggestions failed: {e}")
        return empty


def support_answer(profile_ctx: str, question: str, city: str = "your city") -> str:
    """Ответ завершённому юзеру в режиме «помощник»: отвечает на любой вопрос
    (что такое Coconect, оплата, промокод, отписка, ужины…) из фиксированных фактов,
    либо — если это просто привет/пинг — тёпло напоминает, что профиль готов.
    Best-effort: фолбэк при сбое LLM."""
    fallback = ("I'm your Coconect host. For membership, billing or a promo code, open your dashboard (the link in your "
                "profile), it's all in the Payment section and the promo field is at the bottom.[SPLIT]Anything else, "
                "just ask here, or email hello@coconect.io.")
    if _imitation():
        return fallback
    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    try:
        d = _generate_json(prompt, temperature=0.6)
        msg = " ".join(str(d.get("reply", "")).split()).strip()
        return msg or fallback
    except Exception as e:
        logger.error(f"[llm_extract] support_answer failed: {e}")
        return fallback


def _person_oneliner(u: dict) -> str:
    """Нелья-LLM фолбэк: роль/headline одной строкой."""
    st = u.get("current_status") or {}
    role = u.get("headline") or st.get("type") or ""
    company = st.get("company_name") or ""
    base = f"{role}{(' @ ' + company) if company else ''}".strip(" @")
    if not base:
        doms = ", ".join((u.get("domains") or [])[:2])
        base = doms or "Interesting person to meet"
    return base


def tablemate_blurbs(people: list[dict]) -> dict:
    """Короткий «кто это» на КАЖДОГО гостя стола — для анонса «стол собран» за 3 дня.
    Возвращает {user_id: 'one-line who-they-are'}. Best-effort: фолбэк по headline."""
    out: dict = {}
    people = [u for u in (people or []) if u.get("user_id")]
    if not people:
        return out
    if _imitation():
        return {u["user_id"]: _person_oneliner(u) for u in people}
    blocks = []
    for u in people:
        st = u.get("current_status") or {}
        parts = [f"id: {u['user_id']}", f"name: {u.get('name') or 'Guest'}"]
        if u.get("headline") or st.get("type"):
            parts.append(f"role: {u.get('headline') or st.get('type')}")
        if st.get("company_name"):
            parts.append(f"company: {st['company_name']}")
        if u.get("domains"):
            parts.append("domains: " + ", ".join(u["domains"][:4]))
        if u.get("hard_skills"):
            parts.append("skills: " + ", ".join(u["hard_skills"][:5]))
        if u.get("experience_level"):
            parts.append("seniority: " + ", ".join(u["experience_level"][:2]))
        blocks.append(" | ".join(parts))
    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    try:
        d = _generate_json(prompt, temperature=0.7)
        raw = d.get("blurbs") or {}
        for u in people:
            line = " ".join(str(raw.get(u["user_id"], "")).split()).strip()
            out[u["user_id"]] = line or _person_oneliner(u)
        return out
    except Exception as e:
        logger.error(f"[llm_extract] tablemate_blurbs failed: {e}")
        return {u["user_id"]: _person_oneliner(u) for u in people}


def _teaser_fallback(peer_ctx: str) -> str | None:
    """Дев/без-LLM шаблон тизера из строки фактов 'role: X | domains: a, b | ...'."""
    role, domain = "", ""
    for part in (peer_ctx or "").split("|"):
        p = part.strip()
        if p.lower().startswith("role:"):
            role = p.split(":", 1)[1].strip()
        elif p.lower().startswith("domains:"):
            domain = p.split(":", 1)[1].strip().split(",")[0].strip()
    who = role or (f"someone in {domain}" if domain else "")
    if not who:
        return None
    tail = f" working in {domain}" if domain and domain.lower() not in who.lower() else ""
    return f"btw, there's already a {who}{tail} in the mix here 👀"


def teaser_line(peer_ctx: str, focus: str = "") -> str | None:
    """Одна АНОНИМНАЯ человеческая строка про реального человека, которого можно
    встретить (для «прикола» между этапами и инвайтов). Никаких имён/компаний/
    выдуманных фактов. None при пустом контексте."""
    if not peer_ctx or not peer_ctx.strip():
        return None
    if _imitation():
        return _teaser_fallback(peer_ctx)
    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    try:
        d = _generate_json(prompt, temperature=0.8)
        return _clean_line(str(d.get("line", "")), _teaser_fallback(peer_ctx))
    except Exception as e:
        logger.error(f"[llm_extract] teaser_line failed: {e}")
        return _teaser_fallback(peer_ctx)


def _match_reward_fallback(peer_ctx: str, their_ask: str, going: bool) -> str | None:
    role, domain = "", ""
    for part in (peer_ctx or "").split("|"):
        p = part.strip()
        if p.lower().startswith("role:"):
            role = p.split(":", 1)[1].strip()
        elif p.lower().startswith("domains:"):
            domain = p.split(":", 1)[1].strip().split(",")[0].strip()
    who = role or (f"someone in {domain}" if domain else "someone")
    ask = (their_ask or "").strip()
    ask_bit = f", who's after {ask[:120]}" if ask else ""
    if going:
        return f"Ok you got lucky 👀 we just landed a {who} onto Coconect{ask_bit}, and they're in for this Saturday. You could be right at their table."
    return f"Ok you got lucky 👀 we just got a {who} onto Coconect{ask_bit}. Could be a great one for you."


def match_reward_line(peer_ctx: str, their_ask: str = "", going: bool = False) -> str | None:
    """Вознаграждение в конце онбординга: одна человеческая строка про РЕАЛЬНЫЙ метч,
    которого мы уже нашли. Аноним (роль+сфера+что ищет), без имени/компании.
    going=True → он идёт на ближайший ужин. None при пустом контексте."""
    if not peer_ctx or not peer_ctx.strip():
        return None
    if _imitation():
        return _match_reward_fallback(peer_ctx, their_ask, going)
    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    try:
        d = _generate_json(prompt, temperature=0.8)
        return _clean_line(str(d.get("line", "")), _match_reward_fallback(peer_ctx, their_ask, going))
    except Exception as e:
        logger.error(f"[llm_extract] match_reward failed: {e}")
        return _match_reward_fallback(peer_ctx, their_ask, going)


def reengage_opener(profile_ctx: str, name: str = "there", stage: int = 1) -> str:
    """Персональный «вернись» нудж для тех, кто бросил онбординг / не ответил на go-no-go.
    В стиле живого основателя: ссылается на их сферу, задаёт ОДИН вопрос про то, что строят.
    stage=2 — мягче/короче, «последний пинг». Одна строка, без переносов. Best-effort."""
    fallback = (
        f"Hey {name}, still thinking about what you're building. "
        "What's the angle you're going after there?"
    )
    if _imitation():
        return fallback
    tone = ("This is a gentle, final check-in a week later. Keep it light, zero pressure. "
            if stage >= 2 else
            "This is a warm follow-up a day later. Curious and human, not salesy. ")
    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    try:
        d = _generate_json(prompt, temperature=0.85)
        msg = " ".join(str(d.get("message", "")).split()).strip()
        return msg or fallback
    except Exception as e:
        logger.error(f"[llm_extract] reengage_opener failed: {e}")
        return fallback


def generate_icebreakers(table_ctx: str, n: int = 3) -> list[str]:
    """N кастомных icebreaker-вопросов под КОНКРЕТНЫЙ стол (по профилям людей).
    Каждый — ОДНА строка (без переносов) → годится как переменная шаблона."""
    fallback = [
        "What are you building or working on right now?",
        "What's one thing you'd love help with at this table?",
        "What's a recent win you're proud of?",
    ]
    if _imitation():
        return fallback[:n]
    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    try:
        d = _generate_json(prompt, temperature=0.8)
        qs = [" ".join(str(q).split()).strip() for q in (d.get("questions") or []) if str(q).strip()]
        return (qs + fallback)[:n] if qs else fallback[:n]
    except Exception as e:
        logger.error(f"[llm_extract] icebreakers failed: {e}")
        return fallback[:n]


def extract_match_type(text: str) -> str:
    """Классифицирует свободный текст запроса в роль за столом:
       peer | seeking_mentor | offering_mentorship. Люди сами не знают терминов —
       поэтому определяем по смыслу (ищет наставника / готов менторить / на равных)."""
    if not text or not text.strip() or _imitation():
        return "peer"
    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    try:
        data = _generate_json(prompt)
        v = str(data.get("match_type", "")).lower().strip()
        return v if v in MATCH_TYPES else "peer"
    except Exception as e:
        logger.error(f"[llm_extract] match_type extraction failed: {e}")
        return "peer"


def match_candidate_choice(user_text: str, candidates: list[dict]) -> int | None:
    """Какого LinkedIn-кандидата из пронумерованного списка выбрал юзер в WhatsApp.

    candidates: [{name, headline, location}, ...] (порядок = номера 1..N в чате).
    Возвращает индекс (0-based), -1 если юзер явно сказал «никто из них», None если
    непонятно (перепросим). Сначала алгоритм (цифра / однозначное имя) — LLM только
    когда дёшево не решается («второй», «тот что из Google»...).
    """
    t = " ".join((user_text or "").lower().split())
    n = len(candidates)
    if not t or not n:
        return None

    # --- алгоритм: явное «не я / никто» ---
    none_words = ("none", "nope", "not me", "no one", "neither", "никто", "не я", "нет меня")
    if t in ("no", "нет", "0") or any(w in t for w in none_words):
        return -1

    # --- алгоритм: одинокая цифра 1..N в ответе ---
    digits = re.findall(r"\d+", t)
    if len(digits) == 1:
        k = int(digits[0])
        if 1 <= k <= n:
            return k - 1
        if k == 0:
            return -1

    # --- алгоритм: однозначное совпадение по имени ---
    words = set(re.findall(r"[a-zа-яё0-9]+", t))
    strong, weak = [], []
    for i, c in enumerate(candidates):
        name = " ".join((c.get("name") or "").lower().split())
        toks = [w for w in name.split() if len(w) >= 2]
        if not toks:
            continue
        if name in t or all(tok in words for tok in toks):
            strong.append(i)
        elif toks[0] in words:
            weak.append(i)
    if len(strong) == 1:
        return strong[0]
    if not strong and len(weak) == 1:
        return weak[0]

    # --- LLM: свободная формулировка («the second one», «тот из Stripe») ---
    if _imitation():
        return None
    listing = "\n".join(
        f"{i + 1}. {c.get('name', '')} — {c.get('headline', '')} ({c.get('location', '')})"
        for i, c in enumerate(candidates)
    )
    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    try:
        d = _generate_json(prompt)
        k = int(d.get("choice", -1))
        if k == 0:
            return -1
        if 1 <= k <= n:
            return k - 1
        return None
    except Exception as e:
        logger.error(f"[llm_extract] candidate choice failed: {e}")
        return None


def parse_whatsapp_feedback(feedback_text: str, candidates: list[dict]) -> dict:
    """
    Parses a free-form WhatsApp message to extract event rating, text, and peer ratings.
    candidates: list of user dicts (with user_id, name).
    Returns:
      {
        "rating": 5, # integer 1-5
        "moderation_note": "text",
        "people_ratings": { "user_id": "yes" | "no" | "idk" }
      }
    """
    empty = {
        "rating": 5,
        "moderation_note": feedback_text,
        "people_ratings": {}
    }
    if not feedback_text or not feedback_text.strip() or _imitation():
        return empty

    cand_str = "\n".join([f"- {c.get('name', 'Unknown')} (ID: {c.get('user_id')})" for c in candidates])

    # ── промпт вырезан в публичной версии репозитория ──
    prompt = _REDACTED_PROMPT
    
    try:
        data = _generate_json(prompt)

        rating = data.get("rating", 5)
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            rating = 5
            
        note = data.get("moderation_note", "")
        if not isinstance(note, str):
            note = ""
            
        people = data.get("people_ratings", {})
        if not isinstance(people, dict):
            people = {}
            
        # Ensure all candidates are in the dict
        final_people = {}
        for c in candidates:
            uid = c.get("user_id")
            val = str(people.get(uid, "idk")).lower()
            if val not in ("yes", "no", "idk"):
                val = "idk"
            final_people[uid] = val
            
        return {
            "rating": rating,
            "moderation_note": note,
            "people_ratings": final_people
        }
    except Exception as e:
        logger.error(f"[llm_extract] feedback parsing failed: {e}")
        return empty
