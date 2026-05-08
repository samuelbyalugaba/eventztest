import { useEffect, useRef, useState } from 'react';
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

interface CacheEntry {
  liveStreams: LiveStream[];
  upcomingStreams: LiveStream[];
  ts: number;
}

let liveFeedCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000;

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
  const hasFreshCache = !!(liveFeedCache && Date.now() - liveFeedCache.ts < CACHE_TTL_MS);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>(
    hasFreshCache ? liveFeedCache!.liveStreams : [],
  );
  const [upcomingStreams, setUpcomingStreams] = useState<LiveStream[]>(
    hasFreshCache ? liveFeedCache!.upcomingStreams : [],
  );
  const [isLoading, setIsLoading] = useState(!hasFreshCache);
  const inFlight = useRef(false);

  const fetchStreams = async ({ showLoading }: { showLoading?: boolean } = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (showLoading) setIsLoading(true);
    try {
      const [live, upcoming] = await Promise.all([getLiveStreams(), getUpcomingStreams()]);
      const nextLive = live ? (live.map(mapLive) as LiveStream[]) : [];
      const nextUpcoming = upcoming
        ? (upcoming
            .filter((e: any) => e.description !== 'Instant live stream')
            .map(mapUpcoming) as LiveStream[])
        : [];
      setLiveStreams(nextLive);
      setUpcomingStreams(nextUpcoming);
      liveFeedCache = { liveStreams: nextLive, upcomingStreams: nextUpcoming, ts: Date.now() };
    } catch {
      // swallow — UI keeps last good data
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams({ showLoading: !hasFreshCache });
    const channel = supabase
      .channel('live-feed-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchStreams();
      })
      .subscribe();

    // Poll Cloudflare to detect OBS-driven streams that go live without a webhook.
    const pollCf = () => {
      supabase.functions.invoke('cloudflare-stream-status', { body: {} }).catch(() => {});
    };
    pollCf();
    const cfInterval = setInterval(pollCf, 15_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cfInterval);
    };
  }, []);

  const liveIdsKey = liveStreams.map((s) => s.id).join(',');
  useEffect(() => {
    if (liveStreams.length === 0) return;
    const channels = liveStreams.map((s) =>
      subscribeToEventStreaming(s.id, (streaming) => {
        const next = streaming?.liveViewers ?? 0;
        setLiveStreams((prev) => {
          const found = prev.find((p) => p.id === s.id);
          if (!found || found.viewers === next) return prev;
          return prev.map((p) => (p.id === s.id ? { ...p, viewers: next } : p));
        });
      }),
    );
    return () => {
      channels.forEach((c) => c.unsubscribe());
    };
  }, [liveIdsKey]);

  return { liveStreams, upcomingStreams, isLoading };
}
