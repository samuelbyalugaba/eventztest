import { supabase } from './client';

type OrganizerStats = {
  totalEvents: number
  followers: number
  totalViews: number
  ticketsSold: number
  revenue: number
  liveStreams: number
  avgRating: number
}

export const getOrganizerStats = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_organizer_stats', {
    target_user_id: userId
  });

  if (error) {
    throw error;
  }

  const stats = data as unknown as OrganizerStats

  return {
    totalEvents: stats.totalEvents,
    followers: stats.followers,
    totalViews: stats.totalViews,
    ticketsSold: stats.ticketsSold,
    revenue: stats.revenue,
    liveStreams: stats.liveStreams,
    avgRating: stats.avgRating
  };
};

export const getPlatformStats = async () => {
  const { count: activeUsers, error: usersError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (usersError) throw usersError;

  const { count: ticketsSold, error: ticketsError } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true });

  if (ticketsError) throw ticketsError;

  const { count: eventsHosted, error: eventsError } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });

  if (eventsError) throw eventsError;

  return {
    activeUsers: activeUsers || 0,
    ticketsSold: ticketsSold || 0,
    eventsHosted: eventsHosted || 0
  };
};
