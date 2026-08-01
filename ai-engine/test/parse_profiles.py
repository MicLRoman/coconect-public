"""
Шаг 1 теста: usernames.txt -> Apify -> сырые JSON в cache/ + сводка для LLM.

Запуск (из ai-engine):
    py test/parse_profiles.py

- usernames.txt: по одному LinkedIn URL/identifier на строку (# — коммент).
- Кэширует сырой ответ в test/cache/<identifier>.json (повтор не тратит Apify).
- Пишет test/profiles_for_llm.json — урезанные сводки, которые ты скормишь LLM,
  чтобы она накидала ASK + психопараметры (см. LLM_PROMPT.md).
"""
import json
import os
import re
import sys
from pathlib import Path

import httpx

ACTOR = "harvestapi~linkedin-profile-scraper"
HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache"


def get_token() -> str:
    tok = os.getenv("APIFY_TOKEN")
    if tok:
        return tok
    env_local = HERE.parent.parent / "web-app" / ".env.local"
    if env_local.exists():
        for line in env_local.read_text(encoding="utf-8").splitlines():
            if line.startswith("APIFY_TOKEN="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("APIFY_TOKEN не найден (env или web-app/.env.local)")


def normalize(raw: str) -> str:
    raw = raw.strip()
    m = re.search(r"linkedin\.com/in/([^/?#]+)", raw, re.I)
    return m.group(1) if m else raw


def fetch(query: str, token: str) -> dict:
    url = f"https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items?token={token}"
    body = {"profileScraperMode": "Profile details no email ($4 per 1k)", "queries": [query]}
    r = httpx.post(url, json=body, timeout=180)
    data = r.json()
    item = data[0] if isinstance(data, list) and data else data
    return item if isinstance(item, dict) else {"error": str(item)}


def summary(p: dict, username: str) -> dict:
    loc = p.get("location") or {}
    return {
        "username": username,
        "name": f"{p.get('firstName','')} {p.get('lastName','')}".strip(),
        "headline": p.get("headline", ""),
        "location": (loc.get("parsed") or {}).get("city") or loc.get("linkedinText", ""),
        "about": (p.get("about") or "")[:800],
        "topSkills": p.get("topSkills", ""),
        "experience": [{
            "position": e.get("position", ""),
            "company": e.get("companyName", ""),
            "description": (e.get("description") or "")[:300],
        } for e in (p.get("experience") or [])[:5]],
        "projects": [{"title": pr.get("title", ""), "description": (pr.get("description") or "")[:200]}
                     for pr in (p.get("projects") or [])[:5]],
    }


def main():
    CACHE.mkdir(exist_ok=True)
    ufile = HERE / "usernames.txt"
    if not ufile.exists():
        raise SystemExit(f"нет {ufile} — положи туда LinkedIn-username/URL по одному на строку")
    names = [ln.strip() for ln in ufile.read_text(encoding="utf-8").splitlines()
             if ln.strip() and not ln.strip().startswith("#")]
    token = get_token()

    summaries = []
    for raw in names:
        ident = normalize(raw)
        cf = CACHE / f"{ident}.json"
        if cf.exists():
            print(f"[cache] {ident}", file=sys.stderr)
            prof = json.loads(cf.read_text(encoding="utf-8"))
        else:
            print(f"[apify] {ident} ...", file=sys.stderr)
            prof = fetch(ident, token)
            cf.write_text(json.dumps(prof, ensure_ascii=False, indent=2), encoding="utf-8")
            if prof.get("error"):
                print(f"   !! error: {prof['error'][:80]}", file=sys.stderr)
        if prof.get("firstName"):
            summaries.append(summary(prof, ident))

    out = HERE / "profiles_for_llm.json"
    out.write_text(json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[*] {len(summaries)} профилей -> {out}", file=sys.stderr)
    print(f"[*] дальше: скорми {out.name} в LLM по LLM_PROMPT.md -> положи ответ в asks.json", file=sys.stderr)


if __name__ == "__main__":
    main()
