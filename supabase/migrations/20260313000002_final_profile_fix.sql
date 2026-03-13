-- Ensure all required columns exist on profiles table
DO $$
BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organizer_type TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_organizer BOOLEAN DEFAULT false;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_email TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

-- Fix the trigger function to be more robust
CREATE OR REPLACE FUNCTION check_profile_updates()
RETURNS TRIGGER AS $$
DECLARE
  v_bypass TEXT;
BEGIN
  -- Get bypass flag, handle case where it might not be set
  BEGIN
    v_bypass := current_setting('app.bypass_profile_trigger', true);
  EXCEPTION WHEN OTHERS THEN
    v_bypass := 'false';
  END;

  -- Allow updates if the bypass flag is set (used by trusted server-side functions)
  IF v_bypass = 'true' THEN
    RETURN NEW;
  END IF;

  -- Check if restricted columns are being modified by a regular user
  IF (NEW.is_organizer IS DISTINCT FROM OLD.is_organizer) OR
     (NEW.verified IS DISTINCT FROM OLD.verified) THEN
      -- Allow only if the bypass flag was set (which we already checked above)
      RAISE EXCEPTION 'Unauthorized: You cannot update privileged profile fields directly.';
  END IF;

  -- Allow organizer_type update only for the user themselves if they are already an organizer
  IF (NEW.organizer_type IS DISTINCT FROM OLD.organizer_type) THEN
    IF auth.uid() IS NULL OR auth.uid() <> OLD.id OR COALESCE(OLD.is_organizer, false) <> true THEN
      RAISE EXCEPTION 'Unauthorized: You cannot update privileged profile fields directly.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach the trigger
DROP TRIGGER IF EXISTS protect_profile_fields ON profiles;
CREATE TRIGGER protect_profile_fields
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_profile_updates();

-- Ensure become_organizer RPC is up to date and correctly sets the bypass flag
CREATE OR REPLACE FUNCTION public.become_organizer(
  p_full_name TEXT,
  p_username TEXT,
  p_organizer_type TEXT,
  p_location TEXT,
  p_bio TEXT,
  p_avatar_url TEXT,
  p_contact_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if username is taken by someone else
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE username = p_username 
    AND id != v_user_id
  ) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;

  -- Set bypass flag for the session to allow privileged updates
  -- We use FALSE for the third parameter to ensure it lasts for the whole transaction
  PERFORM set_config('app.bypass_profile_trigger', 'true', true);

  -- Update the profile
  UPDATE public.profiles
  SET 
    full_name = p_full_name,
    username = p_username,
    organizer_type = p_organizer_type,
    location = p_location,
    bio = p_bio,
    avatar_url = p_avatar_url,
    contact_email = COALESCE(p_contact_email, contact_email),
    is_organizer = true,
    updated_at = NOW()
  WHERE id = v_user_id
  RETURNING to_jsonb(profiles.*) INTO v_result;

  -- Reset bypass flag (optional as it's local to transaction)
  PERFORM set_config('app.bypass_profile_trigger', 'false', true);

  RETURN v_result;
END;
$$;
