-- Performance optimization functions to prevent N+1 queries and large data fetching

-- 1. Organizer Stats RPC
-- Replaces client-side aggregation of events, followers, views, and revenue
CREATE OR REPLACE FUNCTION get_organizer_stats(target_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_events BIGINT;
  v_followers BIGINT;
  v_event_views BIGINT;
  v_post_views BIGINT;
  v_media_views BIGINT;
  v_total_views BIGINT;
  v_live_streams BIGINT;
  v_tickets_sold BIGINT;
  v_revenue BIGINT;
BEGIN
  -- 1. Total Events
  SELECT COUNT(*) INTO v_total_events FROM events WHERE organizer_id = target_user_id;

  -- 2. Followers
  SELECT COUNT(*) INTO v_followers FROM follows WHERE following_id = target_user_id;

  -- 3. Views Calculation
  SELECT COALESCE(SUM(views), 0) INTO v_event_views FROM events WHERE organizer_id = target_user_id;
  SELECT COALESCE(SUM(views), 0) INTO v_post_views FROM posts WHERE user_id = target_user_id;
  SELECT COALESCE(SUM(views), 0) INTO v_media_views FROM user_media WHERE user_id = target_user_id;
  
  v_total_views := v_event_views + v_post_views + v_media_views;

  -- 4. Live Streams (events with streaming enabled)
  -- Note: JSONB query to check if streaming->available is true
  SELECT COUNT(*) INTO v_live_streams 
  FROM events 
  WHERE organizer_id = target_user_id 
  AND (streaming->>'available')::boolean IS TRUE;

  -- 5. Tickets Sold & Revenue
  -- We join tickets with events to filter by organizer_id
  -- Revenue parsing logic matches the JS implementation: parseInt(price.replace(/[^0-9]/g, ''))
  SELECT 
    COUNT(*),
    COALESCE(SUM(
      CASE 
        WHEN price IS NULL OR price = 'Free' THEN 0
        ELSE CAST(REGEXP_REPLACE(price, '[^0-9]', '', 'g') AS INTEGER)
      END
    ), 0)
  INTO v_tickets_sold, v_revenue
  FROM tickets t
  JOIN events e ON t.event_id = e.id
  WHERE e.organizer_id = target_user_id;

  RETURN json_build_object(
    'totalEvents', v_total_events,
    'followers', v_followers,
    'totalViews', v_total_views,
    'ticketsSold', v_tickets_sold,
    'revenue', v_revenue,
    'liveStreams', v_live_streams,
    'avgRating', 0 -- Placeholder
  );
END;
$$;

-- 2. Event Analytics RPC
-- Replaces client-side processing of thousands of tickets/saves for analytics
CREATE OR REPLACE FUNCTION get_event_analytics(target_event_id BIGINT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_views BIGINT;
  v_interested_count BIGINT;
  v_tickets_sold BIGINT;
  v_shares_count BIGINT;
  v_revenue BIGINT;
  
  -- Trends (current vs previous period)
  v_interested_last_7 BIGINT;
  v_interested_prev_7 BIGINT;
  v_tickets_last_7 BIGINT;
  v_tickets_prev_7 BIGINT;
  v_shares_last_7 BIGINT;
  v_shares_prev_7 BIGINT;
  
  v_daily_activity INTEGER[];
  v_location_counts json;
  v_age_counts json;
BEGIN
  -- Basic Stats
  SELECT views INTO v_views FROM events WHERE id = target_event_id;
  SELECT COUNT(*) INTO v_interested_count FROM saved_events WHERE event_id = target_event_id;
  SELECT COUNT(*) INTO v_shares_count FROM posts WHERE event_id = target_event_id;
  
  SELECT 
    COUNT(*),
    COALESCE(SUM(
      CASE 
        WHEN price IS NULL OR price = 'Free' THEN 0
        ELSE CAST(REGEXP_REPLACE(price, '[^0-9]', '', 'g') AS INTEGER)
      END
    ), 0)
  INTO v_tickets_sold, v_revenue
  FROM tickets 
  WHERE event_id = target_event_id;

  -- Trend Calculations (Last 7 days vs Previous 7 days)
  -- Interested
  SELECT 
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')
  INTO v_interested_last_7, v_interested_prev_7
  FROM saved_events WHERE event_id = target_event_id;

  -- Tickets
  SELECT 
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')
  INTO v_tickets_last_7, v_tickets_prev_7
  FROM tickets WHERE event_id = target_event_id;

  -- Shares
  SELECT 
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')
  INTO v_shares_last_7, v_shares_prev_7
  FROM posts WHERE event_id = target_event_id;

  -- Daily Activity (Last 7 days) - Mon to Sun mapping
  -- This is a simplification to match the JS logic which mapped to 0-6 array
  WITH activity AS (
    SELECT created_at FROM saved_events WHERE event_id = target_event_id AND created_at >= NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT created_at FROM tickets WHERE event_id = target_event_id AND created_at >= NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT created_at FROM posts WHERE event_id = target_event_id AND created_at >= NOW() - INTERVAL '7 days'
  )
  SELECT array_agg(d) FROM (
    SELECT count(*) as d
    FROM generate_series(0, 6) as day_idx
    LEFT JOIN activity a ON 
      (EXTRACT(ISODOW FROM a.created_at)::int - 1) = day_idx -- ISODOW: 1=Mon...7=Sun -> 0..6
    GROUP BY day_idx
    ORDER BY day_idx
  ) t INTO v_daily_activity;
  
  -- Fallback if null
  IF v_daily_activity IS NULL THEN v_daily_activity := ARRAY[0,0,0,0,0,0,0]; END IF;

  -- Demographics: Location (Top 5)
  -- Aggregating from tickets and saved events users
  WITH unique_users AS (
    SELECT user_id FROM tickets WHERE event_id = target_event_id
    UNION
    SELECT user_id FROM saved_events WHERE event_id = target_event_id
  ),
  user_locs AS (
    SELECT 
      SPLIT_PART(p.location, ',', 1) as city
    FROM unique_users u
    JOIN profiles p ON u.user_id = p.id
    WHERE p.location IS NOT NULL AND p.location != ''
  )
  SELECT json_object_agg(city, count) FROM (
    SELECT city, COUNT(*) as count
    FROM user_locs
    GROUP BY city
    ORDER BY count DESC
    LIMIT 5
  ) t INTO v_location_counts;

  -- Demographics: Age Groups
  WITH unique_users AS (
    SELECT user_id FROM tickets WHERE event_id = target_event_id
    UNION
    SELECT user_id FROM saved_events WHERE event_id = target_event_id
  ),
  user_ages AS (
    SELECT 
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.birthdate)) as age
    FROM unique_users u
    JOIN profiles p ON u.user_id = p.id
    WHERE p.birthdate IS NOT NULL
  )
  SELECT json_build_object(
    '18-24', COUNT(*) FILTER (WHERE age BETWEEN 18 AND 24),
    '25-34', COUNT(*) FILTER (WHERE age BETWEEN 25 AND 34),
    '35-44', COUNT(*) FILTER (WHERE age BETWEEN 35 AND 44),
    '45+', COUNT(*) FILTER (WHERE age >= 45)
  )
  INTO v_age_counts
  FROM user_ages;

  RETURN json_build_object(
    'views', COALESCE(v_views, 0),
    'interested', v_interested_count,
    'ticketsSold', v_tickets_sold,
    'shares', v_shares_count,
    'revenue', v_revenue,
    'trends', json_build_object(
      'interested', json_build_object('last7', v_interested_last_7, 'prev7', v_interested_prev_7),
      'tickets', json_build_object('last7', v_tickets_last_7, 'prev7', v_tickets_prev_7),
      'shares', json_build_object('last7', v_shares_last_7, 'prev7', v_shares_prev_7)
    ),
    'dailyActivity', v_daily_activity,
    'demographics', json_build_object(
      'locations', COALESCE(v_location_counts, '{}'::json),
      'ageGroups', COALESCE(v_age_counts, json_build_object('18-24',0,'25-34',0,'35-44',0,'45+',0))
    )
  );
END;
$$;
