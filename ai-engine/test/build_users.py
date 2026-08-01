"""
Шаг 3 теста: cache/*.json + asks.json -> users.json (с give/ask векторами).

Запуск (из ai-engine):
    py test/build_users.py

- Берёт распарсенные профили из cache/ и ASK+психотип из asks.json.
- linkedin_to_give + LLM-extraction (domains/level). Язык ПРИНУДИТЕЛЬНО ['English']
  (тестовое упрощение — см. MATCHING_DESIGN §8).
- Строит реальные give_vector / ask_vector (нужен IMITATION_MODE=false).
"""
import json
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # ai-engine на путь

from linkedin_map import linkedin_to_give
from llm_extract import extract_domains_and_level
from embeddings import get_embedding, generate_ask_vector_smart
from wa import steps

HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache"

# Тест: всех в один город, чтобы city-HC не дробил столы (см. MATCHING_DESIGN §4/§8).
import os
TEST_CITY = os.getenv("TEST_CITY", "Toronto")


def main():
    asks_file = HERE / "asks.json"
    if not asks_file.exists():
        raise SystemExit("нет asks.json — сделай шаг 2 (LLM_PROMPT.md)")
    asks = json.loads(asks_file.read_text(encoding="utf-8"))

    users = []
    for username, meta in asks.items():
        cf = CACHE / f"{username}.json"
        if not cf.exists():
            print(f"[skip] нет кэша для {username}", file=sys.stderr)
            continue
        prof = json.loads(cf.read_text(encoding="utf-8"))
        cols, give_text = linkedin_to_give(prof, "")
        extra = extract_domains_and_level(give_text)

        # ASK собираем РОВНО как в онбординге: 3 поля -> apply_to_user (склейка +
        # extract communication_style) -> generate_ask_vector_smart.
        draft = {
            "intent_goals": (meta.get("intent_goals") or "").strip(),
            "match_type": (meta.get("match_type") or "").strip(),
            "custom_request_raw": (meta.get("logistics") or meta.get("ask") or "").strip(),
        }
        patch = steps.apply_to_user(draft)
        user = {
            "user_id": username,
            "name": cols["name"],
            "city": TEST_CITY,                              # тест: всех в один город
            "languages": ["English"],                       # тест: априори English
            "education": cols["education"],
            "hard_skills": cols["hard_skills"],
            "domains": cols["domains"] or extra.get("domains", []),
            "experience_level": cols["experience_level"] or extra.get("experience_level", []),
            "current_status": cols["current_status"],
            "avatar": cols.get("avatar", ""),
            "experiences": cols.get("experiences", []),
            "projects": cols.get("projects", []),
            "honors": cols.get("honors", []),
            "communication_style": patch["communication_style"],
            "match_type": patch.get("match_type", "peer"),
            "intent_tag": patch.get("intent_tag", "peer_network"),
            "intent_goals": patch.get("intent_goals", []),
            "custom_request_raw": patch["custom_request_raw"],
            "give_vector": get_embedding(give_text) if give_text else None,
            "ask_vector": generate_ask_vector_smart(patch),
        }
        users.append(user)
        print(f"[ok] {username}: {len(user['hard_skills'])} skills, domains={user['domains']}", file=sys.stderr)

    out = HERE / "users.json"
    out.write_text(json.dumps(users, ensure_ascii=False), encoding="utf-8")
    print(f"[*] {len(users)} users -> {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
