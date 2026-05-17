-- 1. Ensure profiles table has all necessary fields
-- We need to add all fields that existed in organizer_profiles but not in profiles.
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_organizer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS organizer_type TEXT,
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- 2. Migrate data from organizer_profiles to profiles
-- We bypass the profile trigger to allow updating is_organizer and organizer_type
DO $$
BEGIN
  -- Set bypass flag for the session
  PERFORM set_config('app.bypass_profile_trigger', 'true', true);

  -- Update profiles with data from organizer_profiles
  UPDATE public.profiles p
  SET 
    full_name = COALESCE(p.full_name, op.organizer_name),
    organizer_type = COALESCE(p.organizer_type, op.organizer_type),
    avatar_url = COALESCE(p.avatar_url, op.organizer_avatar_url),
    cover_url = COALESCE(p.cover_url, op.cover_url),
    bio = COALESCE(p.bio, op.bio),
    description = COALESCE(op.description, p.description),
    location = COALESCE(p.location, op.location),
    website = COALESCE(p.website, op.website),
    contact_email = COALESCE(p.contact_email, op.contact_email),
    phone = COALESCE(p.phone, op.phone),
    social_links = CASE 
      WHEN (op.social_links IS NOT NULL AND op.social_links <> '{}'::jsonb) AND (p.social_links IS NULL OR p.social_links = '{}'::jsonb) THEN op.social_links
      ELSE p.social_links
    END,
    is_organizer = true
  FROM public.organizer_profiles op
  WHERE p.id = op.id;

  -- Reset bypass flag
  PERFORM set_config('app.bypass_profile_trigger', 'false', true);
END $$;

-- 3. Update foreign keys and references
-- Posts: remove the redundant FK to organizer_profiles
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS fk_posts_organizer_profile;

-- 4. Update RLS Policies
-- Update events policies to check profiles.is_organizer instead of organizer_profiles table
DROP POLICY IF EXISTS "Organizers can insert events" ON public.events;
CREATE POLICY "Organizers can insert events" ON public.events
FOR INSERT WITH CHECK (
  auth.uid() = organizer_id
  AND (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_organizer = true))
);

DROP POLICY IF EXISTS "Organizers can update own events" ON public.events;
CREATE POLICY "Organizers can update own events" ON public.events
FOR UPDATE USING (auth.uid() = organizer_id)
WITH CHECK (
  auth.uid() = organizer_id
  AND (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_organizer = true))
);

-- 5. Update functions
-- Update downgrade_to_personal_account to just set is_organizer = false
CREATE OR REPLACE FUNCTION public.downgrade_to_personal_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Set local transaction variable to bypass the trigger check
  PERFORM set_config('app.bypass_profile_trigger', 'true', true);

  -- 1. Update profile to remove organizer flag
  UPDATE public.profiles
  SET is_organizer = false
  WHERE id = current_user_id;

  -- No need to delete from organizer_profiles as the table will be gone
END;
$$;

-- 6. Cleanup
-- We don't drop the table yet, to avoid breaking the app before the code is updated.
-- But we can remove the redundant triggers/policies on it.
DROP POLICY IF EXISTS "Organizer profiles are viewable by everyone" ON public.organizer_profiles;
DROP POLICY IF EXISTS "Users can insert their own organizer profile" ON public.organizer_profiles;
DROP POLICY IF EXISTS "Users can update their own organizer profile" ON public.organizer_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.organizer_profiles;
DROP POLICY IF EXISTS "Organizers can insert their own profile" ON public.organizer_profiles;
DROP POLICY IF EXISTS "Organizers can update their own profile" ON public.organizer_profiles;
