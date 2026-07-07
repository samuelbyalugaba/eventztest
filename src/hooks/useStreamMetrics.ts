import { useState, useEffect, useRef } from 'react';
import { supabase, subscribeToStreamPresence } from '../utils/supabase/api';

export function useStreamMetrics(eventId: number, isLive: boolean, organizerId: string) {
  const [viewerCount, setViewerCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const peakViewersRef = useRef(0);
  const totalGiftsRef = useRef(0);
  const newFollowersRef = useRef(0);
  const revenueRef = useRef(0);

  useEffect(() => { revenueRef.current = totalRevenue; }, [totalRevenue]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof subscribeToStreamPresence> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      const userId = user?.id || organizerId;
      channel = subscribeToStreamPresence(eventId, { userId, role: 'host' }, (count) => {
        setViewerCount(count);
        if (count > peakViewersRef.current) peakViewersRef.current = count;
      });
    })();
    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, [eventId, organizerId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLive) {
      interval = setInterval(() => setElapsedTime((p) => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  useEffect(() => {
    const giftSub = supabase
      .channel(`gifts:${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `event_id=eq.${eventId}` }, (payload: any) => {
        if (payload.new?.metadata?.type === 'gift') {
          const amount = payload.new.amount || 0;
          setTotalRevenue((p) => p + amount);
          totalGiftsRef.current += 1;
        }
      })
      .subscribe();

    return () => { giftSub.unsubscribe(); };
  }, [eventId]);

  return {
    viewerCount,
    totalRevenue,
    elapsedTime,
    peakViewersRef,
    totalGiftsRef,
    newFollowersRef,
    revenueRef,
  };
}
