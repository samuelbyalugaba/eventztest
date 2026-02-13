-- Migration to separate organizer avatars from user avatars

-- 1. Ensure organizer_profiles has the dedicated avatar column
ALTER TABLE organizer_profiles 
ADD COLUMN IF NOT EXISTS organizer_avatar_url text;

-- 2. Populate organizer_profiles.organizer_avatar_url from profiles.avatar_url
-- This ensures that existing organizers keep their photos in the new field.
UPDATE organizer_profiles
SET organizer_avatar_url = profiles.avatar_url
FROM profiles
WHERE organizer_profiles.id = profiles.id
AND profiles.is_organizer = true
AND profiles.avatar_url IS NOT NULL
AND (organizer_profiles.organizer_avatar_url IS NULL OR organizer_profiles.organizer_avatar_url = '');

-- 3. (Optional) If you want to strictly separate them and remove the 'user' avatar for organizers:
-- Note: Only run this if you are sure organizers should NOT have a user profile photo anymore.
-- UPDATE profiles
-- SET avatar_url = NULL
-- WHERE is_organizer = true;

-- 4. Future proofing: The application logic now reads/writes to organizer_avatar_url for organizers
-- and avatar_url for users.
