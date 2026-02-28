-- RLS Hardening: Organizer Privileges for Events and Strict Profile Updates

-- Ensure RLS enabled
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- EVENTS: Only allow INSERT/UPDATE when the user is an organizer
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Organizers can insert events') THEN
    EXECUTE 'DROP POLICY "Organizers can insert events" ON public.events';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Organizers can update own events') THEN
    EXECUTE 'DROP POLICY "Organizers can update own events" ON public.events';
  END IF;
END$$;

CREATE POLICY "Organizers can insert events" ON public.events
FOR INSERT
WITH CHECK (
  auth.uid() = organizer_id
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_organizer = true)
);

CREATE POLICY "Organizers can update own events" ON public.events
FOR UPDATE
USING (
  auth.uid() = organizer_id
)
WITH CHECK (
  auth.uid() = organizer_id
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_organizer = true)
);

-- PROFILES: Users may update their own profile but cannot self-elevate is_organizer/verified
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    EXECUTE 'DROP POLICY "Users can update own profile" ON public.profiles';
  END IF;
END$$;

CREATE POLICY "Users can update own profile (safe)" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_organizer IS NOT DISTINCT FROM (SELECT p.is_organizer FROM public.profiles p WHERE p.id = auth.uid())
  AND verified IS NOT DISTINCT FROM (SELECT p.verified FROM public.profiles p WHERE p.id = auth.uid())
);

-- Optional: allow service role to manage organizer/verified fields (RLS bypassed by service role)
