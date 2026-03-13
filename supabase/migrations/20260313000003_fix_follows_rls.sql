-- 1. Ensure the follows table exists and has correct constraints
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- 2. Enable RLS on follows table
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for follows table
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows are viewable by everyone" ON public.follows
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own follows" ON public.follows;
CREATE POLICY "Users can insert their own follows" ON public.follows
FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;
CREATE POLICY "Users can delete their own follows" ON public.follows
FOR DELETE USING (auth.uid() = follower_id);

-- 4. Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
