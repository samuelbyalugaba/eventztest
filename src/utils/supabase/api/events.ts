import { supabase } from './client';
import type { Profile } from './profile';

import { deleteFile } from './storage';

export type Event = {
  id: number;
  organizer_id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  city?: string;
  category: string;
  subcategory: string;
  price_range: string;
  image_url: string;
  attendees?: number;
  views?: number;
  streaming?: {
    available: boolean;
    quality: 'HD' | '4K' | 'SD';
    virtualPrice?: string;
    isLive?: boolean;
    liveViewers?: number;
    replayAvailable?: boolean;
    features?: string[];
    playback_url?: string;
    stream_key?: string;
    ingest_url?: string;
    provider?: string;
    startedAt?: string | number;
    endedAt?: string | number;
    lastRecordedAt?: string | number;
    cf_live_input_uid?: string;
    externalTicketing?: {
      enabled: boolean;
      phone?: string;
    };
  };
  ticket_tiers?: {
    name: string;
    price: string;
    priceNumeric: number;
    available: number;
    features: string[];
    color?: string;
  }[];
  event_highlights?: {
    image?: string;
    video?: string;
    caption: string;
    type: 'performer' | 'special_guest' | 'venue' | 'preview';
    mediaType: 'image' | 'video';
  }[];
  organizer?: Profile;
  isSaved?: boolean;
  hasReminder?: boolean;
  status?: 'published' | 'draft' | 'cancelled';
};

const EVENT_CARD_COLUMNS = `
  id, title, description, date, time, location, city, category, subcategory,
  price, price_range, image_url, attendees, views, status, streaming,
  ticket_tiers, organizer_id, created_at, updated_at,
  organizer:profiles(id, full_name, username, avatar_url, location, is_organizer, verified)
`;

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getEvents = async (options?: { limit?: number; includePast?: boolean }) => {
  const limit = options?.limit ?? 100;
  const today = getLocalDateString();

  let query = supabase
    .from('events')
    .select(EVENT_CARD_COLUMNS)
    .order('date', { ascending: true })
    .limit(limit);

  if (!options?.includePast) {
    query = query.gte('date', today);
  }

  const { data, error } = await query;

  if (error) {
    if (error.name === 'AbortError') return [];
    throw error;
  }

  const visibleEvents = (data || []).filter((event: any) => !event?.streaming?.isInstant);
  return visibleEvents.map((event: any) => ({
    ...event,
    attendees: event.attendees ?? 0,
  }));
};

export const getOrganizerEvents = async (
  organizerId: string,
  options?: { includeInstant?: boolean }
) => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      organizer:profiles(*),
      tickets(count),
      saved_events(count),
      posts(count)
    `)
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const visibleEvents = options?.includeInstant
    ? (data || [])
    : (data || []).filter((event: any) => !event?.streaming?.isInstant);
  return visibleEvents.map((event: any) => ({
    ...event,
    interested: event.saved_events?.[0]?.count || 0,
    shares: event.posts?.[0]?.count || 0,
    attendees: (event.attendees || 0) + (event.tickets?.[0]?.count || 0)
  }));
};

export const incrementEventView = async (eventId: number) => {
  const { error } = await supabase.rpc('increment_event_view', { event_id: eventId });

  if (error) {
  }
};

export const getEventAnalytics = async (eventId: number) => {
  try {
    const { data, error } = await supabase.rpc('get_event_analytics', {
      target_event_id: eventId
    });

    if (error) {
      return {
        views: { total: 0, change: 0, trend: 'neutral', daily: [] },
        interested: { total: 0, change: 0, trend: 'neutral' },
        shares: { total: 0, change: 0, trend: 'neutral' },
        ticketsSold: { total: 0, change: 0, trend: 'neutral' },
      revenue: { total: 'TSh 0', change: 0, trend: 'neutral' },
      demographics: { locations: [], ageGroups: [] }
      };
    }

    const calculateTrendFromStats = (last7: number, prev7: number) => {
      if (prev7 === 0) return { change: last7 > 0 ? 100 : 0, trend: 'neutral' as const };
      const change = Math.round(((last7 - prev7) / prev7) * 100);
      return {
        change: Math.abs(change),
        trend: (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral'
      };
    };

    const interestedTrend = calculateTrendFromStats(data.trends.interested.last7, data.trends.interested.prev7);
    const ticketsTrend = calculateTrendFromStats(data.trends.tickets.last7, data.trends.tickets.prev7);
    const sharesTrend = calculateTrendFromStats(data.trends.shares.last7, data.trends.shares.prev7);

    const revenueStr = data.revenue > 0 ? `TSh ${data.revenue.toLocaleString()}` : 'TSh 0';

    return {
      views: {
        total: data.views,
        change: 0,
        trend: 'neutral',
        daily: data.dailyActivity
      },
      interested: {
        total: data.interested,
        change: interestedTrend.change,
        trend: interestedTrend.trend
      },
      shares: {
        total: data.shares,
        change: sharesTrend.change,
        trend: sharesTrend.trend
      },
      ticketsSold: {
        total: data.ticketsSold,
        change: ticketsTrend.change,
        trend: ticketsTrend.trend
      },
      revenue: {
        total: revenueStr,
        change: ticketsTrend.change,
        trend: ticketsTrend.trend
      },
      demographics: {
        locations: Object.entries(data.demographics.locations).map(([city, count]) => {
          const total = Object.values(data.demographics.locations).reduce((a: any, b: any) => a + b, 0) as number;
          return {
            city,
            percent: total > 0 ? Math.round(((count as number) / total) * 100) : 0
          };
        }),
        ageGroups: Object.entries(data.demographics.ageGroups).map(([range, count]) => {
          const total = Object.values(data.demographics.ageGroups).reduce((a: any, b: any) => a + b, 0) as number;
          return {
            range,
            percent: total > 0 ? Math.round(((count as number) / total) * 100) : 0
          };
        })
      }
    };
  } catch (err) {
    return {
      views: { total: 0, change: 0, trend: 'neutral', daily: [] },
      interested: { total: 0, change: 0, trend: 'neutral' },
      shares: { total: 0, change: 0, trend: 'neutral' },
      ticketsSold: { total: 0, change: 0, trend: 'neutral' },
      revenue: { total: 'TSh 0', change: 0, trend: 'neutral' },
      demographics: { locations: [], ageGroups: [] }
    };
  }
};

export const getEventById = async (id: number) => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      organizer:profiles(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const getEventAttendees = async (eventId: number, limit = 5) => {
  const { data, error } = await supabase
    .from('tickets')
    .select('user:profiles(avatar_url, full_name)')
    .eq('event_id', eventId)
    .limit(limit);

  if (error) throw error;
  return data.map((t: any) => t.user).filter((u: any) => !!u);
};

export const createEvent = async (eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'>) => {
  const eventDate = new Date(eventData.date);
  const today = new Date();
  today.setHours(0,0,0,0);
  
  if (isNaN(eventDate.getTime()) || eventDate < today) {
    throw new Error('Event date cannot be in the past');
  }

  if (eventData.title.length < 3 || eventData.title.length > 100) {
    throw new Error('Title must be between 3 and 100 characters');
  }

  if (!eventData.category) {
    (eventData as any).category = 'Entertainment';
  }

  if (Array.isArray(eventData.ticket_tiers)) {
    eventData.ticket_tiers.forEach((tier: any) => {
      if (tier.price < 0) throw new Error('Ticket price cannot be negative');
      if (tier.quantity < 0) throw new Error('Ticket quantity cannot be negative');
    });
  }
  
  const { data, error } = await supabase
    .from('events')
    .insert(eventData)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const updateEvent = async (eventId: number, eventData: Partial<Event>) => {
  if (eventData.date) {
    if (new Date(eventData.date) < new Date(new Date().setHours(0,0,0,0))) {
      throw new Error('Event date cannot be in the past');
    }
  }

  if ('category' in eventData && !eventData.category) {
    (eventData as any).category = 'Entertainment';
  }

  if (eventData.ticket_tiers && Array.isArray(eventData.ticket_tiers)) {
    eventData.ticket_tiers.forEach((tier: any) => {
      if (tier.price < 0) throw new Error('Ticket price cannot be negative');
      if (tier.quantity < 0) throw new Error('Ticket quantity cannot be negative');
    });
  }

  const { data, error } = await supabase
    .from('events')
    .update(eventData)
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const deleteEvent = async (id: number) => {
  const { data: event } = await supabase
    .from('events')
    .select('image_url')
    .eq('id', id)
    .single();

  const { error } = await supabase.rpc('delete_event_complete', {
    target_event_id: id
  });

  if (error) {
    if (error.code === '42883') {
      await supabase.from('stream_chat_messages').delete().eq('event_id', id);
      await supabase.from('saved_events').delete().eq('event_id', id);
      await supabase.from('tickets').delete().eq('event_id', id);
      const { error: deleteError } = await supabase.from('events').delete().eq('id', id);
      if (deleteError) throw deleteError;
    } else {
      throw error;
    }
  }

  if (event?.image_url) {
    await deleteFile('events', event.image_url);
  }
};

export const getLiveStreams = async () => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id, title, description, date, time, location, city, category, image_url,
      price, price_range, attendees, views, status, streaming, organizer_id,
      organizer:profiles(id, full_name, username, avatar_url, location, is_organizer, verified)
    `)
    .eq('status', 'published')
    .contains('streaming', { available: true, isLive: true })
    .limit(50);

  if (error) throw error;
  return data;
};

export const getUpcomingStreams = async () => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id, title, description, date, time, location, city, category, image_url,
      price, price_range, attendees, views, status, streaming, organizer_id,
      organizer:profiles(id, full_name, username, avatar_url, location, is_organizer, verified)
    `)
    .eq('status', 'published')
    .contains('streaming', { available: true })
    .gte('date', new Date().toISOString().split('T')[0])
    .limit(50);

  if (error) throw error;

  return (data || []).filter((e: any) => !e.streaming?.isLive);
};

const notifyLiveStreamsUpdated = (eventId?: number, isLive?: boolean) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('liveStreamsUpdated', { detail: { eventId, isLive } }));
};

export const updateEventStreamingStatus = async (eventId: number, isLive: boolean) => {
  const { data: currentEvent } = await supabase.from('events').select('streaming').eq('id', eventId).single();
  
  const currentStreaming = currentEvent?.streaming || {};
  const now = new Date().toISOString();
  const updates: any = {
    streaming: {
      isLive,
      available: true,
      provider: (currentStreaming as any).provider || 'agora',
      liveViewers: isLive ? 0 : 0,
      ...(isLive
        ? { startedAt: now, endedAt: null }
        : { endedAt: now, lastRecordedAt: now }),
    }
  };

  const newStreaming = { ...currentStreaming, ...updates.streaming };

  const { data, error } = await supabase
    .from('events')
    .update({ streaming: newStreaming })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;

  if (isLive === false) {
    try {
      await supabase
        .from('stream_chat_messages')
        .delete()
        .eq('event_id', eventId);
    } catch (cleanupError) {
    }
  }

  notifyLiveStreamsUpdated(eventId, isLive);

  return data;
};

export const toggleLikeEvent = async (eventId: number, userId: string) => {
  const { data: existing, error: selectError } = await supabase
    .from('event_likes')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase.from('event_likes').delete().eq('event_id', eventId).eq('user_id', userId);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase.from('event_likes').insert({ event_id: eventId, user_id: userId });
    if (error) throw error;
    return true;
  }
};

export const getEventLikes = async (eventId: number) => {
  const { count, error } = await supabase
    .from('event_likes')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (error) throw error;
  return count || 0;
};

export const hasUserLikedEvent = async (eventId: number, userId: string) => {
  const { data, error } = await supabase
    .from('event_likes')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

export const sendGift = async (eventId: number, amount: number, currency: string = 'TZS') => {
  const { sendStreamMessage } = await import('./streamChat');
  const { data, error } = await supabase.functions.invoke('send-gift', {
    body: { eventId, amount, currency },
  });

  if (error) {
    const ctx = (error as any)?.context;
    if (ctx instanceof Response) {
      try {
        const body = await ctx.clone().json();
        throw new Error(body?.error || 'Gift failed');
      } catch (e: any) {
        if (e.message !== 'Gift failed' && e.message) throw e;
      }
    }
    throw new Error(error.message || 'Gift failed');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  await sendStreamMessage(eventId, `[Gift] Sent a gift of ${currency} ${amount.toLocaleString()}.`);

  return data;
};

export const updateLiveViewerCount = async (eventId: number, delta: number) => {
  const { data: currentEvent, error: fetchError } = await supabase
    .from('events')
    .select('streaming')
    .eq('id', eventId)
    .single();

  if (fetchError) throw fetchError;

  const currentStreaming = currentEvent?.streaming || {};
  const currentCount = currentStreaming.liveViewers || 0;
  const newCount = Math.max(0, currentCount + delta);

  const { data, error } = await supabase
    .from('events')
    .update({ streaming: { ...currentStreaming, liveViewers: newCount } })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const subscribeToEventStreaming = (
  eventId: number,
  onUpdate: (streaming: Event['streaming'] | null) => void
) => {
  const channelName = `event-streaming-${eventId}-${Math.random().toString(36).slice(2, 9)}`;
  return supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
      (payload: any) => {
        onUpdate(payload.new?.streaming ?? null);
      }
    )
    .subscribe();
};

export const subscribeToStreamPresence = (
  eventId: number,
  meta: { userId: string; role: 'viewer' | 'host' },
  onCount: (count: number) => void
) => {
  const channel = supabase.channel(`stream-presence-${eventId}`, {
    config: { presence: { key: meta.userId } },
  });

  const recompute = () => {
    const state = channel.presenceState() as Record<string, Array<{ role: string }>>;
    let viewers = 0;
    for (const key in state) {
      const entries = state[key];
      if (entries?.[0]?.role === 'viewer') viewers += 1;
    }
    onCount(viewers);
  };

  channel
    .on('presence', { event: 'sync' }, recompute)
    .on('presence', { event: 'join' }, recompute)
    .on('presence', { event: 'leave' }, recompute)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ role: meta.role, joinedAt: Date.now() });
      }
    });

  return channel;
};

export const subscribeToEventLikes = (
  eventId: number,
  onChange: (change: { delta: number; userId?: string }) => void
) => {
  const channelName = `event-likes-${eventId}-${Math.random().toString(36).slice(2, 9)}`;
  return supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'event_likes', filter: `event_id=eq.${eventId}` },
      (payload: any) => onChange({ delta: 1, userId: payload.new?.user_id })
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'event_likes', filter: `event_id=eq.${eventId}` },
      (payload: any) => onChange({ delta: -1, userId: payload.old?.user_id })
    )
    .subscribe();
};

const normalizeEnv = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const supabaseFunctionUrl = (name: string) => {
  const baseUrl = normalizeEnv(import.meta.env.VITE_SUPABASE_URL);
  if (!baseUrl) {
    throw new Error('Streaming backend is not configured');
  }

  return `${baseUrl}/functions/v1/${name}`;
};

const getSupabaseAnonKey = () => {
  const anonKey = normalizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);
  const legacyKey = normalizeEnv(import.meta.env.VITE_SUPABASE_KEY);
  const key = anonKey || legacyKey;

  if (!key) {
    throw new Error('Streaming backend is not configured');
  }

  return key;
};

export const generateStreamKeys = async (eventId: number) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Please sign in again to generate RTMP keys');
  }

  const response = await fetch(supabaseFunctionUrl('cloudflare-stream-create'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: getSupabaseAnonKey(),
    },
    body: JSON.stringify({ eventId }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data || (data as any).error) {
    throw new Error(
      (data as any)?.error || `Failed to provision stream (${response.status})`
    );
  }

  const { ingestUrl, streamKey, playbackUrl } = data as {
    ingestUrl: string;
    streamKey: string;
    playbackUrl: string | null;
  };

  return { streamKey, ingestUrl, playbackUrl };
};
