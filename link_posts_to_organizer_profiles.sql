
-- Add a foreign key constraint to posts table to link to organizer_profiles
-- This enables the join: organizer_profile:organizer_profiles(*)

DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_posts_organizer_profile'
    ) THEN
        -- Add the foreign key constraint
        -- Since organizer_profiles.id IS the user_id (1:1 with auth.users),
        -- we can link posts.user_id to organizer_profiles.id
        ALTER TABLE public.posts
        ADD CONSTRAINT fk_posts_organizer_profile
        FOREIGN KEY (user_id)
        REFERENCES public.organizer_profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;
