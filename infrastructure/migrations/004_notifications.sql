-- ============================================================
-- Migration 004: in-app notifications
-- Idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    kind TEXT DEFAULT 'info',          -- info | event | match | system
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_notifications_user_idx ON user_notifications (user_id, is_read);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_notifications' AND policyname='Service bypass user_notifications') THEN
        CREATE POLICY "Service bypass user_notifications" ON user_notifications USING (true) WITH CHECK (true);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
