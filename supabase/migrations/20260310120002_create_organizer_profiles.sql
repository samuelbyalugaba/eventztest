
-- Create a new table for organizer profiles
CREATE TABLE IF NOT EXISTS public.organizer_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY, -- 1:1 relationship with user
  organizer_name TEXT,
  organizer_type TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  bio TEXT,
  description TEXT,
  location TEXT,
  website TEXT,
  contact_email TEXT,
  phone TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.organizer_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Organizer profiles are viewable by everyone" 
ON public.organizer_profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own organizer profile" 
ON public.organizer_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own organizer profile" 
ON public.organizer_profiles FOR UPDATE USING (auth.uid() = id);

-- Add missing columns to events table if they don't exist (ensuring schema consistency)
-- This ensures the organizer_id foreign key works correctly if we decide to link events to this table later
-- For now, events still link to profiles.id (which is the same as organizer_profiles.id)
