-- DATABASE INTEGRITY & CLEANUP FIXES
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR

-- These changes ensure that when a User or Post is deleted, 
-- all related data (likes, comments, follows) is automatically cleaned up.
-- This prevents "Foreign Key Violation" errors when trying to delete content.

-- 1. FIX: Post Likes (Cascade Delete)
ALTER TABLE public.post_likes
DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey,
DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey;

ALTER TABLE public.post_likes
ADD CONSTRAINT post_likes_post_id_fkey 
    FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
ADD CONSTRAINT post_likes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. FIX: Post Comments (Cascade Delete)
ALTER TABLE public.post_comments
DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey,
DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;

ALTER TABLE public.post_comments
ADD CONSTRAINT post_comments_post_id_fkey 
    FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
ADD CONSTRAINT post_comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. FIX: Saved Posts (Cascade Delete)
ALTER TABLE public.saved_posts
DROP CONSTRAINT IF EXISTS saved_posts_post_id_fkey,
DROP CONSTRAINT IF EXISTS saved_posts_user_id_fkey;

ALTER TABLE public.saved_posts
ADD CONSTRAINT saved_posts_post_id_fkey 
    FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
ADD CONSTRAINT saved_posts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. FIX: Follows (Cascade Delete)
-- If a user is deleted, stop following them / stop them from following others
ALTER TABLE public.follows
DROP CONSTRAINT IF EXISTS follows_follower_id_fkey,
DROP CONSTRAINT IF EXISTS follows_following_id_fkey;

ALTER TABLE public.follows
ADD CONSTRAINT follows_follower_id_fkey 
    FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT follows_following_id_fkey 
    FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. FIX: Saved Events (Cascade Delete)
ALTER TABLE public.saved_events
DROP CONSTRAINT IF EXISTS saved_events_event_id_fkey,
DROP CONSTRAINT IF EXISTS saved_events_user_id_fkey;

ALTER TABLE public.saved_events
ADD CONSTRAINT saved_events_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
ADD CONSTRAINT saved_events_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. FIX: Notifications / Messages cleanup (Optional but recommended)
-- Assuming messages should be kept for the other party? 
-- If not, cascade delete messages too. For now, we leave messages as they are often sentimental/evidence.

-- 7. PERFORMANCE: Indexing Foreign Keys
-- Adding indexes to foreign keys dramatically speeds up "ON DELETE CASCADE" operations
-- and general joins.

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
