
-- Add posted_as_organizer column to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS posted_as_organizer BOOLEAN DEFAULT FALSE;

-- Update existing posts to be consistent (optional, default is false)
