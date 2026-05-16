-- Align production with the app bundle's expected profile/post fields and
-- refresh the stats RPC after adding the missing post view columns.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_notification_read_at timestamptz DEFAULT timezone('utc'::text, now());

UPDATE public.profiles
SET last_notification_read_at = timezone('utc'::text, now())
WHERE last_notification_read_at IS NULL;

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS duration text,
ADD COLUMN IF NOT EXISTS views integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS posted_as_organizer boolean DEFAULT false;

UPDATE public.posts
SET
  views = COALESCE(views, 0),
  posted_as_organizer = COALESCE(posted_as_organizer, false);

CREATE OR REPLACE FUNCTION public.get_organizer_stats(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_events bigint;
  v_followers bigint;
  v_event_views bigint;
  v_post_views bigint;
  v_media_views bigint;
  v_total_views bigint;
  v_live_streams bigint;
  v_tickets_sold bigint;
  v_revenue bigint;
BEGIN
  SELECT COUNT(*) INTO v_total_events
  FROM public.events
  WHERE organizer_id = target_user_id;

  SELECT COUNT(*) INTO v_followers
  FROM public.follows
  WHERE following_id = target_user_id;

  SELECT COALESCE(SUM(views), 0) INTO v_event_views
  FROM public.events
  WHERE organizer_id = target_user_id;

  SELECT COALESCE(SUM(views), 0) INTO v_post_views
  FROM public.posts
  WHERE user_id = target_user_id;

  SELECT COALESCE(SUM(views), 0) INTO v_media_views
  FROM public.user_media
  WHERE user_id = target_user_id;

  v_total_views := v_event_views + v_post_views + v_media_views;

  SELECT COUNT(*) INTO v_live_streams
  FROM public.events
  WHERE organizer_id = target_user_id
    AND (streaming->>'available')::boolean IS TRUE;

  SELECT
    COUNT(*),
    COALESCE(SUM(
      COALESCE(NULLIF(regexp_replace(COALESCE(t.price, ''), '[^0-9]', '', 'g'), '')::integer, 0)
    ), 0)
  INTO v_tickets_sold, v_revenue
  FROM public.tickets t
  JOIN public.events e ON t.event_id = e.id
  WHERE e.organizer_id = target_user_id;

  RETURN json_build_object(
    'totalEvents', v_total_events,
    'followers', v_followers,
    'totalViews', v_total_views,
    'ticketsSold', v_tickets_sold,
    'revenue', v_revenue,
    'liveStreams', v_live_streams,
    'avgRating', 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_organizer_stats(uuid) TO authenticated, anon;
