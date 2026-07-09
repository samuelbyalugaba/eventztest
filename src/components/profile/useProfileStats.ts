import { useMemo } from 'react';
import type { Event as ApiEvent } from '../../utils/supabase/api';

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
  const uniqueTicketGroups = useMemo(() => {
    if (!ticketEvents.length) return [];
    const grouped = new Map<string, any[]>();
    ticketEvents.forEach((ticket: any) => {
      const eventId = ticket.event_id || ticket.event?.id;
      if (!eventId) return;
      if (!grouped.has(eventId)) grouped.set(eventId, []);
      grouped.get(eventId)!.push(ticket);
    });
    return Array.from(grouped.entries()).map(([eventId, tickets]) => ({
      eventId,
      event: tickets[0]?.event,
      tickets,
    }));
  }, [ticketEvents]);

  const pastHostedEvents = useMemo(() => {
    const now = new Date();
    return publishedEvents.filter((event) => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      return eventDate < now;
    });
  }, [publishedEvents]);

  const hostedCount = useMemo(() => {
    return publishedEvents.length + streamedVideos.length;
  }, [publishedEvents, streamedVideos]);

  const attendedCount = useMemo(() => {
    return attendedEvents.length + ticketEvents.length;
  }, [attendedEvents, ticketEvents]);

  const displayFollowers = followStats.followers;
  const displayFollowing = followStats.following;

  return {
    uniqueTicketGroups,
    pastHostedEvents,
    hostedCount,
    attendedCount,
    displayFollowers,
    displayFollowing,
  };
}
