"""
WhatsApp-часть онбординга (LinkedIn-first, дизайн §6.0), двуязычная (ru/en).

GIVE уже собран на сайте. В чате добираем: психотип (social_battery + pace) + ASK.
get_steps(lang) отдаёт шаги с локализованными промптами/кнопками.
apply_to_user(draft) мапит ответы в колонки users.
"""

BATTERY_VALUE = {"low": "introvert", "medium": "ambivert", "high": "extrovert"}
PACE_VALUE = {"calm": 3, "mid": 5, "fast": 9}

# Декларация шагов.
STEP_DEFS = [
    {
        "key": "intent_goals", "path": ["intent_goals"], "type": "text",
        "prompt": "*Goals / intent: What do you want to get out of the dinners?* (friends, co-founder, clients, peers, fundraising, or mentorship)"
    },
    {
        "key": "match_type", "path": ["match_type"], "type": "text",
        "prompt": "*Match type:* Do you want to sit at a table with equals (peer-to-peer) or are you interested in mentorship (mentor-mentee)?"
    },
    {
        "key": "logistics", "path": ["custom_request_raw"], "type": "text",
        "prompt": "*Dietary:* Any dietary preferences we should know about (e.g. vegan, halal, allergies)?"
    },
]

def get_steps(lang: str = "en") -> list[dict]:
    steps = []
    for d in STEP_DEFS:
        s = {"key": d["key"], "path": d["path"], "type": d["type"], "prompt": d["prompt"]}
        if "options" in d:
            s["options"] = [(oid, t) for oid, t in d["options"]]
        steps.append(s)
    return steps


def step_count() -> int:
    return len(STEP_DEFS)


def apply_to_user(draft: dict) -> dict:
    """draft -> патч колонок users (без ask_vector — его строит вызывающий)."""
    from llm_extract import extract_ask_signals

    intent_goals = draft.get("intent_goals", "")
    match_type_raw = draft.get("match_type", "")      # свободный текст
    logistics = draft.get("custom_request_raw", "")

    # Весь контекст -> custom_request_raw (его эмбеддит ask_vector).
    combined_raw = f"{intent_goals} | {match_type_raw} | {logistics}".strip(" |")

    # ОДИН LLM-вызов: стиль общения + роль (peer/mentor) + интент-тег (cofounder/...).
    sig = extract_ask_signals(combined_raw)

    return {
        "intent_goals": [intent_goals] if intent_goals else [],
        "communication_style": sig["communication_style"],
        "match_type": sig["match_type"],
        "intent_tag": sig["intent_tag"],
        "custom_request_raw": combined_raw,
    }
