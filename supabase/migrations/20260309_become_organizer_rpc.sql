-- Secure function to allow users to upgrade themselves to organizer status
-- This bypasses the RLS restriction on is_organizer column
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

  RETURN v_result;
END;
$$;
