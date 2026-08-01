# Security — базовый auth (baseline)

## Модель
Сессия = bearer-токен из таблицы `lk_tokens` (`token -> user_id`, случайный
`secrets.token_urlsafe(24)`, один на юзера). Выдаётся бэком на ВСЕХ входах и
возвращается в поле `token`:
- `POST /auth/verify_code` (существующий юзер)
- `POST /onboarding/web_start`, `POST /smart_ingest` (новый юзер)
- `GET  /lk/profile` (magic-link)

Фронт кладёт токен в `localStorage` (`coconect_token`) и шлёт его заголовком
`Authorization: Bearer <token>` — **глобально** через перехватчик `fetch`
(`app/lib/api.ts: installAuthInterceptor`), поэтому каждый запрос на `API_URL`
автоматически авторизован. Fallback — `?token=` в query.

## Принцип
Бэкенд НЕ доверяет `user_id` из тела/пути — личность берётся ИЗ токена
(`auth.py`):
- `require_uid` — 401, если нет валидной сессии.
- `assert_self(path_uid, session_uid)` — 403 при действии от чужого имени.
- `require_admin` — заголовок `X-Admin-Key == ADMIN_API_KEY`.

## Защищённые эндпоинты
- Профиль: `PATCH /users/{id}`, `POST /users/{id}/avatar`, `/pay-penalty` — только свой.
- `GET /users/{target}` — нужна сессия; чужая карточка отдаёт лишь публичные поля
  (без phone и векторов).
- Уведомления (list/unread/read-all) — только свои.
- События: `feed`, `join`, `cancel`, `confirm`, `details`, `candidates`, `reviews` —
  личность из сессии.
- Матчи: `search`, `teaser`, `matches/feedback`, `matches/confirmed`.
- Биллинг: `POST /billing/checkout` — uid из сессии (не из тела).
- `POST /subscription/purchase` — **только админ** (раньше любой мог выдать себе Premium).
- `/admin/*` — отдельный admin-токен (`admin_routes.py`).

Публичные (без сессии): `/`, `/auth/*`, `/onboarding/web_start`, `/smart_ingest`,
`/lk/request`, `/billing/webhook` (подписан Stripe).

## ⚠️ Обязательно задать в env
```
ADMIN_API_KEY="<длинный-секрет>"      # иначе /subscription/purchase закрыт для всех
ADMIN_LOGIN="..."
ADMIN_PASSWORD="<сильный>"
ADMIN_TOKEN="<длинный-секрет>"
```
Дефолтных значений нет: пока эти переменные не заданы, `/admin/*` отвечает 503.
Это осознанно — репозиторий публичный, любой дефолт был бы публичным паролем.

## Известные ограничения (приемлемо для пилота)
- Токен бессрочный (нет TTL/ротации). Для v2 — истечение + refresh.
- Старые сессии (user_id в localStorage без токена) после деплоя получат 401 →
  нужно перелогиниться (для не-живого пре-деплоя ок).
- HTTPS обязателен в проде (bearer в заголовке).
