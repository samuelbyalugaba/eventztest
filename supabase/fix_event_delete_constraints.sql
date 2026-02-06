-- Fix foreign key constraints to allow event deletion to cascade to related records
-- This script uses dynamic SQL to checking if columns exist before applying constraints,
-- preventing "column does not exist" errors.

DO $$
BEGIN
    -- 1. TICKETS: Cascade delete (If event is gone, tickets are invalid)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'event_id') THEN
        RAISE NOTICE 'Updating tickets constraint...';
        ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_event_id_fkey;
        ALTER TABLE public.tickets ADD CONSTRAINT tickets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
    END IF;

    -- 2. SAVED EVENTS: Cascade delete (Remove from users' saved lists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'saved_events' AND column_name = 'event_id') THEN
        RAISE NOTICE 'Updating saved_events constraint...';
        ALTER TABLE public.saved_events DROP CONSTRAINT IF EXISTS saved_events_event_id_fkey;
        ALTER TABLE public.saved_events ADD CONSTRAINT saved_events_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
    END IF;

    -- 3. POSTS: Set NULL (Keep the post content, just remove the event link)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'event_id') THEN
        RAISE NOTICE 'Updating posts constraint...';
        ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_event_id_fkey;
        ALTER TABLE public.posts ADD CONSTRAINT posts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;
    END IF;

    -- 4. USER MEDIA: Set NULL (Keep the photos/videos)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_media' AND column_name = 'event_id') THEN
        RAISE NOTICE 'Updating user_media constraint...';
        ALTER TABLE public.user_media DROP CONSTRAINT IF EXISTS user_media_event_id_fkey;
        ALTER TABLE public.user_media ADD CONSTRAINT user_media_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;
    END IF;

    -- 5. POST LIKES: Cascade delete (If post is deleted)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_likes' AND column_name = 'post_id') THEN
        RAISE NOTICE 'Updating post_likes constraint...';
        ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey;
        ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
    END IF;

    -- 6. POST COMMENTS: Cascade delete (If post is deleted)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'post_comments' AND column_name = 'post_id') THEN
        RAISE NOTICE 'Updating post_comments constraint...';
        ALTER TABLE public.post_comments DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey;
        ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
    END IF;

    -- 7. SAVED POSTS: Cascade delete (If post is deleted)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'saved_posts' AND column_name = 'post_id') THEN
        RAISE NOTICE 'Updating saved_posts constraint...';
        ALTER TABLE public.saved_posts DROP CONSTRAINT IF EXISTS saved_posts_post_id_fkey;
        ALTER TABLE public.saved_posts ADD CONSTRAINT saved_posts_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
    END IF;

END $$;
