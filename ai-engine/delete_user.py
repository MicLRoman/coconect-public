import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
phone = sys.argv[1] if len(sys.argv) > 1 else "+10000000000"

try:
    print(f"Deleting user with phone: {phone}")
    response = supabase.table("users").delete().eq("phone", phone).execute()
    print("Users response:", response.data)

    print(f"Deleting WA conversation state for phone: {phone}")
    wa_response = supabase.table("wa_conversations").delete().eq("phone", phone).execute()
    print("WA response:", wa_response.data)

    # Лид воронки (сайт пишет по lead_id браузера, WA-регистрация — wa_<номер>).
    print(f"Deleting leads for phone: {phone}")
    leads_response = supabase.table("leads").delete().eq("phone", phone).execute()
    print("Leads response:", leads_response.data)
except Exception as e:
    print("Error:", e)
