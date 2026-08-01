"""
Сырой дамп ответа LinkedIn-парсера (Apify harvestapi).

Запуск:
    cd ai-engine
    py scraper/dump_linkedin.py mikhail-shchegolev
    py scraper/dump_linkedin.py https://www.linkedin.com/in/mikhail-shchegolev/

Токен берёт из web-app/.env.local (APIFY_TOKEN) или из env APIFY_TOKEN.
Полный JSON сохраняет в scraper/last_linkedin.json и печатает в stdout.
"""
import json
import os
import re
import sys
from pathlib import Path

import httpx

ACTOR = "harvestapi~linkedin-profile-scraper"
HERE = Path(__file__).resolve().parent


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


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: py scraper/dump_linkedin.py <linkedin-url-or-identifier>")
    query = normalize(sys.argv[1])
    token = get_token()
    url = f"https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items?token={token}"
    body = {"profileScraperMode": "Profile details no email ($4 per 1k)", "queries": [query]}

    print(f"[*] query={query!r} -> Apify {ACTOR} ...", file=sys.stderr)
    r = httpx.post(url, json=body, timeout=180)
    print(f"[*] http {r.status_code}", file=sys.stderr)
    data = r.json()
    item = data[0] if isinstance(data, list) and data else data

    out = HERE / "last_linkedin.json"
    out.write_text(json.dumps(item, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[*] saved full JSON -> {out}", file=sys.stderr)

    print(json.dumps(item, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
