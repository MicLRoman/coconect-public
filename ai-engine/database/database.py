import os
import httpx
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Инициализация Supabase клиента
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[WARNING] SUPABASE_URL или SUPABASE_KEY не найдены. Проверьте .env файл!")

_client: Client | None = None


def get_supabase() -> Client:
    """Singleton Supabase-клиент с ретраем на обрыве коннекта.

    VPN/нестабильная сеть рвут TLS-хендшейк → httpcore.ConnectError
    ([SSL: UNEXPECTED_EOF_WHILE_READING]). httpx.HTTPTransport(retries=N) ретраит
    именно такие connection-ошибки, поэтому PostgREST-запросы переживают обрывы."""
    global _client
    if _client is None:
        c = create_client(SUPABASE_URL, SUPABASE_KEY)
        try:
            c.postgrest.session._transport = httpx.HTTPTransport(retries=5)
        except Exception:
            pass
        _client = c
    return _client
