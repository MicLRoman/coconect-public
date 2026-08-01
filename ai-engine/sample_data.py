import random
import uuid
import numpy as np
from datetime import datetime, timedelta
from database.database import get_supabase

def generate_random_vector():
    """Генерирует случайный 768-мерный нормализованный вектор для тестов"""
    v = np.random.rand(768)
    return (v / np.linalg.norm(v)).tolist()

# ==========================================
# СПРАВОЧНИКИ ДЛЯ ГЕНЕРАЦИИ ДАННЫХ
# ==========================================
NAMES = ["Alex", "Dmitrii", "Anna", "Sarah", "Michael", "John", "Emma", "Jessica", "David", "James", "Elena", "Viktor"]
CITIES = ["London"] # Сосредоточимся на Лондоне для плотности
DISTRICTS = ["Soho", "Camden", "Islington", "Chelsea", "City of London"]
LANGUAGES = ["English", "Russian", "Spanish"]
UNIVERSITIES = ["Oxford", "Cambridge", "Imperial College", "LSE", "UCL"]
EXPERIENCE_LEVELS = ["Beginner_Student", "Middle_Specialist", "Senior_Lead", "Executive_Founder"]
DOMAINS = ["IT & Software", "Finance & Crypto", "Marketing & PR", "Creative & Design", "EdTech"]
SKILLS = ["Python", "React", "Data Science", "Venture Capital", "Figma", "SEO", "System Architecture", "Leadership", "Go-to-Market"]
STATUS_TYPES = ["Employment", "Business_Startup", "Freelance_Nomad"]
SOCIAL_BATTERY = ["Introvert", "Ambivert", "Extrovert"]
INTENTS = ["intent:new_in_town", "intent:career_top_tier", "intent:cofounder", "intent:mentorship", "intent:casual_network"]
ENERGY_LEVELS = ["Chill", "Active"]
BUDGETS = ["$ (Under 30€)", "$$ (Under 70€)", "$$$ (No Limit)"]

def create_mock_events(supabase):
    print("📅 Создаем тестовые мероприятия (Events)...")
    today = datetime.now()
    
    events = [
        {
            "id": "ev_past",
            "title": "Private Founder Brunch",
            "event_date": (today - timedelta(days=5)).strftime("%Y-%m-%d"),
            "start_time": "12:00:00",
            "type": "brunch",
            "restaurant_name": "The Wolseley",
            "address": "160 Piccadilly, London",
            "status": "passed",
            "required_tier": "Premium",
            "pool_tags": ["Founder", "Investor"],
            "description": "High-level brunch for established founders. (PASSED)"
        },
        {
            "id": "ev_today",
            "title": "Curated Builders Dinner",
            "event_date": today.strftime("%Y-%m-%d"),
            "start_time": "19:00:00",
            "type": "dinner",
            "restaurant_name": "Dishoom Soho",
            "address": "22 Kingly St, London",
            "status": "closed", # Регистрация закрыта, столы распределены
            "required_tier": "Starter",
            "pool_tags": ["Developer", "Product", "Design"],
            "description": "Your upcoming curated dinner tonight. Get ready!"
        },
        {
            "id": "ev_future",
            "title": "Tech & Coffee Mingle",
            "event_date": (today + timedelta(days=3)).strftime("%Y-%m-%d"),
            "start_time": "10:30:00",
            "type": "coffee",
            "restaurant_name": None, # Место еще не определено
            "address": None,
            "status": "open",
            "required_tier": "Core Membership",
            "pool_tags": ["Open Networking", "Chill"],
            "description": "Casual morning coffee for IT professionals. Location TBA."
        }
    ]
    
    for ev in events:
        try:
            supabase.table("events").upsert(ev).execute()
            print(f"  ✅ Ивент '{ev['title']}' создан.")
        except Exception as e:
            print(f"  ❌ Ошибка создания ивента {ev['id']}: {e}")
            
    return events

def seed_database(num_users=30):
    supabase = get_supabase()
    
    # 1. Сначала создаем ивенты
    create_mock_events(supabase)
    
    print(f"\n👥 Генерируем {num_users} пользователей...")
    user_ids = []
    
    for i in range(num_users):
        user_id = f"mock_usr_{uuid.uuid4().hex[:8]}"
        user_ids.append(user_id)
        
        status_type = random.choice(STATUS_TYPES)
        current_status = {"type": status_type}
        if status_type == "Employment":
            current_status["company_name"] = random.choice(["Google", "Revolut", "Monzo", "DeepMind", "Amazon"])
        elif status_type == "Business_Startup":
            current_status["company_name"] = f"Startup {random.randint(1, 100)}"
            current_status["stage"] = random.choice(["Idea / MVP", "Seed", "Series A"])
            
        user_data = {
            "user_id": user_id,
            "name": f"{random.choice(NAMES)} {chr(random.randint(65, 90))}.",
            "city": "London",
            "district": random.choice(DISTRICTS),
            "languages": random.sample(LANGUAGES, k=random.randint(1, 2)),
            "inferred_segment": "Startups_Builders",
            "subscription_tier": random.choice(["Starter", "Core Membership", "Premium"]),
            "education": random.choice(UNIVERSITIES),
            "experience_level": random.sample(EXPERIENCE_LEVELS, k=random.randint(1, 2)),
            "domains": random.sample(DOMAINS, k=random.randint(1, 2)),
            "hard_skills": random.sample(SKILLS, k=random.randint(2, 4)),
            "current_status": current_status,
            "pace": random.randint(3, 9),
            "social_battery": random.choice(SOCIAL_BATTERY),
            "intents": random.sample(INTENTS, k=1),
            "custom_request_raw": "Looking for cool people to build with.",
            "ask_vector": generate_random_vector(),
            "give_vector": generate_random_vector()
        }
        
        try:
            supabase.table("users").insert(user_data).execute()
        except Exception as e:
            print(f"  ❌ Ошибка создания юзера: {e}")

    print(f"✅ Создано {len(user_ids)} пользователей.")

    # ==========================================
    # ИМИТАЦИЯ ЖИЗНИ ПРИЛОЖЕНИЯ
    # ==========================================
    print("\n🎭 Раскидываем пользователей по мероприятиям...")
    
    # 1. Прошедший ивент (ev_past) - имитируем прошедший мэтч
    past_participants = random.sample(user_ids, 4)
    for uid in past_participants:
        supabase.table("event_rsvps").insert({
            "user_id": uid, "event_id": "ev_past", "status": "matched"
        }).execute()
        
    # Создаем записи в matches, как будто они сидели за одним столом
    # (Для простоты свяжем первого со вторым, третьего с четвертым)
    try:
        supabase.table("matches").insert({
            "event_id": "ev_past", "user_a_id": past_participants[0], "user_b_id": past_participants[1], "match_score": 0.85
        }).execute()
        supabase.table("matches").insert({
            "event_id": "ev_past", "user_a_id": past_participants[2], "user_b_id": past_participants[3], "match_score": 0.92
        }).execute()
        print("  ✅ Сгенерированы прошедшие встречи (Matches) для вкладки Network -> Pending Review.")
    except Exception as e:
         print(f"  ❌ Ошибка при создании мэтчей: {e}")

    # 2. Сегодняшний ивент (ev_today) - юзеры в ожидании ужина
    today_participants = random.sample(user_ids, 8)
    for uid in today_participants:
        supabase.table("event_rsvps").insert({
            "user_id": uid, "event_id": "ev_today", "status": "matched", 
            "energy_level": "Active", "budget_preference": "$$ (Under 70€)"
        }).execute()
    print("  ✅ 8 человек записаны на сегодняшний ужин.")

    # 3. Будущий ивент (ev_future) - Открытый пул (Open Pool)
    future_participants = random.sample(user_ids, 15)
    for uid in future_participants:
        supabase.table("event_rsvps").insert({
            "user_id": uid, "event_id": "ev_future", "status": "pending",
            "energy_level": random.choice(ENERGY_LEVELS), "budget_preference": random.choice(BUDGETS)
        }).execute()
    print("  ✅ 15 человек висят в пуле на будущий ивент (Open Pool).")

    print("\n🎉 БАЗА УСПЕШНО ПРОКАЧАНА! Можно открывать Feed.")

if __name__ == "__main__":
    # Выполни этот скрипт один раз!
    seed_database(num_users=30)