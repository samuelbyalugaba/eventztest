-- Fix Avatars Bucket and Policies

-- 1. Create 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts (and ensure we have the correct ones)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Note: The above DROP commands might be too aggressive if they affect other buckets (since policies are on storage.objects).
-- We should scope the DROP or use unique names for policies per bucket if possible, 
-- BUT Supabase storage policies are often generic or named specifically.
-- Better approach: Create policies with specific names for avatars.

-- Let's try to be specific with policy names to avoid clashing with 'posts' bucket policies from previous fixes.
-- The previous fix used generic names "Public Access", "Authenticated users can upload", etc.
-- If we re-create them, we might mess up 'posts' or 'events' policies if they share the same name.
-- Storage policies are per table (storage.objects).
-- If we have multiple policies with the same name on the same table, it's an error.

-- Let's check what names were used in fix_schema_and_storage.sql:
-- "Public Access", "Authenticated users can upload", "Users can update own files", "Users can delete own files".
-- These names are generic. If I create a policy named "Public Access" again, it will fail if it exists.
-- But the existing "Public Access" policy (from fix_schema_and_storage.sql) only covers `bucket_id = 'posts'`.
-- USING ( bucket_id = 'posts' )
-- If we want to allow 'avatars' too, we need to either:
-- A) Modify the existing policy to include 'avatars'.
-- B) Create a new policy with a DIFFERENT name, e.g. "Public Access Avatars".

-- Approach B is safer as we can't easily modify existing policies without dropping them, and we don't want to break 'posts'.

-- Avatars Policies

-- Public Read
CREATE POLICY "Avatar Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Auth Upload
CREATE POLICY "Avatar Auth Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Owner Update
CREATE POLICY "Avatar Owner Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid() = owner
);

-- Owner Delete
CREATE POLICY "Avatar Owner Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid() = owner
);
