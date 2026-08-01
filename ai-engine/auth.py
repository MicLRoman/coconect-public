"""
Минимальный, но «чёткий» auth для Coconect.

Модель: сессионный bearer-токен = строка в таблице lk_tokens (token -> user_id),
случайный secrets.token_urlsafe(24), один на юзера. Выдаётся на всех входах
(регистрация, онбординг, magic-link) и кладётся фронтом в localStorage; шлётся
заголовком `Authorization: Bearer <token>` (или ?token= как fallback).

Бэкенд НЕ доверяет user_id из тела/пути — личность берём ИЗ токена:
  • require_uid      — обязательная сессия (401 если нет/невалид)
  • assert_self      — путь/тело user_id обязан совпасть с токеном (403)
  • require_admin    — X-Admin-Key для админских ручек (бесплатная выдача тарифов и т.п.)
"""
import os

from fastapi import Header, Query, HTTPException

from database.database import get_supabase

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")


def resolve_token(token: str | None) -> str | None:
    """token -> user_id (или None)."""
    if not token:
        return None
    try:
        res = get_supabase().table("lk_tokens").select("user_id").eq("token", token).limit(1).execute()
        return res.data[0]["user_id"] if res.data else None
    except Exception:
        return None


def _extract(authorization: str | None, token_q: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return token_q


def require_uid(
    authorization: str | None = Header(default=None),
    token: str | None = Query(default=None),
) -> str:
    """FastAPI-зависимость: вернуть user_id из сессии или 401."""
    uid = resolve_token(_extract(authorization, token))
    if not uid:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return uid


def optional_uid(
    authorization: str | None = Header(default=None),
    token: str | None = Query(default=None),
) -> str | None:
    """Сессия по желанию (для публичных ручек, где иногда есть юзер)."""
    return resolve_token(_extract(authorization, token))


def assert_self(target_user_id: str, session_uid: str) -> None:
    """Запретить действия от чужого имени."""
    if target_user_id != session_uid:
        raise HTTPException(status_code=403, detail="Forbidden")


def require_admin(x_admin_key: str | None = Header(default=None, alias="X-Admin-Key")) -> bool:
    """Админская ручка: нужен заголовок X-Admin-Key == ADMIN_API_KEY."""
    if not ADMIN_API_KEY or x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Admin only")
    return True
