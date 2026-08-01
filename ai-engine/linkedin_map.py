"""
LinkedIn (HarvestAPI / Apify) profile -> Tablr GIVE.

Маппинг сырого профиля от actor `harvestapi~linkedin-profile-scraper` в:
  • колонки users (languages, education, hard_skills, current_status, city, ...)
  • rich-текст для give_vector (headline + about + опыт + скиллы — см. §7 дизайна).

Структурные поля нужны для hard-constraints (язык!) и отображения в ЛК.
Семантику тянет give_vector из rich-текста, поэтому в него кладём максимум смысла.
"""
from typing import Any


def _txt(x) -> str:
    return (x or "").strip() if isinstance(x, str) else ""


def linkedin_to_give(profile: dict[str, Any], form_name: str = "") -> tuple[dict, str]:
    """Возвращает (columns, give_text)."""
    profile = profile or {}
    # /api/linkedin отдаёт { profile: {...} } — разворачиваем обёртку, если пришла.
    if isinstance(profile.get("profile"), dict):
        profile = profile["profile"]

    first = _txt(profile.get("firstName"))
    last = _txt(profile.get("lastName"))
    full_name = _txt(form_name) or f"{first} {last}".strip()

    headline = _txt(profile.get("headline"))
    about = _txt(profile.get("about"))

    # Город: предпочитаем нормализованный parsed.city, иначе первый сегмент free-text.
    loc = profile.get("location") or {}
    parsed = loc.get("parsed") or {}
    location = _txt(parsed.get("city")) or _txt(loc.get("linkedinText")).split(",")[0].strip()

    experience = profile.get("experience") or []
    education = profile.get("education") or []
    languages = [_txt(l.get("name")) for l in (profile.get("languages") or []) if _txt(l.get("name"))]

    # СКИЛЛЫ — агрегируем из всех источников (топ-level skills часто пуст; реальные
    # скиллы в topSkills и в КАЖДОМ experience[].skills[]). Дедуп без потери порядка.
    def _add(dst: list[str], seen: set[str], name: str):
        n = _txt(name)
        if n and n.lower() not in seen:
            seen.add(n.lower())
            dst.append(n)

    skills: list[str] = []
    _seen: set[str] = set()
    for s in (profile.get("skills") or []):           # топ-level (часто [])
        _add(skills, _seen, s.get("name") if isinstance(s, dict) else s)
    for s in _txt(profile.get("topSkills")).split("•"):  # строка через •
        _add(skills, _seen, s)
    for exp in experience:                             # из каждого места работы
        for s in (exp.get("skills") or []):
            _add(skills, _seen, s if isinstance(s, str) else (s.get("name") if isinstance(s, dict) else ""))

    # current_status: приоритет currentPosition, иначе последний опыт, иначе headline
    current_position = profile.get("currentPosition") or []
    cur = current_position[0] if current_position else (experience[0] if experience else {})
    current_status = {
        "type": _txt(cur.get("position")) or headline,
        "company_name": _txt(cur.get("companyName")),
        "stage": "",
    }

    # аватар из фото LinkedIn
    avatar = _txt(profile.get("photo")) or _txt((profile.get("profilePicture") or {}).get("url"))

    # education -> строка верхнего образования
    edu_str = ""
    if education:
        e = education[0]
        edu_str = " ".join(x for x in [_txt(e.get("schoolName")), _txt(e.get("degree")),
                                       _txt(e.get("fieldOfStudy"))] if x)

    # --- структурные блоки для ЛК/айсбрейкеров (не в матчинг) ---
    structured_exp = [{
        "position": _txt(e.get("position")),
        "company": _txt(e.get("companyName")),
        "duration": _txt(e.get("duration")),
        "description": _txt(e.get("description")),
        "skills": [s for s in (e.get("skills") or []) if isinstance(s, str)],
    } for e in experience[:10] if _txt(e.get("position")) or _txt(e.get("companyName"))]

    structured_proj = [{
        "title": _txt(p.get("title")),
        "duration": _txt(p.get("duration")),
        "description": _txt(p.get("description")),
    } for p in (profile.get("projects") or [])[:10] if _txt(p.get("title"))]

    structured_honors = [{
        "title": _txt(h.get("title")),
        "issued_by": _txt(h.get("issuedBy")),
        "description": _txt(h.get("description")),
    } for h in (profile.get("honorsAndAwards") or [])[:10] if _txt(h.get("title"))]

    columns = {
        "name": full_name,
        "city": location,
        "languages": languages,
        "education": edu_str,
        "hard_skills": skills,
        "domains": [],            # заполняется LLM-extraction (llm_extract), иначе []
        "experience_level": [],   # заполняется LLM-extraction, иначе []
        "current_status": current_status,
        "avatar": avatar,
        "experiences": structured_exp,
        "projects": structured_proj,
        "honors": structured_honors,
    }

    # --- rich give-текст для эмбеддинга (несёт всю семантику) ---
    exp_lines = []
    for e in experience[:6]:
        line = " — ".join(x for x in [_txt(e.get("position")), _txt(e.get("companyName"))] if x)
        desc = _txt(e.get("description"))
        if desc:
            line = f"{line}: {desc}"
        if line:
            exp_lines.append(line)

    proj_lines = []
    for p in (profile.get("projects") or [])[:6]:
        line = _txt(p.get("title"))
        desc = _txt(p.get("description"))
        if desc:
            line = f"{line}: {desc}" if line else desc
        if line:
            proj_lines.append(line)

    honors = []
    for h in (profile.get("honorsAndAwards") or [])[:5]:
        line = " — ".join(x for x in [_txt(h.get("title")), _txt(h.get("issuedBy"))] if x)
        if _txt(h.get("description")):
            line = f"{line}: {_txt(h.get('description'))}" if line else _txt(h.get("description"))
        if line:
            honors.append(line)

    certs = [_txt(c.get("name") or c.get("title")) for c in (profile.get("certifications") or []) if _txt(c.get("name") or c.get("title"))]
    pubs = [_txt(p.get("title") or p.get("name")) for p in (profile.get("publications") or []) if _txt(p.get("title") or p.get("name"))]
    courses = [_txt(c.get("name") or c.get("title")) for c in (profile.get("courses") or []) if _txt(c.get("name") or c.get("title"))]

    give_text = ". ".join(filter(None, [
        f"Name: {full_name}" if full_name else "",
        f"Headline: {headline}" if headline else "",
        f"Location: {location}" if location else "",
        f"About: {about}" if about else "",
        f"Education: {edu_str}" if edu_str else "",
        f"Experience: {'; '.join(exp_lines)}" if exp_lines else "",
        f"Projects: {'; '.join(proj_lines)}" if proj_lines else "",
        f"Awards: {'; '.join(honors)}" if honors else "",
        f"Certifications: {', '.join(certs)}" if certs else "",
        f"Publications: {', '.join(pubs)}" if pubs else "",
        f"Courses: {', '.join(courses)}" if courses else "",
        f"Skills: {', '.join(skills)}" if skills else "",
        f"Languages: {', '.join(languages)}" if languages else "",
    ]))

    return columns, give_text
