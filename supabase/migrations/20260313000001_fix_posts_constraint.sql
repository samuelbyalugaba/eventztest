-- Fix post creation by removing the strict link to organizer_profiles
-- This allows regular users to create posts too

DO $$
BEGIN
    -- Drop the problematic constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_posts_organizer_profile'
    ) THEN
        ALTER TABLE public.posts DROP CONSTRAINT fk_posts_organizer_profile;
    END IF;
END $$;

-- Ensure posts link to the unified profiles table instead
-- This might already be covered by an existing FK, but let's be sure
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'posts_user_id_fkey'
    ) THEN
        ALTER TABLE public.posts
        ADD CONSTRAINT posts_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;
