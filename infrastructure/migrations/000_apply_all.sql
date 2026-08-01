-- ============================================================
-- 000_apply_all — единый идемпотентный bootstrap всей схемы Tablr.
-- Пастить целиком в Supabase SQL Editor. Безопасно запускать повторно.
-- Лечит частично накатанную базу: создаёт недостающие таблицы И
-- доливает недостающие колонки (включая ask_vector/give_vector).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------- USERS ----------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    name TEXT,
    city TEXT
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS inferred_segment TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_penalty BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'Starter';
ALTER TABLE users ADD COLUMN IF NOT EXISTS events_quota INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS events_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS available_formats JSONB DEFAULT '["Dinners"]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_level JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS domains JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hard_skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_status JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pace INTEGER DEFAULT 5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_battery TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS intents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_request_raw TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ask_vector vector(768);
ALTER TABLE users ADD COLUMN IF NOT EXISTS give_vector vector(768);
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users (phone) WHERE phone IS NOT NULL;

-- ---------------- EVENTS ----------------
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT,
    event_date DATE,
    start_time TIME
);
ALTER TABLE events ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS restaurant_name TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_tier TEXT DEFAULT 'Starter';
ALTER TABLE events ADD COLUMN IF NOT EXISTS pool_tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 60;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ask_budget BOOLEAN DEFAULT true;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ask_diet BOOLEAN DEFAULT true;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_matched_primary BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_matched_final BOOLEAN DEFAULT false;

-- ---------------- RESTAURANTS ----------------
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    neighborhood TEXT,
    budget_level TEXT,
    tables_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tables_count INTEGER DEFAULT 1;

-- ---------------- EVENT_TABLES ----------------
CREATE TABLE IF NOT EXISTS event_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    table_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE event_tables ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;
ALTER TABLE event_tables ADD COLUMN IF NOT EXISTS restaurant_name TEXT;
ALTER TABLE event_tables ADD COLUMN IF NOT EXISTS address TEXT;

-- ---------------- EVENT_RSVPS ----------------
CREATE TABLE IF NOT EXISTS event_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS energy_level TEXT;
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS budget_preference TEXT;
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS budget_pref TEXT;
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS diet TEXT;
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES event_tables(id) ON DELETE SET NULL;
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT false;
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS event_rsvps_user_event_unique ON event_rsvps (user_id, event_id);
CREATE INDEX IF NOT EXISTS event_rsvps_event_idx ON event_rsvps (event_id);
CREATE INDEX IF NOT EXISTS event_rsvps_user_idx ON event_rsvps (user_id);
CREATE INDEX IF NOT EXISTS events_city_date_idx ON events (city, event_date);

-- ---------------- MATCHES ----------------
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    user_a_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    user_b_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    match_score NUMERIC,
    breakdown JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (event_id, user_a_id, user_b_id)
);

-- ---------------- EVENT_REVIEWS ----------------
CREATE TABLE IF NOT EXISTS event_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    reviewer_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    rating INTEGER,
    liked_users JSONB DEFAULT '[]'::jsonb,
    disliked_users JSONB DEFAULT '[]'::jsonb,
    moderation_note TEXT,
    moderation_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (event_id, reviewer_id)
);

-- ---------------- USER_NOTIFICATIONS ----------------
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    kind TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_notifications_user_idx ON user_notifications (user_id, is_read);

-- ---------------- RLS (service-role bypass) ----------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['users','events','restaurants','event_tables','event_rsvps','matches','event_reviews','user_notifications'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'Service bypass ' || t) THEN
            EXECUTE format('CREATE POLICY %I ON %I USING (true) WITH CHECK (true)', 'Service bypass ' || t, t);
        END IF;
    END LOOP;
END $$;

-- Перезагружаем кэш схемы PostgREST (иначе новые колонки не видны до перезапуска).
NOTIFY pgrst, 'reload schema';
