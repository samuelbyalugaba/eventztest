-- Function to allow users to downgrade their own account
-- This must be SECURITY DEFINER to bypass the RLS policy that prevents users from changing is_organizer
CREATE OR REPLACE FUNCTION public.downgrade_to_personal_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Update profile to remove organizer flag
  UPDATE public.profiles
  SET is_organizer = false
  WHERE id = current_user_id;

  -- 2. Delete organizer profile details (this effectively "removes" the organizer role in App logic)
  -- Note: Events created by this user will remain linked to their profile ID, 
  -- but they will lose access to organizer dashboard features.
  DELETE FROM public.organizer_profiles
  WHERE id = current_user_id;

END;
$$;
