"""
Seed realistic data for local dev: full career profiles, London events,
a seated upcoming dinner (group reveal works), and a past dinner with
confirmed connections.

Run:  py seed_database.py
Then log in as the test user — printed at the end.
"""
import numpy as np
from datetime import datetime, timedelta
from database.database import get_supabase


def vec():
    v = np.random.rand(768)
    return (v / np.linalg.norm(v)).tolist()


MY_ID = "michael_super_admin"

# --- Full career profiles (London) ---------------------------------------
USERS = [
    {
        "user_id": MY_ID, "name": "Michael F.", "age": 29, "city": "London", "district": "Soho",
        "phone": "+19004002020", "onboarding_completed": True, "subscription_tier": "Premium",
        "events_quota": 4, "events_used": 0, "available_formats": ["Dinners", "Activities", "Quarterly City Meetup", "Special Formats"],
        "languages": ["English", "Russian"], "education": "Imperial College London",
        "experience_level": ["Senior", "Executive"], "domains": ["IT & Software"],
        "hard_skills": ["React", "Python", "ML / AI"],
        "current_status": {"type": "Business_Startup", "company_name": "Tablr", "stage": "Scaling"},
        "pace": 8, "social_battery": "Extrovert",
        "intents": ["intent:cofounder", "intent:network"],
        "custom_request_raw": "Looking for a technical co-founder and sharp operators in AI.",
    },
    {
        "user_id": "peer_sarah", "name": "Sarah J.", "age": 31, "city": "London", "district": "Shoreditch",
        "subscription_tier": "Core Membership", "languages": ["English"], "education": "LSE",
        "experience_level": ["Senior"], "domains": ["Marketing & PR"],
        "hard_skills": ["Go-to-Market", "B2B SaaS", "Performance"],
        "current_status": {"type": "Employment", "company_name": "Stripe", "stage": ""},
        "pace": 7, "social_battery": "Ambivert",
        "intents": ["intent:network"], "custom_request_raw": "Scaling GTM — happy to swap playbooks.",
    },
    {
        "user_id": "peer_alex", "name": "Alex M.", "age": 34, "city": "London", "district": "Mayfair",
        "subscription_tier": "Premium", "languages": ["English", "Russian"], "education": "Oxford",
        "experience_level": ["Executive"], "domains": ["Finance & Crypto"],
        "hard_skills": ["VC / Investing", "DeFi", "Financial Modeling"],
        "current_status": {"type": "Employment", "company_name": "Index Ventures", "stage": ""},
        "pace": 6, "social_battery": "Extrovert",
        "intents": ["intent:invest"], "custom_request_raw": "Meeting founders in fintech and AI.",
    },
    {
        "user_id": "peer_nikita", "name": "Nikita K.", "age": 27, "city": "London", "district": "Soho",
        "subscription_tier": "Starter", "languages": ["English", "Russian"], "education": "MIPT",
        "experience_level": ["Middle", "Senior"], "domains": ["IT & Software"],
        "hard_skills": ["Python", "Backend", "DevOps"],
        "current_status": {"type": "Employment", "company_name": "Revolut", "stage": ""},
        "pace": 7, "social_battery": "Introvert",
        "intents": ["intent:mentorship"], "custom_request_raw": "Want to learn from founders who scaled infra.",
    },
    {
        "user_id": "peer_dana", "name": "Dana R.", "age": 30, "city": "London", "district": "Camden",
        "subscription_tier": "Core Membership", "languages": ["English", "Spanish"], "education": "UCL",
        "experience_level": ["Senior"], "domains": ["Creative & Design"],
        "hard_skills": ["Figma", "Branding", "UX/UI"],
        "current_status": {"type": "Freelance_Nomad", "company_name": "", "stage": ""},
        "pace": 5, "social_battery": "Ambivert",
        "intents": ["intent:network", "intent:cofounder"], "custom_request_raw": "Design partner for a consumer app.",
    },
    {
        "user_id": "peer_omar", "name": "Omar H.", "age": 33, "city": "London", "district": "Canary Wharf",
        "subscription_tier": "Premium", "languages": ["English"], "education": "Cambridge",
        "experience_level": ["Executive"], "domains": ["Consulting"],
        "hard_skills": ["Strategy", "M&A", "Operations"],
        "current_status": {"type": "Employment", "company_name": "McKinsey", "stage": ""},
        "pace": 6, "social_battery": "Extrovert",
        "intents": ["intent:network"], "custom_request_raw": "Exploring a move from consulting into a startup.",
    },
    {
        "user_id": "peer_priya", "name": "Priya S.", "age": 28, "city": "London", "district": "Notting Hill",
        "subscription_tier": "Core Membership", "languages": ["English"], "education": "Imperial College London",
        "experience_level": ["Senior"], "domains": ["Healthcare"],
        "hard_skills": ["HealthTech", "Biotech", "Clinical Research"],
        "current_status": {"type": "Business_Startup", "company_name": "VitaLabs", "stage": "Idea / MVP"},
        "pace": 8, "social_battery": "Ambivert",
        "intents": ["intent:cofounder", "intent:invest"], "custom_request_raw": "Raising pre-seed for a healthtech MVP.",
    },
]


def seed_database():
    sb = get_supabase()
    print("🧹 Clearing old data...")
    sb.table("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    sb.table("event_reviews").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    sb.table("event_rsvps").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    sb.table("event_tables").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    sb.table("events").delete().neq("id", "__none__").execute()
    sb.table("users").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    print("👥 Creating users with full career profiles...")
    for u in USERS:
        u = {**u, "ask_vector": vec(), "give_vector": vec()}
        sb.table("users").insert(u).execute()

    now = datetime.now()
    print("📅 Creating London events...")
    events = [
        {"id": "ev_open", "title": "Founder Dinner", "city": "London",
         "event_date": (now + timedelta(days=4)).strftime("%Y-%m-%d"), "start_time": "19:30:00",
         "type": "dinner", "status": "open", "required_tier": "Starter",
         "pool_tags": ["Founder", "VC", "Product"], "ask_budget": True, "ask_diet": True,
         "description": "Intimate dinner for founders and operators in London."},
        {"id": "ev_tonight", "title": "Tonight's Strategy Dinner", "city": "London",
         "event_date": (now + timedelta(hours=18)).strftime("%Y-%m-%d"),
         "start_time": (now + timedelta(hours=18)).strftime("%H:%M:%S"),
         "type": "dinner", "status": "closed", "required_tier": "Starter",
         "restaurant_name": "Dishoom Soho", "address": "22 Kingly St, London",
         "pool_tags": ["CTO", "Founder", "VC"]},
        {"id": "ev_past", "title": "Last Week's Dinner", "city": "London",
         "event_date": (now - timedelta(days=3)).strftime("%Y-%m-%d"), "start_time": "19:00:00",
         "type": "dinner", "status": "passed", "required_tier": "Starter",
         "restaurant_name": "The Wolseley", "address": "160 Piccadilly, London"},
    ]
    for ev in events:
        sb.table("events").insert(ev).execute()

    # --- Upcoming dinner: seat everyone at one table so group reveal works ---
    print("🪑 Seating tonight's dinner...")
    tonight_guests = [MY_ID, "peer_sarah", "peer_alex", "peer_nikita", "peer_dana"]
    table = sb.table("event_tables").insert({
        "event_id": "ev_tonight", "table_number": 1,
        "restaurant_name": "Dishoom Soho", "address": "22 Kingly St, London",
    }).execute()
    table_id = table.data[0]["id"]
    for uid in tonight_guests:
        sb.table("event_rsvps").insert({
            "user_id": uid, "event_id": "ev_tonight", "status": "matched",
            "is_confirmed": uid != MY_ID, "table_id": table_id,
            "neighborhood": "Soho", "budget_pref": "$$ (Under 70)", "diet": "No restrictions",
        }).execute()

    # --- Past dinner: attended + confirmed connections for Michael ----------
    print("🤝 Past dinner + confirmed connections...")
    past_peers = ["peer_alex", "peer_dana", "peer_omar"]
    for uid in [MY_ID] + past_peers:
        sb.table("event_rsvps").insert({
            "user_id": uid, "event_id": "ev_past", "status": "matched",
        }).execute()
    for uid in past_peers:
        sb.table("matches").insert({
            "event_id": "ev_past", "user_a_id": MY_ID, "user_b_id": uid,
            "match_score": 100, "breakdown": {"source": "seed"},
        }).execute()

    my = next(u for u in USERS if u["user_id"] == MY_ID)
    print("\n✅ DONE.")
    print("   Log in by PHONE (recommended): open /start → Log in (or /registration?mode=login),")
    print(f"   enter phone:  {my['phone']}   then any code (e.g. 0000).")
    print("   Other peers (not for login): " + ", ".join(u["user_id"] for u in USERS if u["user_id"] != MY_ID))
    print("\n   Fallback (browser console):")
    print(f"   localStorage.setItem('coconect_user_id', '{MY_ID}'); location.reload();")


if __name__ == "__main__":
    seed_database()
