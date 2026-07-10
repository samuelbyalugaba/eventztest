import { useEffect, useMemo } from 'react';
import type { Event as ApiEvent } from '../../utils/supabase/api';
import { useProfileStore } from '../../store/profileStore';

interface UseProfileStatsParams {
  userId?: string;
  isOwnProfile: boolean;
  isOrganizer: boolean;
  ticketEvents: any[];
  publishedEvents: ApiEvent[];
  attendedEvents: ApiEvent[];
  streamedVideos: any[];
  isLoadingOrganizerEvents: boolean;
  isLoadingStreamedVideos: boolean;
  isLoadingTickets: boolean;
  isLoading: boolean;
  followStats: { followers: number; following: number };
}

export function useProfileStats({
  userId,
  isOwnProfile,
  isOrganizer,
  ticketEvents,
  publishedEvents,
  attendedEvents,
  streamedVideos,
  isLoadingOrganizerEvents,
  isLoadingStreamedVideos,
  isLoadingTickets,
  isLoading,
  followStats,
}: UseProfileStatsParams) {
  const cacheKey = userId || (isOwnProfile ? '__self__' : '');
  const cachedSnapshot = useProfileStore((s) => (cacheKey ? s.userStatsCache[cacheKey] : null));
  const setUserStats = useProfileStore((s) => s.setUserStats);

  const uniqueTicketGroups = useMemo(() => {
    if (!ticketEvents.length) return [];
    const grouped = new Map<string, any[]>();
    ticketEvents.forEach((ticket: any) => {
      const eventId = ticket.event_id || ticket.event?.id;
      if (!eventId) return;
      if (!grouped.has(eventId)) grouped.set(eventId, []);
      grouped.get(eventId)!.push(ticket);
    });
    return Array.from(grouped.values());
  }, [ticketEvents]);

  const pastHostedEvents = useMemo(() => {
    const now = new Date();
    return publishedEvents.filter((event) => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      return eventDate < now;
    });
  }, [publishedEvents]);

  const playableStreamsCount = useMemo(() => {
    return streamedVideos.filter((s: any) => s?.has_recording || s?.playback_url).length;
  }, [streamedVideos]);

  const freshQueriesResolved = isOrganizer
    ? !isLoading && !isLoadingOrganizerEvents && !isLoadingStreamedVideos
    : !isLoading && !isLoadingTickets;

  const freshHosted = pastHostedEvents.length + playableStreamsCount;
  const freshAttended = attendedEvents.length + ticketEvents.length;

  // Prefer live values once queries resolved; otherwise fall back to persisted
  // snapshot so returning users see the right numbers immediately on reload.
  const hostedCount = freshQueriesResolved ? freshHosted : cachedSnapshot?.hosted ?? freshHosted;
  const attendedCount = freshQueriesResolved ? freshAttended : cachedSnapshot?.attended ?? freshAttended;
  const displayFollowers = !isLoading ? followStats.followers : cachedSnapshot?.followers ?? followStats.followers;
  const displayFollowing = !isLoading ? followStats.following : cachedSnapshot?.following ?? followStats.following;

  // Ready if we have a cached snapshot OR the fresh queries have resolved.
  const statsReady = !!cachedSnapshot || (freshQueriesResolved && !isLoading);

  // Persist snapshot whenever fresh data resolves so the next visit is instant.
  useEffect(() => {
    if (!cacheKey) return;
    if (!freshQueriesResolved || isLoading) return;
    setUserStats(cacheKey, {
      hosted: freshHosted,
      attended: freshAttended,
      followers: followStats.followers,
      following: followStats.following,
    });
  }, [cacheKey, freshQueriesResolved, isLoading, freshHosted, freshAttended, followStats.followers, followStats.following, setUserStats]);

  return {
    uniqueTicketGroups,
    pastHostedEvents,
    hostedCount,
    attendedCount,
    displayFollowers,
    displayFollowing,
    statsReady,
  };
}
