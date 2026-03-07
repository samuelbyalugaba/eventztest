-- 1. Modify the trigger function to respect a bypass flag
CREATE OR REPLACE FUNCTION check_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow updates if the bypass flag is set (used by trusted server-side functions)
  -- The second argument 'true' means "missing_ok", so it returns NULL instead of erroring if not set.
  IF current_setting('app.bypass_profile_trigger', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Check if restricted columns are being modified
  IF (NEW.is_organizer IS DISTINCT FROM OLD.is_organizer) OR
     (NEW.verified IS DISTINCT FROM OLD.verified) OR
     (NEW.organizer_type IS DISTINCT FROM OLD.organizer_type) THEN
      RAISE EXCEPTION 'Unauthorized: You cannot update privileged profile fields directly.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the downgrade function to set the bypass flag
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
  -- The third parameter 'true' makes it local to the transaction
  PERFORM set_config('app.bypass_profile_trigger', 'true', true);

  -- 1. Update profile to remove organizer flag
  UPDATE public.profiles
  SET is_organizer = false
  WHERE id = current_user_id;

  -- 2. Delete organizer profile details
  DELETE FROM public.organizer_profiles
  WHERE id = current_user_id;

END;
$$;

-- Ensure execute permissions are correct
GRANT EXECUTE ON FUNCTION public.downgrade_to_personal_account() TO authenticated;
