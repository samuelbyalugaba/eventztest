-- Add status column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status text default 'published';

-- Add views column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS views integer default 0;

-- Update RLS policies to ensure they don't block access (optional but good practice)
-- (Existing policies seem fine as they use auth.uid() or are public)
