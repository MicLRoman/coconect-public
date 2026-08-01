-- ============================================================
-- Migration 003: user age (onboarding now collects it on its own step)
-- Idempotent.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
