import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase/client';
import { getEvents, getSavedEvents, type Event as ApiEvent } from '../utils/supabase/api';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';

const CACHE_DURATION_MS = 15 * 60 * 1000;

const getInitialEvents = (): ApiEvent[] => {
  const cachedEvents = queryClient.getQueryData<ApiEvent[]>(queryKeys.events.publicList);
  return Array.isArray(cachedEvents) ? cachedEvents : [];
};

export function useEventsData() {
  const initialEvents = (() => getInitialEvents())();
  const [events, setEvents] = useState<ApiEvent[]>(initialEvents);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(initialEvents.length === 0);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(initialEvents.length > 0);
  const hasEventsRef = useRef(initialEvents.length > 0);
  const lastFetchTimeRef = useRef(0);

  useEffect(() => {
    const fetchEvents = async (force = false) => {
      const now = Date.now();
      if (!force && hasEventsRef.current && (now - lastFetchTimeRef.current) < CACHE_DURATION_MS) {
        setHasLoadedEvents(true);
        setIsFetching(false);
        return;
      }
      
      try {
        setIsFetching(true);
        if (force) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.events.root });
        }
        const allEvents = await queryClient.fetchQuery({
          queryKey: queryKeys.events.publicList,
          staleTime: 15 * 60 * 1000,
          queryFn: () => getEvents(),
        });
        const publicEvents = (allEvents as any[]).map(e => ({ ...e, isSaved: false })) as ApiEvent[];
        setEvents(publicEvents);
        queryClient.setQueryData(queryKeys.events.publicList, publicEvents);
        lastFetchTimeRef.current = Date.now();
        hasEventsRef.current = true;
        setHasLoadedEvents(true);

        try {
          const { data: { user } } = await supabase.auth.getUser();
          setCurrentUserId(user?.id ?? null);

          if (!user) {
            return;
          }

          const savedEvents = await getSavedEvents(user.id);
          const savedIds = new Set((savedEvents as any[]).map(e => e.id));
          const eventsWithSaved = (allEvents as any[]).map(e => ({
            ...e,
            isSaved: savedIds.has(e.id)
          }));

          queryClient.setQueryData(queryKeys.events.list(user.id), eventsWithSaved);
          queryClient.setQueryData(queryKeys.events.publicList, eventsWithSaved as ApiEvent[]);
          setEvents(eventsWithSaved as ApiEvent[]);
          lastFetchTimeRef.current = Date.now();
        } catch (_savedEventsError) {
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch events:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchEvents();
    
    const handleEventsUpdate = () => fetchEvents(true);
    const handleSavedUpdate = () => fetchEvents(true);
    const eventsChannel = supabase
      .channel('events-page-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, handleEventsUpdate)
      .subscribe();

    window.addEventListener('eventsUpdated', handleEventsUpdate);
    window.addEventListener('savedEventsUpdated', handleSavedUpdate);
    return () => {
      window.removeEventListener('eventsUpdated', handleEventsUpdate);
      window.removeEventListener('savedEventsUpdated', handleSavedUpdate);
      supabase.removeChannel(eventsChannel);
    };
  }, [initialEvents]);  // Note: we use initialEvents not events.length to avoid re-fetch loop

  return {
    events,
    setEvents,
    currentUserId,
    isFetching,
    hasLoadedEvents,
  };
}
