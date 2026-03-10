-- Fix ALL Storage Buckets and Policies (Avatars, Events, Posts)

-- 1. Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to ensure clean slate (avoids conflicts)
DO $$
BEGIN
    -- Drop specific policies if they exist
    DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar Auth Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar Owner Update" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar Owner Delete" ON storage.objects;
    
    DROP POLICY IF EXISTS "Event Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Event Auth Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Event Owner Update" ON storage.objects;
    DROP POLICY IF EXISTS "Event Owner Delete" ON storage.objects;
    
    DROP POLICY IF EXISTS "Post Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Post Auth Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Post Owner Update" ON storage.objects;
    DROP POLICY IF EXISTS "Post Owner Delete" ON storage.objects;
    
    -- Drop generic policies that might have been created previously
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
END $$;

-- 3. Create comprehensive policies for each bucket

-- === AVATARS ===
-- Allow public to view avatars
CREATE POLICY "Avatar Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );
-- Allow authenticated users to upload (INSERT) avatars
CREATE POLICY "Avatar Auth Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
-- Allow users to update their own avatars (if they are the owner)
CREATE POLICY "Avatar Owner Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'avatars' AND auth.uid() = owner );
-- Allow users to delete their own avatars
CREATE POLICY "Avatar Owner Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- === EVENTS ===
CREATE POLICY "Event Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'events' );
CREATE POLICY "Event Auth Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'events' AND auth.role() = 'authenticated' );
CREATE POLICY "Event Owner Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'events' AND auth.uid() = owner );
CREATE POLICY "Event Owner Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'events' AND auth.uid() = owner );

-- === POSTS ===
CREATE POLICY "Post Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'posts' );
CREATE POLICY "Post Auth Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'posts' AND auth.role() = 'authenticated' );
CREATE POLICY "Post Owner Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'posts' AND auth.uid() = owner );
CREATE POLICY "Post Owner Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'posts' AND auth.uid() = owner );
