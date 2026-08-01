import numpy as np
import json
from typing import List, Dict
from database.database import get_supabase

supabase = get_supabase()

def cosine_similarity(v1, v2) -> float:
    if not v1 or not v2: return 0.0
    
    # ФИКС: Если вектор пришел из Supabase как строка, парсим его в список
    if isinstance(v1, str):
        v1 = json.loads(v1)
    if isinstance(v2, str):
        v2 = json.loads(v2)
        
    # Явно указываем dtype=float, чтобы numpy не сомневался
    v1_np, v2_np = np.array(v1, dtype=float), np.array(v2, dtype=float)
    norm = np.linalg.norm(v1_np) * np.linalg.norm(v2_np)
    return float(np.dot(v1_np, v2_np) / norm) if norm > 0 else 0.0

def get_tier1_teaser_pool(user_id: str, event_id: str, query: str = "") -> list:
    """Tier 1: Быстрый поиск кандидатов по ключевым словам."""
    print(f"[TIER 1] Fetching teaser pool for {user_id} with query '{query}'")
    try:
        supabase = get_supabase()
        # Достаем всех из пула
        res = supabase.table("event_rsvps").select("user_id, users(*)").eq("event_id", event_id).execute()
        candidates = [item for item in res.data if item['user_id'] != user_id]
        
        teaser_pool = []
        q = query.lower()
        
        for c in candidates:
            user = c['users']
            # Собираем весь текст юзера в одну строку для удобного поиска
            searchable_text = f"{user.get('name', '')} {' '.join(user.get('hard_skills', []))} {' '.join(user.get('domains', []))}".lower()
            
            # Если запрос пустой ИЛИ слово найдено в тексте
            if not q or q in searchable_text:
                teaser_pool.append({
                    "id": user.get("user_id"),
                    "name": user.get("name"),
                    "district": user.get("district"),
                    "role": (user.get("domains") or ["Member"])[0], # Берем первый домен как роль
                    "skills": user.get("hard_skills", [])[:3] # Отдаем 3 скилла для бейджиков
                })
        
        return teaser_pool[:10] # Возвращаем топ-10
    except Exception as e:
        print(f"[ERROR] Tier 1 Match failed: {e}")
        return []

def execute_tier2_deep_match(user_a_id: str, event_id: str) -> List[dict]:
    """
    Tier 2 (Deep Match): Финальная математика для рассадки за стол.
    Использует ту же логику, что и основной ассемблер (scoring.py).
    """
    print(f"\n========== TIER 2 DEEP MATCHING STARTED FOR {user_a_id} ==========")
    
    try:
        from matching.scoring import pair_score, hard_constraints_violated, calibrate_pool
        from matching.seating import _attach_feedback_history
        user_a_res = supabase.table("users").select("*").eq("user_id", user_a_id).execute()
        rsvp_a_res = supabase.table("event_rsvps").select("*").eq("user_id", user_a_id).eq("event_id", event_id).execute()
        
        if not user_a_res.data or not rsvp_a_res.data:
            raise Exception("User A or RSVP not found in Database")
            
        a = user_a_res.data[0]
        rsvp_a = rsvp_a_res.data[0]
        a["_rsvp"] = rsvp_a
        
        # Получаем всех кандидатов на этот же ивент
        candidates_res = supabase.table("event_rsvps").select("*, users(*)").eq("event_id", event_id).neq("user_id", user_a_id).execute()
        candidates = candidates_res.data
        
    except Exception as e:
        print(f"[ERROR] Database fetch failed: {e}")
        return []

    # Идентично рассадке: пул-нормировка relevance + история фидбека по пулу события.
    pool = [a] + [row["users"] for row in candidates]
    for row in candidates:
        row["users"]["_rsvp"] = row
    try:
        calibrate_pool(pool)
        _attach_feedback_history(pool)
    except Exception as e:
        print(f"[WARN] calibrate/history skipped: {e}")

    results = []

    for row in candidates:
        b = row['users']
        b["_rsvp"] = row  # Подмешиваем RSVP как в scoring.py
        
        # --- HARD FILTER ---
        hc_reason = hard_constraints_violated(a, b)
        if hc_reason:
            print(f"Skipping {b.get('name')}: {hc_reason}")
            continue
            
        # --- FINAL MATH из scoring.py ---
        final_score = pair_score(a, b)
        
        # Context bonuses for breakdown (опционально для UI, но не влияют на ядро)
        a_skills, b_skills = set(a.get('hard_skills', [])), set(b.get('hard_skills', []))
        overlap = list(a_skills.intersection(b_skills)) if a_skills and b_skills else []
        
        results.append({
            "user_id": b.get("user_id"),
            "name": b.get("name"),
            "score": float(final_score),
            "breakdown": {
                "score": round(final_score, 3),
                "shared_skills": overlap[:3],
                "alumni": a.get('education') and a.get('education') == b.get('education')
            }
        })
        
    results.sort(key=lambda x: x["score"], reverse=True)
    print(f"[SUCCESS] Top Match Score: {results[0]['score'] if results else 'None'}")
    return results[:5]