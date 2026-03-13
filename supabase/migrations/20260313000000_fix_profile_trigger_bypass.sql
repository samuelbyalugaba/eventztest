-- Fix the profile update trigger to respect the bypass flag
-- This allows RPCs like become_organizer and downgrade_to_personal_account to work

CREATE OR REPLACE FUNCTION check_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow updates if the bypass flag is set (used by trusted server-side functions)
  IF current_setting('app.bypass_profile_trigger', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Check if restricted columns are being modified
  IF (NEW.is_organizer IS DISTINCT FROM OLD.is_organizer) OR
     (NEW.verified IS DISTINCT FROM OLD.verified) THEN
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
