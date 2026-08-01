-- Включаем расширение для векторов (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Создаем таблицу пользователей
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL, -- Кастомный или внешний ID
    name TEXT NOT NULL,
    age INTEGER,
    city TEXT NOT NULL,
    district TEXT,
    languages JSONB DEFAULT '[]'::jsonb,

    inferred_segment TEXT,

    -- Идентичность / контакт (вход по телефону, без Telegram)
    phone TEXT,
    avatar TEXT,
    onboarding_completed BOOLEAN DEFAULT false,
    has_penalty BOOLEAN DEFAULT false,

    -- Подписка и квоты
    subscription_tier TEXT DEFAULT 'Starter', -- Starter | Core Membership | Premium
    events_quota INTEGER DEFAULT 1,
    events_used INTEGER DEFAULT 0,
    available_formats JSONB DEFAULT '["Dinners"]'::jsonb,

    -- Блок 'Gives' (Что юзер предлагает)
    education TEXT,
    experience_level JSONB DEFAULT '[]'::jsonb,
    domains JSONB DEFAULT '[]'::jsonb,
    hard_skills JSONB DEFAULT '[]'::jsonb,
    current_status JSONB DEFAULT '{}'::jsonb,

    -- Рабочий вайб
    pace INTEGER DEFAULT 5,
    social_battery TEXT,

    -- Блок 'Asks' (Что юзер ищет)
    intents JSONB DEFAULT '[]'::jsonb,
    custom_request_raw TEXT,

    -- Векторы от Gemini (768d)
    ask_vector vector(768),
    give_vector vector(768),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique
    ON users (phone) WHERE phone IS NOT NULL;

-- 2. Создаем таблицу мероприятий (ОНА ДОЛЖНА БЫТЬ ДО RSVP)
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    city TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    type TEXT, -- dinner, sport, brunch
    restaurant_name TEXT,
    address TEXT,
    status TEXT DEFAULT 'open', -- open, closed, passed
    required_tier TEXT DEFAULT 'Starter',
    pool_tags JSONB DEFAULT '[]'::jsonb, -- ['CTO', 'Founder']
    description TEXT,
    capacity INTEGER DEFAULT 60,
    -- Какие шаги спрашивать при записи (mirrors okruzhai)
    ask_budget BOOLEAN DEFAULT true,
    ask_diet BOOLEAN DEFAULT true,
    -- Флаги рассадки (две стадии мэтчинга)
    is_matched_primary BOOLEAN DEFAULT false,
    is_matched_final BOOLEAN DEFAULT false
);

-- Рестораны (для назначения столам в админке)
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    neighborhood TEXT,
    budget_level TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Столы (рассадка по 5-6 человек)
CREATE TABLE IF NOT EXISTS event_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    table_number INTEGER,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    restaurant_name TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Создаем таблицу регистраций (RSVP)
CREATE TABLE IF NOT EXISTS event_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,

    -- Vibe Now (Текущий контекст ивента)
    energy_level TEXT,
    budget_preference TEXT,

    -- Ответы при записи по шагам
    neighborhood TEXT,
    budget_pref TEXT,
    diet TEXT,

    -- Результат рассадки
    table_id UUID REFERENCES event_tables(id) ON DELETE SET NULL,
    is_confirmed BOOLEAN DEFAULT false,

    status TEXT DEFAULT 'pending', -- pending, matched, cancelled

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS event_rsvps_user_event_unique
    ON event_rsvps (user_id, event_id);
CREATE INDEX IF NOT EXISTS event_rsvps_event_idx ON event_rsvps (event_id);
CREATE INDEX IF NOT EXISTS event_rsvps_user_idx ON event_rsvps (user_id);
CREATE INDEX IF NOT EXISTS events_city_date_idx ON events (city, event_date);

-- 5. Создаем таблицу мэтчей (подтверждённые связи)
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    user_a_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    user_b_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,

    match_score NUMERIC,
    breakdown JSONB, -- Разбивка скора (состав полей вырезан из публичной версии)

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (event_id, user_a_id, user_b_id)
);

-- 6. Отзывы после ужина
CREATE TABLE IF NOT EXISTS event_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    reviewer_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    rating INTEGER,
    liked_users JSONB DEFAULT '[]'::jsonb,
    disliked_users JSONB DEFAULT '[]'::jsonb,
    moderation_note TEXT,
    moderation_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (event_id, reviewer_id)
);

-- ==========================================
-- НАСТРОЙКА БЕЗОПАСНОСТИ (RLS Политики)
-- ==========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;

-- Разрешаем нашему бэкенду (Service Role) делать с базой всё что угодно
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Service bypass users') THEN
        CREATE POLICY "Service bypass users" ON users USING (true); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='events' AND policyname='Service bypass events') THEN
        CREATE POLICY "Service bypass events" ON events USING (true); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='restaurants' AND policyname='Service bypass restaurants') THEN
        CREATE POLICY "Service bypass restaurants" ON restaurants USING (true); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_tables' AND policyname='Service bypass event_tables') THEN
        CREATE POLICY "Service bypass event_tables" ON event_tables USING (true); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_rsvps' AND policyname='Service bypass rsvps') THEN
        CREATE POLICY "Service bypass rsvps" ON event_rsvps USING (true); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matches' AND policyname='Service bypass matches') THEN
        CREATE POLICY "Service bypass matches" ON matches USING (true); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_reviews' AND policyname='Service bypass event_reviews') THEN
        CREATE POLICY "Service bypass event_reviews" ON event_reviews USING (true); END IF;
END $$;
