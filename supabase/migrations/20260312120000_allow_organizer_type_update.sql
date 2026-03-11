CREATE OR REPLACE FUNCTION check_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.is_organizer IS DISTINCT FROM OLD.is_organizer) OR
     (NEW.verified IS DISTINCT FROM OLD.verified) THEN
      RAISE EXCEPTION 'Unauthorized: You cannot update privileged profile fields directly.';
  END IF;

  IF (NEW.organizer_type IS DISTINCT FROM OLD.organizer_type) THEN
    IF auth.uid() IS NULL OR auth.uid() <> OLD.id OR COALESCE(OLD.is_organizer, false) <> true THEN
      RAISE EXCEPTION 'Unauthorized: You cannot update privileged profile fields directly.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_fields ON profiles;
CREATE TRIGGER protect_profile_fields
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_profile_updates();
