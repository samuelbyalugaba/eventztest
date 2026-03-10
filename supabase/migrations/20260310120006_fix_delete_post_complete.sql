-- 1. Ensure RLS policy allows users to delete their own posts
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
CREATE POLICY "Users can delete their own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- 2. Fix Foreign Key constraints to allow ON DELETE CASCADE
-- This uses a PL/pgSQL block to dynamically find and replace the constraints
DO $$
DECLARE
    r RECORD;
BEGIN
    -- A. Fix 'post_likes' table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'post_likes') THEN
        -- Find existing FK constraints on post_id
        FOR r IN 
            SELECT tc.constraint_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_name = 'post_likes' 
              AND kcu.column_name = 'post_id'
        LOOP
            EXECUTE 'ALTER TABLE post_likes DROP CONSTRAINT ' || r.constraint_name;
        END LOOP;
        
        -- Add new constraint with CASCADE
        ALTER TABLE post_likes ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
    END IF;

    -- B. Fix 'post_comments' table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'post_comments') THEN
        FOR r IN 
            SELECT tc.constraint_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_name = 'post_comments' 
              AND kcu.column_name = 'post_id'
        LOOP
            EXECUTE 'ALTER TABLE post_comments DROP CONSTRAINT ' || r.constraint_name;
        END LOOP;

        ALTER TABLE post_comments ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
    END IF;

    -- C. Fix 'saved_posts' table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_posts') THEN
        FOR r IN 
            SELECT tc.constraint_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_name = 'saved_posts' 
              AND kcu.column_name = 'post_id'
        LOOP
            EXECUTE 'ALTER TABLE saved_posts DROP CONSTRAINT ' || r.constraint_name;
        END LOOP;

        ALTER TABLE saved_posts ADD CONSTRAINT saved_posts_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
    END IF;
END $$;
