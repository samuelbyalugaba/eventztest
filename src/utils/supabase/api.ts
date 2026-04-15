
import { supabase } from './client';
export { supabase };

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  is_organizer: boolean;
  verified: boolean;
  location: string;
  birthdate?: string; // Format: YYYY-MM-DD
  cover_url?: string;
  organizer_type?: string;
  phone?: string;
  website?: string;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  contact_email?: string;

  streaming_settings?: {
    defaultQuality: string;
    autoRecord: boolean;
    chatEnabled: boolean;
    reactionsEnabled: boolean;
    multiCamera: boolean;
    lowLatency: boolean;
  };
  privacy_settings?: {
    profileVisibility: string;
    showEmail: boolean;
    showPhone: boolean;
    allowMessages: boolean;
    showFollowers: boolean;
    showStats: boolean;
    showActivity?: boolean;
  };
  notification_settings?: {
    ticketSales: boolean;
    streamAlerts: boolean;
    weeklyReport: boolean;
    marketingEmails: boolean;
    newFollowers: boolean;
  };
  payment_settings?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    mobileMoney?: string;
    paymentMethod: string;
  };
  preferences?: {
    recentCountries?: string[];
    pwaDismissed?: string;
  };
  description?: string; // Long form description for creators
};

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
    stream_key?: string; // Private: For organizer OBS setup
    ingest_url?: string; // Private: RTMP URL
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

export type Ticket = {
  id: number;
  user_id: string;
  event_id: number;
  ticket_number: string;
  barcode: string;
  price: string;
  purchase_date: string;
  customer_name: string;
  customer_email: string;
  ticket_type: string;
  status: string;
  qr_code?: string;
  event?: Event;
};

export type UserMedia = {
  id: number;
  user_id: string;
  media_type: 'photo' | 'video';
  url: string;
  thumbnail_url?: string;
  caption?: string;
  likes: number;
  views: number;
  duration?: string;
  created_at: string;
};

export type ApiPost = {
  id: number;
  user_id: string;
  content: string;
  image_urls: string[];
  video_url?: string;
  views?: number;
  duration?: string;
  hashtags: string[];
  created_at: string;
  user?: Profile;
  event?: Event;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  posted_as_organizer?: boolean;
};

// --- PROFILES ---

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const sanitizedUpdates: Partial<Profile> = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  ) as Partial<Profile>;

  const emptyStringToNullKeys: (keyof Profile)[] = [
    'username',
    'full_name',
    'avatar_url',
    'bio',
    'location',
    'birthdate',
    'cover_url',
    'organizer_type',
    'phone',
    'website',
    'contact_email',
    'description'
  ];

  for (const k of emptyStringToNullKeys) {
    const v = (sanitizedUpdates as any)[k];
    if (typeof v === 'string' && v.trim() === '') {
      (sanitizedUpdates as any)[k] = null;
    }
  }

  const removedPrivilegedKeys: (keyof Profile)[] = [];
  for (const k of ['is_organizer', 'verified'] as (keyof Profile)[]) {
    if (k in sanitizedUpdates) {
      delete (sanitizedUpdates as any)[k];
      removedPrivilegedKeys.push(k);
    }
  }

  if (removedPrivilegedKeys.length > 0 && Object.keys(sanitizedUpdates).length === 0) {
    throw new Error('Unauthorized: You cannot update privileged profile fields directly.');
  }

  // Input Validation
  if (sanitizedUpdates.username && sanitizedUpdates.username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  
  if (sanitizedUpdates.full_name && sanitizedUpdates.full_name.length > 50) {
    throw new Error('Name cannot exceed 50 characters');
  }

  if (sanitizedUpdates.birthdate) {
    const birthDate = new Date(sanitizedUpdates.birthdate);
    const today = new Date();
    if (birthDate > today) {
      throw new Error('Birthdate cannot be in the future');
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ ...sanitizedUpdates, id: userId })
    .select()
    .single();

  if (!error) return data;

  const baseFields: Partial<Profile> = {
    username: sanitizedUpdates.username,
    full_name: sanitizedUpdates.full_name,
    avatar_url: sanitizedUpdates.avatar_url,
    bio: sanitizedUpdates.bio,
    location: sanitizedUpdates.location,
    birthdate: sanitizedUpdates.birthdate,
    cover_url: sanitizedUpdates.cover_url,
    organizer_type: sanitizedUpdates.organizer_type,
    contact_email: sanitizedUpdates.contact_email,
    phone: sanitizedUpdates.phone,
    website: sanitizedUpdates.website,
    social_links: sanitizedUpdates.social_links,
    description: sanitizedUpdates.description
  };

  const { data: data2, error: error2 } = await supabase
    .from('profiles')
    .upsert({ ...baseFields, id: userId })
    .select()
    .single();

  if (!error2) return data2;

  // If updates include more than just avatar, don't fallback to avatar-only update
  // as it would mask the failure of important field updates.
  const hasOtherUpdates = Object.keys(sanitizedUpdates).some(key => key !== 'avatar_url' && key !== 'id');
  
  if (!hasOtherUpdates && sanitizedUpdates.avatar_url) {
    const { data: data3, error: error3 } = await supabase
      .from('profiles')
      .upsert({ id: userId, avatar_url: sanitizedUpdates.avatar_url })
      .select()
      .single();
    if (!error3) return data3;
  }

  throw error2 || error;
};

// --- FOLLOWS ---

export const getFollowedUserIds = async (userId: string) => {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (error) throw error;
  return data.map(f => f.following_id);
};

export const checkIsFollowing = async (followerId: string, followingId: string) => {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

export const toggleFollow = async (followerId: string, followingId: string) => {
  const { data: existing, error: fetchError } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (fetchError) throw fetchError;

  if (existing && existing.length > 0) {
    // If exists (even multiple), delete all
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) throw error;
    return false; // Unfollowed
  } else {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
    return true; // Followed
  }
};

export const checkUsernameUnique = async (username: string, currentUserId?: string) => {
  let query = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('username', username);

  if (currentUserId) {
    query = query.neq('id', currentUserId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count === 0;
};

export const becomeOrganizer = async (details: {
  full_name: string;
  username: string;
  organizer_type: string;
  location: string;
  bio: string;
  avatar_url: string;
  contact_email?: string;
}) => {
  const { data, error } = await supabase.rpc('become_organizer', {
    p_full_name: details.full_name,
    p_username: details.username,
    p_organizer_type: details.organizer_type,
    p_location: details.location,
    p_bio: details.bio,
    p_avatar_url: details.avatar_url,
    p_contact_email: details.contact_email
  });

  if (error) throw error;
  return data;
};

export const searchProfiles = async (query: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;
  return data;
};



// --- ORGANIZER STATS ---

export const getOrganizerStats = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_organizer_stats', {
    target_user_id: userId
  });

  if (error) {
    throw error;
  }

  return {
    totalEvents: data.totalEvents,
    followers: data.followers,
    totalViews: data.totalViews,
    ticketsSold: data.ticketsSold,
    revenue: data.revenue,
    liveStreams: data.liveStreams,
    avgRating: data.avgRating
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

// --- FOLLOWS ---

export const getFollowersCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  if (error) throw error;
  return count || 0;
};

export const getFollowingCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);

  if (error) throw error;
  return count || 0;
};

export const followUser = async (followerId: string, followingId: string) => {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });

  // Ignore unique constraint violation (already following)
  if (error && error.code !== '23505') throw error;
};

export const unfollowUser = async (followerId: string, followingId: string) => {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) throw error;
};

export const isFollowing = async (followerId: string, followingId: string) => {
  const { data, error } = await supabase
    .from('follows')
    .select('created_at')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

export const getFollowers = async (userId: string) => {
  const { data, error } = await supabase
    .from('follows')
    .select(`
      follower:profiles!follows_follower_id_fkey(*)
    `)
    .eq('following_id', userId);

  if (error) throw error;
  return data.map((f: any) => f.follower);
};

export const getFollowing = async (userId: string) => {
  const { data, error } = await supabase
    .from('follows')
    .select(`
      following:profiles!follows_following_id_fkey(*)
    `)
    .eq('follower_id', userId);

  if (error) throw error;
  return data.map((f: any) => f.following);
};


export const getMutualFollows = async (userId: string) => {
  // 1. Get IDs of people I follow
  const { data: following, error: followingError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (followingError) throw followingError;

  const followingIds = following.map(f => f.following_id);

  if (followingIds.length === 0) return [];

  // 2. Find which of them follow me back
  const { data: mutual, error: mutualError } = await supabase
    .from('follows')
    .select(`
      follower:profiles!follows_follower_id_fkey(*)
    `)
    .eq('following_id', userId)
    .in('follower_id', followingIds);

  if (mutualError) throw mutualError;

  return mutual.map((m: any) => m.follower);
};

export const subscribeToOnlineUsers = (userId: string, callback: (onlineUserIds: string[]) => void) => {
  const channel = supabase.channel('online-users');

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const userIds = new Set<string>();
      
      for (const id in state) {
        const presences = state[id] as any[];
        presences.forEach(p => {
          if (p.user_id) userIds.add(p.user_id);
        });
      }
      
      callback(Array.from(userIds));
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    });

  return channel;
};

// --- EVENTS ---

export const getEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      organizer:profiles(*),
      tickets(count)
    `)
    .order('date', { ascending: true });

  if (error) {
    if (error.name === 'AbortError') {
      return []; // Return empty array on abort
    }
    throw error;
  }

  // Calculate attendees from tickets count
  // Prioritize using the 'attendees' column from the events table if it exists and is not null
  // Otherwise fall back to counting tickets (which may be limited by RLS)
  const visibleEvents = (data || []).filter((event: any) => !event?.streaming?.isInstant);
  return visibleEvents.map((event: any) => ({
    ...event,
    attendees: (event.attendees !== undefined && event.attendees !== null) 
      ? event.attendees 
      : (event.tickets?.[0]?.count || 0)
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
  // RPC (atomic increment)
  const { error } = await supabase.rpc('increment_event_view', { event_id: eventId });

  if (error) {
  }
};

export const incrementPostView = async (postId: number) => {
  const { error } = await supabase.rpc('increment_post_view', { post_id: postId });

  if (error) {
  }
};

export const incrementUserMediaView = async (mediaId: number) => {
  const { error } = await supabase.rpc('increment_media_view', { media_id: mediaId });
  
  if (error) {
  }
};

export const getEventAnalytics = async (eventId: number) => {
  try {
    const { data, error } = await supabase.rpc('get_event_analytics', {
      target_event_id: eventId
    });

    if (error) {
      // Return mock data on error to prevent UI crash
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

    // Format revenue string
    const revenueStr = data.revenue > 0 ? `TSh ${data.revenue.toLocaleString()}` : 'TSh 0';

    return {
      views: {
        total: data.views,
        change: 0, // Views trend not tracked in RPC yet, placeholder
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
          // Calculate percent
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
    // Return mock data so the UI doesn't crash
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
  // Input Validation
  // Ensure date is valid (handle string or Date object)
  const eventDate = new Date(eventData.date);
  const today = new Date();
  today.setHours(0,0,0,0);
  
  if (isNaN(eventDate.getTime()) || eventDate < today) {
    throw new Error('Event date cannot be in the past');
  }

  if (eventData.title.length < 3 || eventData.title.length > 100) {
    throw new Error('Title must be between 3 and 100 characters');
  }

  // Ensure category is present (default to Entertainment if missing to avoid not-null constraint violation)
  if (!eventData.category) {
    (eventData as any).category = 'Entertainment';
  }

  if (Array.isArray(eventData.ticket_tiers)) {
    eventData.ticket_tiers.forEach((tier: any) => {
      if (tier.price < 0) throw new Error('Ticket price cannot be negative');
      if (tier.quantity < 0) throw new Error('Ticket quantity cannot be negative');
    });
  }

  // Ensure description is not empty if required, or handle optional fields
  // Also ensure object keys match database columns exactly
  // Note: 'status' should be 'published' or 'draft'
  
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
  // Input Validation
  if (eventData.date) {
    if (new Date(eventData.date) < new Date(new Date().setHours(0,0,0,0))) {
      throw new Error('Event date cannot be in the past');
    }
  }

  // Ensure category is present if it's being updated (though partial updates might not include it, if it IS included but null/empty, we fix it)
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
  // 1. Fetch event to get image URL
  const { data: event } = await supabase
    .from('events')
    .select('image_url')
    .eq('id', id)
    .single();

  // 2. Use RPC to delete event and all related data (bypassing RLS for child records)
  const { error } = await supabase.rpc('delete_event_complete', {
    target_event_id: id
  });

  if (error) {
    // Fallback for older DB versions or if RPC missing (though this will likely fail with FK violation)
    if (error.code === '42883') { // undefined_function
      // Try manual cleanup (will fail if RLS blocks deletion of other users' data)
      await supabase.from('stream_chat_messages').delete().eq('event_id', id);
      await supabase.from('saved_events').delete().eq('event_id', id);
      await supabase.from('tickets').delete().eq('event_id', id);
      const { error: deleteError } = await supabase.from('events').delete().eq('id', id);
      if (deleteError) throw deleteError;
    } else {
      throw error;
    }
  }

  // 3. Delete image from storage
  if (event?.image_url) {
    await deleteFile('events', event.image_url);
  }
};

// --- STORAGE ---

export const deleteFile = async (bucket: 'events' | 'avatars' | 'posts', url: string) => {
  try {
    // Extract path from URL
    // Format: .../storage/v1/object/public/{bucket}/{path}
    const path = url.split(`${bucket}/`).pop();
    if (!path) return;

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
    }
  } catch (err) {
  }
};

export const uploadImage = async (file: File, bucket: 'events' | 'avatars' | 'posts', path?: string) => {
  // Validate file type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm'
  ];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, WebP, GIF, MP4, and WebM are allowed.');
  }

  // Optimize images before upload (resize large images, compress)
  const isVideo = file.type.startsWith('video/');
  let optimizedFile = file;
  if (!isVideo) {
    const { optimizeForUpload } = await import('../imageOptimize');
    optimizedFile = await optimizeForUpload(file);
  }

  // Validate file size (100MB limit for videos, 10MB for images)
  const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
  
  if (optimizedFile.size > maxSize) {
    throw new Error(`File size too large. Maximum size is ${isVideo ? '100MB' : '10MB'}.`);
  }

  const fileExt = (optimizedFile.name.split('.').pop() || '').toLowerCase();
  if (isVideo && fileExt === 'mov') {
    throw new Error('MOV videos are not supported. Please upload MP4 (H.264) or WebM.');
  }
  const fileName = `${crypto.randomUUID()}_${Date.now()}.${fileExt}`;
  const filePath = path ? `${path}/${fileName}` : fileName;

  const tryUpload = async (targetBucket: 'events' | 'avatars' | 'posts') => {
    const { error: uploadError } = await supabase.storage
      .from(targetBucket)
      .upload(filePath, optimizedFile, {
        contentType: optimizedFile.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(targetBucket)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  try {
    return await tryUpload(bucket);
  } catch (error: any) {
    // Fallback logic for buckets
    if (
      (bucket === 'posts' || bucket === 'events' || bucket === 'avatars') &&
      error &&
      typeof error.message === 'string' &&
      (error.message.toLowerCase().includes('bucket not found') || 
       error.message.toLowerCase().includes('row-level security policy'))
    ) {
      // Try a fallback bucket
      let fallbackBucket: 'events' | 'avatars' | 'posts' = 'events';
      if (bucket === 'events') fallbackBucket = 'posts';
      // If avatars fails, default to events (which is the most likely to exist)
      
      return await tryUpload(fallbackBucket);
    }
    throw error;
  }
};

// --- TICKETS ---

export const getUserTickets = async (userId: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      event:events (
        *,
        organizer:profiles(*)
      )
    `)
    .eq('user_id', userId)
    .order('purchase_date', { ascending: false });

  if (error) throw error;
  return data;
};

export const hasActiveVirtualTicket = async (userId: string, eventId: number) => {
  const { count, error } = await supabase
    .from('tickets')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('ticket_type', 'Virtual')
    .eq('status', 'active');

  if (error) throw error;
  return (count || 0) > 0;
};

export const createTicket = async (ticket: Omit<Ticket, 'id' | 'created_at' | 'event'> & { transaction_id?: number }) => {
  // SECURITY: Require a valid transaction_id for paid tickets to prevent free ticket bypass
  const price = ticket.price ? parseFloat(ticket.price.replace(/[^0-9.]/g, '')) : 0;
  if (price > 0 && !ticket.transaction_id) {
    throw new Error('Payment verification required: transaction_id is missing for a paid ticket.');
  }

  // Verify the transaction exists and is completed before creating ticket
  if (ticket.transaction_id) {
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('id', ticket.transaction_id)
      .single();

    if (txnError || !txn) {
      throw new Error('Payment verification failed: transaction not found.');
    }

    if (txn.status !== 'completed' && txn.status !== 'success') {
      throw new Error(`Payment verification failed: transaction status is "${txn.status}".`);
    }
  }

  // Use the secure RPC function to purchase tickets
  const { data, error } = await supabase.rpc('purchase_ticket', {
    p_event_id: ticket.event_id,
    p_ticket_type: ticket.ticket_type,
    p_customer_name: ticket.customer_name,
    p_customer_email: ticket.customer_email,
    p_ticket_number: ticket.ticket_number,
    p_qr_code: ticket.qr_code || null,
    p_user_id: (ticket as any).user_id || null,
    p_price: ticket.price || null,
    p_transaction_id: (ticket as any).transaction_id
  });

  if (error) {
    throw error;
  }

  // Fetch the fully created ticket to return to the frontend
  if (data && data.id) {
    const { data: fullTicket, error: fetchError } = await supabase
      .from('tickets')
      .select()
      .eq('id', data.id)
      .single();
      
    if (fetchError) throw fetchError;
    return fullTicket;
  }

  return data;
};

export const scanTicket = async (ticketCode: string, eventId: number) => {
  const { data, error } = await supabase.rpc('scan_ticket', {
    p_ticket_code: ticketCode,
    p_event_id: eventId
  });

  if (error) {
    throw error;
  }

  return data;
};

// --- TRANSACTIONS / PAYMENTS ---

export const createTransaction = async (transactionData: {
  user_id: string;
  event_id: number;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  type?: string;
  metadata?: any;
}) => {
  const { type, metadata, ...rest } = transactionData as any;
  const nextMetadata =
    type && (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || metadata.type == null)
      ? { ...(metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}), type }
      : metadata;

  const insertData = { ...rest, ...(nextMetadata !== undefined ? { metadata: nextMetadata } : {}) };
  const { data, error } = await supabase
    .from('transactions')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const initiateSnippePayment = async (params: {
  amount: number;
  currency?: string;
  phoneNumber: string; // e.g., "2557..."
  provider: string; // "Airtel", "Tigo", "Halopesa", "Mpesa"
  eventId: number;
  ticketId?: number;
  userId: string;
  metadata?: any;
}) => {

  // When using --no-verify-jwt, invoke without auth headers/session context if needed, 
  // but supabase-js client handles it.
  // If we want to be explicit about headers:
  const { data, error } = await supabase.functions.invoke('snippe-payment', {
    body: {
      ...params,
      currency: params.currency || 'TZS'
    },
    headers: {
      // 'Authorization': `Bearer ${anon_key}`, // Usually handled automatically
    }
  });


  if (error) {
    const response = (error as { context?: Response }).context;

    if (response instanceof Response) {
      const payload = await response.clone().json().catch(async () => {
        const text = await response.text().catch(() => '');
        return text ? { error: text } : null;
      });

      const message = payload && typeof payload === 'object'
        ? ('error' in payload && typeof payload.error === 'string' ? payload.error : 'message' in payload && typeof payload.message === 'string' ? payload.message : null)
        : null;

      throw new Error(message || error.message);
    }

    throw error;
  }

  // Handle successful initiation but logical failure from Snippe
  if (data && !data.success) {
    throw new Error(data.error || 'Payment initiation failed');
  }

  // Handle case where Snippe returns success=true but data is missing
  if (data && data.success && !data.data) {
  }

  return data;
};

export const waitForTransactionCompletion = async (transactionId: number, timeoutMs = 60000) => {
  return new Promise<boolean>((resolve) => {
    // 1. First check current status (it might already be done)
    supabase
      .from('transactions')
      .select('status')
      .eq('id', transactionId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          if (data.status === 'completed' || data.status === 'success') {
            resolve(true);
            return;
          }
          if (data.status === 'failed' || data.status === 'cancelled') {
            resolve(false);
            return;
          }
        }
      });

    // 2. Set up real-time subscription
    const channel = supabase
      .channel(`transaction-status-${transactionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${transactionId}`
        },
        (payload) => {
          const status = payload.new.status;
          if (status === 'completed' || status === 'success') {
            supabase.removeChannel(channel);
            clearTimeout(timeout);
            resolve(true);
          } else if (status === 'failed' || status === 'cancelled') {
            supabase.removeChannel(channel);
            clearTimeout(timeout);
            resolve(false);
          }
        }
      )
      .subscribe();

    // 3. Set timeout fallback
    const timeout = setTimeout(() => {
      supabase.removeChannel(channel);
      resolve(false);
    }, timeoutMs);
  });
};

// --- SAVED EVENTS ---

export const getSavedEvents = async (userId: string) => {
  const { data, error } = await supabase
    .from('saved_events')
    .select(`
      is_reminder,
      event:events (
        *,
        organizer:profiles(*)
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  
  // Transform the response to return a flat list of events
  // The query returns { event: { ... } }[], we want { ... }[]
  return data.map(item => ({
    ...item.event,
    isSaved: true,
    hasReminder: item.is_reminder
  }));
};

export const toggleSaveEvent = async (eventId: number, userId: string) => {
  const { data: existing } = await supabase
    .from('saved_events')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    const { error } = await supabase.from('saved_events').delete().eq('id', existing.id);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase.from('saved_events').insert({ event_id: eventId, user_id: userId });
    if (error) throw error;
    return true;
  }
};

export const toggleReminder = async (eventId: number, userId: string) => {
  const { data: existing } = await supabase
    .from('saved_events')
    .select('id, is_reminder')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('saved_events')
      .update({ is_reminder: !existing.is_reminder })
      .eq('id', existing.id);
    if (error) throw error;
    return !existing.is_reminder;
  } else {
    const { error } = await supabase
      .from('saved_events')
      .insert({ event_id: eventId, user_id: userId, is_reminder: true });
    if (error) throw error;
    return true;
  }
};

export const subscribeToSavedEvents = (userId: string, callback: () => void) => {
  return supabase
    .channel(`saved_events:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'saved_events',
        filter: `user_id=eq.${userId}`
      },
      () => {
        callback();
      }
    )
    .subscribe();
};

export const deleteConversation = async (conversationId: number) => {
  // Messages will be deleted automatically via ON DELETE CASCADE
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (error) throw error;
};

export const markConversationAsUnread = async (conversationId: number, userId: string) => {
  // Find the last message sent by the OTHER person
  const { data: lastMessage } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMessage) {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: false })
      .eq('id', lastMessage.id);

    if (error) throw error;
    return true;
  }
  return false;
};

// --- USER MEDIA ---

export const getUserMedia = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_media')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export type PostComment = {
  id: number;
  user_id: string;
  post_id: number;
  text: string;
  created_at: string;
  duration?: string;
  user?: Profile;
};

// --- POSTS ---

export const getPosts = async (options: { currentUserId?: string; eventId?: number; authorId?: string; limit?: number; offset?: number } = {}) => {
  let query = supabase
    .from('posts')
    .select(`
      *,
      user:profiles(*),
      event:events(*),
      likes:post_likes(count),
      comments:post_comments(count)
    `)
    .order('created_at', { ascending: false });

  if (options.eventId) {
    query = query.eq('event_id', options.eventId);
  }

  if (options.authorId) {
    query = query.eq('user_id', options.authorId);
  }
  
  if (typeof options.limit === 'number') {
    const start = options.offset || 0;
    const end = start + Math.max(0, options.limit - 1);
    query = query.range(start, end);
  }

  const { data: posts, error } = await query;

  if (error) {
    throw error;
  }

  let likedPostIds = new Set<number>();
  let savedPostIds = new Set<number>();

  if (options.currentUserId) {
    try {
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', options.currentUserId);
      
      if (likes) likes.forEach(l => likedPostIds.add(l.post_id));

      const { data: saved } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', options.currentUserId);

      if (saved) saved.forEach(s => savedPostIds.add(s.post_id));
    } catch (e) {
    }
  }

  return (posts || []).map((p: any) => ({
    ...p,
    likes_count: p.likes?.[0]?.count || 0,
    comments_count: p.comments?.[0]?.count || 0,
    is_liked: likedPostIds.has(p.id),
    is_saved: savedPostIds.has(p.id)
  })) as ApiPost[];
};

export const getProfilePostsGrid = async (options: { authorId: string; limit?: number; offset?: number }) => {
  let query = supabase
    .from('posts')
    .select(`
      id,
      user_id,
      content,
      image_urls,
      video_url,
      views,
      duration,
      hashtags,
      created_at,
      posted_as_organizer,
      user:profiles(id, full_name, username, avatar_url, verified, is_organizer),
      event:events(id, title, date, time, location, image_url, price_range)
    `)
    .eq('user_id', options.authorId)
    .order('created_at', { ascending: false });

  if (typeof options.limit === 'number') {
    const start = options.offset || 0;
    const end = start + Math.max(0, options.limit - 1);
    query = query.range(start, end);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as ApiPost[];
};

export const getPostById = async (postId: number, currentUserId?: string) => {
  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      user:profiles(*),
      event:events(*),
      likes:post_likes(count),
      comments:post_comments(count)
    `)
    .eq('id', postId)
    .single();

  if (error) throw error;

  let isLiked = false;
  let isSaved = false;

  if (currentUserId) {
    const { data: like } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', currentUserId)
      .maybeSingle();
    isLiked = !!like;

    const { data: saved } = await supabase
      .from('saved_posts')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', currentUserId)
      .maybeSingle();
    isSaved = !!saved;
  }

  return {
    ...post,
    likes_count: post.likes?.[0]?.count || 0,
    comments_count: post.comments?.[0]?.count || 0,
    is_liked: isLiked,
    is_saved: isSaved
  };
};

export const deletePost = async (postId: number) => {
  // 1. Fetch post to get image URLs
  const { data: post } = await supabase
    .from('posts')
    .select('image_urls')
    .eq('id', postId)
    .single();

  // 2. Delete post row (CASCADE handles comments/likes)
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;

  // 3. Delete images from storage (Best effort)
  if (post?.image_urls && Array.isArray(post.image_urls)) {
    await Promise.all(post.image_urls.map(url => deleteFile('posts', url)));
  }
};

export const createPost = async (post: Omit<ApiPost, 'id' | 'created_at' | 'user' | 'event' | 'likes_count' | 'comments_count' | 'is_liked'>) => {
  // Input Validation
  const hasText = !!post.content?.trim();
  const hasImages = !!(post.image_urls && post.image_urls.length > 0);
  const hasVideo = !!post.video_url;
  if (!hasText && !hasImages && !hasVideo) {
    throw new Error('Post must contain text or media');
  }

  if (post.content && post.content.length > 2000) {
    throw new Error('Post content cannot exceed 2000 characters');
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      ...post,
      content: post.content?.trim() // Trim whitespace
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updatePostCaption = async (postId: number, userId: string, caption: string) => {
  const { data, error } = await supabase
    .from('posts')
    .update({ content: caption.trim() })
    .eq('id', postId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as ApiPost;
};

export const toggleLikePost = async (postId: number, userId: string) => {
  const { data: existing } = await supabase
    .from('post_likes')
    .select('user_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
    if (error) throw error;
    return true;
  }
};

export const toggleSavePost = async (postId: number, userId: string) => {
  const { data: existing } = await supabase
    .from('saved_posts')
    .select('user_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    const { error } = await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', userId);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase.from('saved_posts').insert({ post_id: postId, user_id: userId });
    if (error) throw error;
    return true;
  }
};

export const getPostComments = async (postId: number) => {
  const { data, error } = await supabase
    .from('post_comments')
    .select(`
      *,
      user:profiles(*),
      likes:comment_likes(count)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

export const createPostComment = async (postId: number, userId: string, text: string, parentId?: number) => {
  // Input Validation
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error('Comment cannot be empty');
  }

  if (trimmedText.length > 500) {
    throw new Error('Comment cannot exceed 500 characters');
  }

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ 
      post_id: postId, 
      user_id: userId, 
      text: trimmedText,
      parent_id: parentId 
    })
    .select(`
      *,
      user:profiles(*)
    `)
    .single();

  if (error) throw error;

  return data;
};

export const toggleLikeComment = async (commentId: number, userId: string) => {
  const { data: existing } = await supabase
    .from('comment_likes')
    .select('user_id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from('comment_likes')
      .insert({ comment_id: commentId, user_id: userId });
    if (error) throw error;
    return true;
  }
};

export const getLiveStreams = async () => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      organizer:profiles(*)
    `)
    .eq('status', 'published')
    .contains('streaming', { available: true, isLive: true });

  if (error) throw error;
  return data;
};

export const getUpcomingStreams = async () => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      organizer:profiles(*)
    `)
    .eq('status', 'published')
    .contains('streaming', { available: true })
    .gte('date', new Date().toISOString().split('T')[0]);

  if (error) throw error;

  // Filter for NOT live (since we can't easily do "not contains" or "value is false" mixed with other JSON checks efficiently without complex syntax,
  // but usually "upcoming" means date is future, so checking isLive might be redundant if date > today.
  // However, strict check:
  return data.filter((e: any) => !e.streaming?.isLive);
};

export const updateEventStreamingStatus = async (eventId: number, isLive: boolean) => {
  const updates: any = {
    streaming: {
      isLive,
      available: true, // Ensure streaming is marked available
      provider: 'agora',
      liveViewers: isLive ? 0 : undefined,
      startedAt: isLive ? new Date().toISOString() : undefined,
    }
  };

  // We need to merge with existing streaming data, not overwrite
  const { data: currentEvent } = await supabase.from('events').select('streaming').eq('id', eventId).single();
  
  const currentStreaming = currentEvent?.streaming || {};
  const newStreaming = { ...currentStreaming, ...updates.streaming };

  const { data, error } = await supabase
    .from('events')
    .update({ streaming: newStreaming })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;

  // If stream is ending (isLive set to false), clear the chat history for this session
  if (isLive === false) {
    try {
      await supabase
        .from('stream_chat_messages')
        .delete()
        .eq('event_id', eventId);
    } catch (cleanupError) {
    }
  }

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // 1. Check sender's wallet balance
  const { getLocalWalletBalance } = await import('../ntzs-api');
  const balance = await getLocalWalletBalance(user.id);
  if (balance < amount) {
    throw new Error(`Insufficient balance. You have TSh ${balance.toLocaleString()} but need TSh ${amount.toLocaleString()}.`);
  }

  // 2. Find the stream organizer (recipient)
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('organizer_id')
    .eq('id', eventId)
    .single();

  if (eventError || !event?.organizer_id) {
    throw new Error('Could not find stream organizer');
  }

  if (event.organizer_id === user.id) {
    throw new Error('You cannot send a gift to yourself');
  }

  // 3. Debit sender (gift sent)
  const transaction = await createTransaction({
    user_id: user.id,
    event_id: eventId,
    amount,
    currency,
    provider: 'Wallet',
    status: 'completed',
    metadata: { type: 'gift', direction: 'sent', recipientId: event.organizer_id, message: 'Sent a gift' }
  });

  // 4. Credit organizer (gift received)
  await createTransaction({
    user_id: event.organizer_id,
    event_id: eventId,
    amount,
    currency,
    provider: 'Wallet',
    status: 'completed',
    metadata: { type: 'gift-received', direction: 'received', senderId: user.id, message: 'Received a gift' }
  });

  // 5. Send a special chat message
  await sendStreamMessage(eventId, `🎁 Sent a gift of ${currency} ${amount.toLocaleString()}!`);

  return transaction;
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

export const generateStreamKeys = async (eventId: number) => {
  const channelName = `event-${eventId}`;
  const streamKey = channelName;
  const ingestUrl = "rtmp://rtmp.eventz-bridge.local/live";
  const playbackUrl = null;

  const updates = {
    stream_key: streamKey,
    ingest_url: ingestUrl,
    playback_url: playbackUrl,
    provider: 'agora-rtmp',
    channel: channelName
  };

  const { data: currentEvent } = await supabase.from('events').select('streaming').eq('id', eventId).single();
  const newStreaming = { ...(currentEvent?.streaming || {}), ...updates };

  const { error } = await supabase
    .from('events')
    .update({ streaming: newStreaming })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return { streamKey, ingestUrl, playbackUrl };
};

// --- STREAMING CHAT ---

export type StreamMessage = {
  id: number;
  event_id: number;
  user_id: string;
  message: string;
  created_at: string;
  user?: Profile;
};

export const getStreamMessages = async (eventId: number) => {
  const { data, error } = await supabase
    .from('stream_chat_messages')
    .select(`
      *,
      user:profiles(*)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) throw error;
  return data;
};

export const sendStreamMessage = async (eventId: number, message: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const trimmedMessage = message.trim();
  if (!trimmedMessage) throw new Error('Message cannot be empty');
  if (trimmedMessage.length > 200) throw new Error('Message too long (max 200 chars)');

  const { data, error } = await supabase
    .from('stream_chat_messages')
    .insert({
      event_id: eventId,
      user_id: user.id,
      message: trimmedMessage
    })
    .select(`
      *,
      user:profiles(*)
    `)
    .single();

  if (error) throw error;
  return data;
};

export const subscribeToStreamMessages = (eventId: number, callback: (message: StreamMessage) => void) => {
  return supabase
    .channel(`stream_chat:${eventId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'stream_chat_messages',
        filter: `event_id=eq.${eventId}`
      },
      async (payload) => {
        // Fetch user details for the new message
        const { data: user } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payload.new.user_id)
          .single();
        
        const message = {
          ...payload.new,
          user
        } as StreamMessage;
        
        callback(message);
      }
    )
    .subscribe();
};

export const subscribeToAllMessages = (callback: (message: Message) => void) => {
  return supabase
    .channel('global_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      async (payload) => {
        // Fetch user details for the new message
        const { data: sender } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payload.new.sender_id)
          .single();
        
        const message = {
          ...payload.new,
          sender
        } as Message;
        
        callback(message);
      }
    )
    .subscribe();
};

// --- DIRECT MESSAGING ---

export type Conversation = {
  id: number;
  participant1_id: string;
  participant2_id: string;
  created_at: string;
  updated_at: string;
  participant1?: Profile;
  participant2?: Profile;
  last_message?: Message;
  unread_count?: number;
};

export type Message = {
  id: number;
  conversation_id: number;
  sender_id: string;
  content: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
};

export const getConversations = async (userId: string) => {
  // Fetch conversations where user is participant1 OR participant2
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      participant1:profiles!participant1_id(*),
      participant2:profiles!participant2_id(*)
    `)
    .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Enhance with last message and unread count
  const conversationsWithDetails = await Promise.all(data.map(async (conv) => {
    // Get last message
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('is_read', false)
      .neq('sender_id', userId);

    return {
      ...conv,
      last_message: lastMsg,
      unread_count: unreadCount || 0
    };
  }));

  return conversationsWithDetails;
};

export const getMessages = async (conversationId: number) => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(*)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

export const sendMessage = async (conversationId: number, text: string, imageUrl?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const trimmedText = text.trim();
  if (!trimmedText && !imageUrl) {
    throw new Error('Message cannot be empty');
  }
  if (trimmedText.length > 5000) {
    throw new Error('Message too long (max 5000 chars)');
  }

  // Insert message
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmedText,
      image_url: imageUrl
    })
    .select('*')
    .single();

  if (error) throw error;

  return data;
};

export const startConversation = async (otherUserId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Check if conversation already exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`)
    .maybeSingle();

  if (existing) return existing;

  // Create new conversation
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      participant1_id: user.id,
      participant2_id: otherUserId,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteMessage = async (messageId: number) => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;
};

export const markMessagesAsRead = async (conversationId: number, userId: string) => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) throw error;
};



export const subscribeToMessages = (conversationId: number, callback: (message: Message) => void) => {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      async (payload) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payload.new.sender_id)
          .maybeSingle();

        const message = {
          ...payload.new,
          sender
        } as Message;
        
        callback(message);
      }
    )
    .subscribe();
};

// --- NOTIFICATIONS ---

export type Notification = {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'event';
  user: {
    name: string;
    avatar: string;
  };
  content: string;
  time: string; // ISO string
  read: boolean;
  created_at: string;
};

export const getNotifications = async (userId: string) => {
  const notifications: Notification[] = [];

  // Get last read timestamp
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_notification_read_at')
    .eq('id', userId)
    .maybeSingle();
    
  const lastReadTime = profile?.last_notification_read_at ? new Date(profile.last_notification_read_at).getTime() : 0;

  // 1. Fetch Follows (New Followers)
  const { data: follows } = await supabase
    .from('follows')
    .select(`
      created_at,
      follower:profiles!follower_id(full_name, avatar_url)
    `)
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (follows) {
    follows.forEach((follow: any) => {
      if (follow.follower) {
        notifications.push({
          id: `follow-${follow.created_at}`,
          type: 'follow',
          user: { 
            name: follow.follower.full_name || 'User', 
            avatar: follow.follower.avatar_url 
          },
          content: 'started following you',
          time: follow.created_at,
          read: new Date(follow.created_at).getTime() <= lastReadTime,
          created_at: follow.created_at
        });
      }
    });
  }

  // 2. Fetch Interactions on User's Posts (Optimized)
  
  // Fetch Likes (All time, optimized by join)
  const { data: likes } = await supabase
    .from('post_likes')
    .select(`
      created_at,
      user:profiles(id, full_name, avatar_url),
      post:posts!inner(id) 
    `)
    .eq('post.user_id', userId)
    .neq('user_id', userId) // Exclude self-likes
    .order('created_at', { ascending: false })
    .limit(20);

  if (likes) {
    likes.forEach((like: any) => {
      if (like.user) {
        notifications.push({
          id: `like-${like.created_at}-${like.user.id}`,
          type: 'like',
          user: { 
            name: like.user.full_name || 'User', 
            avatar: like.user.avatar_url 
          },
          content: 'liked your post',
          time: like.created_at,
          read: new Date(like.created_at).getTime() <= lastReadTime,
          created_at: like.created_at
        });
      }
    });
  }

  // Fetch Comments (All time, optimized by join)
  const { data: comments } = await supabase
    .from('post_comments')
    .select(`
      id,
      created_at,
      text,
      user:profiles(id, full_name, avatar_url),
      post:posts!inner(id)
    `)
    .eq('post.user_id', userId)
    .neq('user_id', userId) // Exclude self-comments
    .order('created_at', { ascending: false })
    .limit(20);

  if (comments) {
    comments.forEach((comment: any) => {
      if (comment.user) {
        notifications.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          user: { 
            name: comment.user.full_name || 'User', 
            avatar: comment.user.avatar_url 
          },
          content: `commented: "${comment.text.substring(0, 30)}${comment.text.length > 30 ? '...' : ''}"`,
          time: comment.created_at,
          read: new Date(comment.created_at).getTime() <= lastReadTime,
          created_at: comment.created_at
        });
      }
    });
  }

  // 3. Fetch Ticket Sales (For Organizers)
  try {
    const { data: ticketSales } = await supabase
      .from('tickets')
      .select(`
        id,
        created_at,
        ticket_type,
        event:events!inner(id, title, organizer_id),
        user:profiles(id, full_name, avatar_url)
      `)
      .eq('event.organizer_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (ticketSales) {
      ticketSales.forEach((ticket: any) => {
        const buyerName = ticket.user?.full_name || 'Guest User';
        const buyerAvatar = ticket.user?.avatar_url || '';
        const ticketTime = ticket.created_at || new Date().toISOString();
        
        notifications.push({
          id: `sale-${ticket.id}`,
          type: 'event',
          user: { 
            name: buyerName, 
            avatar: buyerAvatar
          },
          content: `bought a ${ticket.ticket_type} ticket for "${ticket.event?.title || 'Event'}"`,
          time: ticketTime,
          read: new Date(ticketTime).getTime() <= lastReadTime,
          created_at: ticketTime
        });
      });
    }
  } catch (err) {
  }

  // 4. Fetch Event Reminders (Upcoming events for ticket holders)
  const { data: upcomingTickets } = await supabase
    .from('tickets')
    .select(`
      id,
      events!inner(id, title, date, time, image_url)
    `)
    .eq('user_id', userId)
    .eq('status', 'valid')
    .gte('events.date', new Date().toISOString().split('T')[0]); // Events in future or today

  if (upcomingTickets) {
    const now = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(now.getDate() + 2);

    upcomingTickets.forEach((ticket: any) => {
      if (ticket.events) {
        const eventDate = new Date(`${ticket.events.date}T${ticket.events.time || '00:00:00'}`);
        
        // If event is within next 48 hours
        if (eventDate > now && eventDate <= twoDaysFromNow) {
           notifications.push({
            id: `reminder-${ticket.events.id}`,
            type: 'event',
            user: {
              name: 'Eventz Reminder',
              avatar: ticket.events.image_url || '/logo.png' // Fallback to logo or event image
            },
            content: `Event "${ticket.events.title}" is coming up on ${new Date(ticket.events.date).toLocaleDateString()}`,
            time: new Date().toISOString(), // Current time as notification time
            read: false, // Always show as new for urgency (or logic to check if seen)
            created_at: new Date().toISOString()
          });
        }
      }
    });
  }

  // Sort by date (newest first) to ensure a correct timeline
  notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return notifications;
};

export const markNotificationsAsRead = async (userId: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ last_notification_read_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
};


// --- SEARCH ---

export const getTrending = async () => {
  // Parallel fetch for trending events and profiles
  const [eventsRes, profilesRes] = await Promise.all([
    // Trending Events (by views)
    supabase
      .from('events')
      .select('id, title, category, views')
      .eq('status', 'published')
      .order('views', { ascending: false })
      .limit(5),
    
    // Verified Profiles (as proxy for trending/popular people)
    supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, is_organizer')
      .eq('verified', true)
      .limit(5)
  ]);

  return {
    events: eventsRes.data || [],
    people: profilesRes.data || []
  };
};
