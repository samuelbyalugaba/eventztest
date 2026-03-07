-- Grant execute permission to authenticated users explicitly
GRANT EXECUTE ON FUNCTION public.downgrade_to_personal_account() TO authenticated;

-- Ensure the function handles the case where organizer_profile might not exist gracefully
-- (DELETE already does this, but being explicit helps)
