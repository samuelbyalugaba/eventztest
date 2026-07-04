import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLiveStreams, getUpcomingStreams, subscribeToEventStreaming } from '../utils/supabase/api';
import { supabase } from '../utils/supabase/client';

export interface LiveStream {
  id: number;
  title: string;
  category: string;
  thumbnail: string;
  isLive: boolean;
  viewers?: number;
  scheduledTime?: string;
  countdown?: number;
  host: string;
  organizer_id: string;
  quality: 'HD' | '4K' | 'SD';
  isPaid?: boolean;
  price?: number;
  location: string;
  country: string;
  countryFlag: string;
  playback_url?: string;
  host_avatar?: string;
}

const CACHE_TTL_MS = 60_000;
const QUERY_KEY = ['live-feed', 'streams'];

const mapLive = (e: any): LiveStream => {
  const profile = e.organizer;
  return {
    ...e,
    thumbnail: e.image_url,
    host: profile?.full_name || 'Event Organizer',
    host_avatar: profile?.avatar_url,
    organizer_id: e.organizer_id,
    viewers: e.streaming?.liveViewers || 0,
    isLive: true,
    playback_url: e.streaming?.playback_url,
    location: profile?.location?.split(',')[0]?.trim() || 'Dar es Salaam',
  };
};

const mapUpcoming = (e: any): LiveStream => {
  const profile = e.organizer;
  return {
    ...e,
    thumbnail: e.image_url,
    scheduledTime: `${e.date} at ${e.time}`,
    host: profile?.full_name || 'Event Organizer',
    host_avatar: profile?.avatar_url,
    organizer_id: e.organizer_id,
    location: profile?.location?.split(',')[0]?.trim() || 'Dar es Salaam',
    countdown: Math.max(
      0,
      Math.floor((new Date(`${e.date}T${e.time}`).getTime() - Date.now()) / (1000 * 60)),
    ),
  };
};

export function useLiveFeedData() {
  const queryClient = useQueryClient();

  const liveQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const [live, upcoming] = await Promise.all([getLiveStreams(), getUpcomingStreams()]);
      return {
        liveStreams: live ? (live.map(mapLive) as LiveStream[]) : [],
        upcomingStreams: upcoming
          ? (upcoming
              .filter((e: any) => e.description !== 'Instant live stream')
              .map(mapUpcoming) as LiveStream[])
          : [],
      };
    },
    staleTime: CACHE_TTL_MS,
    gcTime: CACHE_TTL_MS * 2,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  const liveStreams = liveQuery.data?.liveStreams ?? [];
  const upcomingStreams = liveQuery.data?.upcomingStreams ?? [];
  const isLoading = liveQuery.isPending;

  /* Real-time subscriptions for viewer count updates */
  const liveIdsKey = liveStreams.map((s) => s.id).join(',');

  useEffect(() => {
    if (liveStreams.length === 0) return;
    const channels = liveStreams.map((s) =>
      subscribeToEventStreaming(s.id, () => {
        invalidate();
      }),
    );
    return () => {
      channels.forEach((c) => c.unsubscribe());
    };
  }, [liveIdsKey, invalidate]);

  /* Polling for OBS-driven streams without webhooks */
  useEffect(() => {
    const pollCf = () => {
      supabase.functions.invoke('cloudflare-stream-status', { body: {} }).catch(() => {});
    };
    pollCf();
    const cfInterval = setInterval(pollCf, 15_000);
    return () => clearInterval(cfInterval);
  }, []);

  /* DB change subscription */
  useEffect(() => {
    const channel = supabase
      .channel('live-feed-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        invalidate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidate]);

  return { liveStreams, upcomingStreams, isLoading };
}
