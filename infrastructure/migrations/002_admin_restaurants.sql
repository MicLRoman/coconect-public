-- ============================================================
-- Migration 002: Restaurants (admin) + table->restaurant assignment
-- Idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    neighborhood TEXT,
    budget_level TEXT,          -- '$' | '$$' | '$$$'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE event_tables ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='restaurants' AND policyname='Service bypass restaurants') THEN
        CREATE POLICY "Service bypass restaurants" ON restaurants USING (true);
    END IF;
END $$;
