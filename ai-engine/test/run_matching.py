"""
Шаг 4 теста: users.json -> пул-нормировка -> рассадка -> report.html.

Запуск (из ai-engine):
    py test/run_matching.py            # столы 5-6
    py test/run_matching.py 4 6        # min=4 max=6

report.html — состав столов (give + ask + психотип + парные скоры). Открой и
скопируй в LLM для оценки качества рассадки.
"""
import html
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from matching.scoring import calibrate_pool, pair_score, group_score, hard_constraints_violated
from matching.assembler import assemble_tables

HERE = Path(__file__).resolve().parent


def esc(x):
    return html.escape(str(x or ""))


def member_html(u: dict) -> str:
    st = u.get("current_status") or {}
    role = " @ ".join(x for x in [st.get("type"), st.get("company_name")] if x)
    domains = ", ".join(u.get("domains") or [])
    skills = ", ".join((u.get("hard_skills") or [])[:8])
    style = u.get("communication_style") or ""

    # GIVE / бэкграунд: образование + опыт (что человек ПРЕДЛАГАЕТ)
    edu = esc(u.get("education"))
    exp_lines = []
    for e in (u.get("experiences") or [])[:3]:
        line = " — ".join(x for x in [e.get("position"), e.get("company")] if x)
        if line:
            exp_lines.append(esc(line))
    exp_html = ("<div class='exp'>💼 " + " · ".join(exp_lines) + "</div>") if exp_lines else ""
    edu_html = (f"<div class='edu'>🎓 {edu}</div>") if edu else ""

    return f"""
    <div class="m">
      <div class="mh"><b>{esc(u.get('name') or u.get('user_id'))}</b>
        <span class="psy">{esc(style)}</span></div>
      <div class="role">{esc(role)}</div>
      {edu_html}
      {exp_html}
      <div class="dom">{esc(domains)}</div>
      <div class="sk">🛠 {esc(skills)}</div>
      <div class="ask">🎯 {esc(u.get('custom_request_raw'))}</div>
    </div>"""


def table_html(idx: int, table: list[dict], is_overflow: bool) -> str:
    if is_overflow:
        head = f"<h2 class='ov'>Overflow — не рассажены ({len(table)})</h2>"
        gs = ""
    else:
        head = f"<h2>Стол {idx} — {len(table)} чел.</h2>"
        gs = f"<div class='gs'>group_score = {group_score(table):.3f}</div>"
    members = "".join(member_html(u) for u in table)

    pairs = ""
    if not is_overflow and len(table) > 1:
        rows = []
        for i in range(len(table)):
            for j in range(i + 1, len(table)):
                ni = table[i].get("name") or table[i]["user_id"]
                nj = table[j].get("name") or table[j]["user_id"]
                rows.append(f"<tr><td>{esc(ni)} ↔ {esc(nj)}</td><td>{pair_score(table[i], table[j]):.3f}</td></tr>")
        pairs = f"<table class='pt'><tr><th>пара</th><th>pair_score</th></tr>{''.join(rows)}</table>"

    return f"<section class='{'ovsec' if is_overflow else 'tbl'}'>{head}{gs}<div class='ms'>{members}</div>{pairs}</section>"


def main():
    args = sys.argv[1:]
    tmin = int(args[0]) if len(args) > 0 else 5
    tmax = int(args[1]) if len(args) > 1 else 6

    users = json.loads((HERE / "users.json").read_text(encoding="utf-8"))
    p5, p95 = calibrate_pool(users)
    tables = assemble_tables(users, table_size_min=tmin, table_size_max=tmax)

    # последний бакет — overflow, если у кого-то < tmin (assembler так помечает)
    overflow_idx = len(tables) - 1 if tables and len(tables[-1]) < tmin else -1

    body = []
    seated = 0
    for i, t in enumerate(tables):
        is_ov = (i == overflow_idx)
        if not is_ov:
            seated += len(t)
        body.append(table_html(i + 1, t, is_ov))

    meta = (f"<div class='meta'>Пул: {len(users)} чел. · столы {tmin}–{tmax} · "
            f"рассажено {seated} · relevance pool p5={p5:.3f} p95={p95:.3f}</div>")

    doc = f"""<!doctype html><html><head><meta charset="utf-8"><title>Tablr — рассадка (тест)</title>
<style>
 body{{font-family:system-ui,sans-serif;background:#fafafa;color:#111;max-width:900px;margin:0 auto;padding:24px}}
 h1{{font-weight:800}} .meta{{background:#fff;border:2px solid #000;padding:8px 12px;font-weight:700;margin-bottom:16px}}
 section{{border:3px solid #000;border-radius:14px;padding:14px 16px;margin-bottom:18px;background:#fff;box-shadow:5px 5px 0 #000}}
 .ovsec{{background:#fff7cc}} h2{{margin:0 0 4px}} h2.ov{{color:#a16207}}
 .gs{{font-weight:700;color:#444;margin-bottom:8px}}
 .ms{{display:grid;grid-template-columns:1fr 1fr;gap:10px}}
 .m{{border:2px solid #000;border-radius:10px;padding:8px 10px;background:#fafafa}}
 .mh{{display:flex;justify-content:space-between;gap:8px}} .psy{{font-size:12px;color:#666}}
 .role{{font-weight:700;font-size:13px}} .dom{{font-size:12px;color:#2563eb}} .sk{{font-size:12px;color:#555;margin-top:2px}}
 .edu{{font-size:12px;color:#666;margin-top:2px}} .exp{{font-size:12px;color:#444;margin-top:2px}}
 .ask{{font-size:13px;margin-top:6px;background:#fde047;border:1px solid #000;padding:4px 6px;border-radius:6px}}
 .pt{{margin-top:10px;border-collapse:collapse;font-size:12px;width:100%}}
 .pt td,.pt th{{border:1px solid #ccc;padding:3px 6px;text-align:left}}
</style></head><body>
<h1>coconect — рассадка (тест)</h1>{meta}{''.join(body)}</body></html>"""

    out = HERE / "report.html"
    out.write_text(doc, encoding="utf-8")
    print(f"[*] {len([t for i,t in enumerate(tables) if i!=overflow_idx])} столов, рассажено {seated}/{len(users)}", file=sys.stderr)
    print(f"[*] отчёт -> {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
