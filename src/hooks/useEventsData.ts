import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { getEvents, getSavedEvents, type Event as ApiEvent } from '../utils/supabase/api';
import { useAuth } from '../contexts/AuthContext';
import { queryKeys } from '../queryKeys';

export function useEventsData() {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(authUser?.id ?? null);

  useEffect(() => {
    if (authUser?.id) {
      setCurrentUserId(authUser.id);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, [authUser]);

  const eventsQuery = useQuery({
    queryKey: queryKeys.events.publicList,
    queryFn: async (): Promise<ApiEvent[]> => {
      const allEvents = await getEvents();
      if (!currentUserId) {
        return (allEvents as any[]).map(e => ({ ...e, isSaved: false })) as ApiEvent[];
      }

      const savedEvents = await getSavedEvents(currentUserId);
      const savedIds = new Set((savedEvents as any[]).map(e => e.id));
      return (allEvents as any[]).map(e => ({
        ...e,
        isSaved: savedIds.has(e.id),
      })) as ApiEvent[];
    },
    staleTime: 15 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    const channel = supabase
      .channel('events-page-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.events.root });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const removeEvent = (eventId: string | number) => {
    queryClient.setQueryData<ApiEvent[]>(queryKeys.events.publicList, (old) =>
      old ? old.filter(e => e.id !== eventId) : old,
    );
  };

  return {
    events: eventsQuery.data ?? [],
    removeEvent,
    currentUserId,
    isFetching: eventsQuery.isFetching,
    hasLoadedEvents: eventsQuery.isSuccess,
  };
}
