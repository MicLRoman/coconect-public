-- ============================================================
-- Migration 005: restaurant capacity (how many tables it can host)
-- Idempotent.
-- ============================================================

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tables_count INTEGER DEFAULT 1;

NOTIFY pgrst, 'reload schema';
