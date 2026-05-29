-- App Review moderation support: persistent reports and user blocks.

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content_type text NOT NULL,
  content_id text NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  resolution_note text,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT reports_content_type_check CHECK (
    content_type IN ('post', 'comment', 'profile', 'message', 'event', 'stream')
  ),
  CONSTRAINT reports_status_check CHECK (
    status IN ('open', 'reviewing', 'resolved', 'dismissed')
  )
);

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS reported_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS details text;

ALTER TABLE public.reports
ALTER COLUMN status SET DEFAULT 'open';

ALTER TABLE public.reports
ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reports_status_created_at
  ON public.reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_content
  ON public.reports(content_type, content_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_open_unique_by_user
  ON public.reports(reporter_id, content_type, content_id)
  WHERE status IN ('open', 'reviewing');

DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Users can create own reports" ON public.reports;
CREATE POLICY "Users can create own reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "Moderators can update reports" ON public.reports;
CREATE POLICY "Moderators can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT user_blocks_no_self_block CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.user_blocks
ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id
  ON public.user_blocks(blocked_id);

DROP POLICY IF EXISTS "Users can create own blocks" ON public.user_blocks;
CREATE POLICY "Users can create own blocks"
  ON public.user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own blocks" ON public.user_blocks;
CREATE POLICY "Users can view own blocks"
  ON public.user_blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own blocks" ON public.user_blocks;
CREATE POLICY "Users can delete own blocks"
  ON public.user_blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
