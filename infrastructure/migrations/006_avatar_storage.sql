-- ============================================================
-- Migration 006: avatar storage bucket + permissive policies
-- Run in Supabase SQL Editor. Lets the backend (anon/publishable key)
-- upload avatars. Mirrors the project's open-RLS approach.
-- ============================================================

-- 1. Public bucket for avatars (id == name).
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow read/write on objects in the 'avatars' bucket for everyone.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars public all'
    ) THEN
        CREATE POLICY "avatars public all" ON storage.objects
            FOR ALL
            USING (bucket_id = 'avatars')
            WITH CHECK (bucket_id = 'avatars');
    END IF;
END $$;
