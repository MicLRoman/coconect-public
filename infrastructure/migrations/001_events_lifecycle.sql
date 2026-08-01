-- ============================================================
-- Migration 001: Event lifecycle + phone auth + table seating
-- Ported (adapted) from the okruzhai project into Tablr.
-- Idempotent: safe to run multiple times against an existing DB.
-- ============================================================

-- ---------- USERS: phone auth + penalty + avatar ----------
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_penalty BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Phone is the login identity → unique (NULLs allowed for legacy rows).
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique
    ON users (phone) WHERE phone IS NOT NULL;

-- ---------- EVENTS: city scoping + matching flags ----------
ALTER TABLE events ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_matched_primary BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_matched_final BOOLEAN DEFAULT false;
-- Per-event toggles for which join steps to ask (mirrors okruzhai event.ask_*).
ALTER TABLE events ADD COLUMN IF NOT EXISTS ask_budget BOOLEAN DEFAULT true;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ask_diet BOOLEAN DEFAULT true;
ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 60;

-- ---------- EVENT_TABLES: group seating (5-6 per table) ----------
CREATE TABLE IF NOT EXISTS event_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    table_number INTEGER,
    restaurant_name TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------- EVENT_RSVPS: per-event answers + seating link ----------
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS budget_pref TEXT;
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS diet TEXT;
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES event_tables(id) ON DELETE SET NULL;
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT false;
-- Avoid duplicate RSVPs for the same user/event.
CREATE UNIQUE INDEX IF NOT EXISTS event_rsvps_user_event_unique
    ON event_rsvps (user_id, event_id);

-- ---------- EVENT_REVIEWS: post-dinner feedback ----------
CREATE TABLE IF NOT EXISTS event_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    reviewer_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    rating INTEGER,                       -- 1..5 stars for the evening
    liked_users JSONB DEFAULT '[]'::jsonb,    -- user_ids the reviewer wants to keep
    disliked_users JSONB DEFAULT '[]'::jsonb,
    moderation_note TEXT,
    moderation_status TEXT,               -- null | 'open' | 'resolved'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (event_id, reviewer_id)
);

-- ---------- Hot-path indexes ----------
CREATE INDEX IF NOT EXISTS event_rsvps_event_idx ON event_rsvps (event_id);
CREATE INDEX IF NOT EXISTS event_rsvps_user_idx ON event_rsvps (user_id);
CREATE INDEX IF NOT EXISTS events_city_date_idx ON events (city, event_date);

-- ---------- RLS: service-role bypass on new tables ----------
ALTER TABLE event_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_tables' AND policyname = 'Service bypass event_tables') THEN
        CREATE POLICY "Service bypass event_tables" ON event_tables USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_reviews' AND policyname = 'Service bypass event_reviews') THEN
        CREATE POLICY "Service bypass event_reviews" ON event_reviews USING (true);
    END IF;
END $$;
