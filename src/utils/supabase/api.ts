
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
  organizer_details?: OrganizerProfile;
};

export type OrganizerProfile = {
  id: string;
  organizer_name: string;
  organizer_type: string;
  organizer_avatar_url?: string; // Renamed from avatar_url to prevent confusion
  cover_url?: string;
  bio?: string;
  description?: string;
  location?: string;
  website?: string;
  contact_email?: string;
  phone?: string;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  created_at?: string;
  updated_at?: string;
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

export type Post = {
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
  organizer_profile?: OrganizerProfile;
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
    .single();

  if (error) {
    // If error is PGRST116 (JSON object requested, multiple (or no) rows returned), it means profile doesn't exist
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  // Input Validation
  if (updates.username && updates.username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  
  if (updates.full_name && updates.full_name.length > 50) {
    throw new Error('Name cannot exceed 50 characters');
  }

  if (updates.birthdate) {
    const birthDate = new Date(updates.birthdate);
    const today = new Date();
    if (birthDate > today) {
      throw new Error('Birthdate cannot be in the future');
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ ...updates, id: userId })
    .select()
    .single();

  if (!error) return data;

  const baseFields: Partial<Profile> = {
    username: updates.username,
    full_name: updates.full_name,
    avatar_url: updates.avatar_url,
    bio: updates.bio,
    location: updates.location,
    contact_email: updates.contact_email,
    phone: updates.phone,
    website: updates.website,
    organizer_type: updates.organizer_type,
    social_links: updates.social_links
  };

  const { data: data2, error: error2 } = await supabase
    .from('profiles')
    .upsert({ ...baseFields, id: userId })
    .select()
    .single();

  if (!error2) return data2;

  if (updates.avatar_url) {
    const { data: data3, error: error3 } = await supabase
      .from('profiles')
      .upsert({ id: userId, avatar_url: updates.avatar_url })
      .select()
      .single();
    if (!error3) return data3;
  }

  throw error2 || error;
};

export const getOrganizerProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('organizer_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return { ...data, organizer_avatar_url: data.organizer_avatar_url || data.avatar_url } as OrganizerProfile;
};

export const upsertOrganizerProfile = async (profile: Partial<OrganizerProfile> & { id: string }) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== profile.id) {
    throw new Error('Unauthorized: You can only update your own organizer profile');
  }

  const { data, error } = await supabase
    .from('organizer_profiles')
    .upsert(profile)
    .select()
    .single();

  if (error) throw error;
  
  return data as OrganizerProfile;
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
    console.error('Error fetching organizer stats:', error);
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
    .single();

  if (error && error.code !== 'PGRST116') throw error;
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
      organizer:profiles(*)
    `)
    .eq('status', 'published')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
    throw error;
  }

  // Manually join organizer_profiles to avoid missing FK relationship error
  const organizerIds = [...new Set(data.map((e: any) => e.organizer_id).filter(Boolean))];
  
  if (organizerIds.length > 0) {
    const { data: orgDetails } = await supabase
      .from('organizer_profiles')
      .select('*')
      .in('id', organizerIds);

    if (orgDetails) {
      const orgMap = new Map(orgDetails.map((o: any) => [o.id, o]));
      return data.map((event: any) => ({
        ...event,
        organizer: {
          ...event.organizer,
          organizer_details: orgMap.get(event.organizer_id)
        }
      }));
    }
  }

  return data;
};

export const getOrganizerEvents = async (organizerId: string) => {
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
    console.error('Error fetching organizer events:', error);
    throw error;
  }

  // Fetch organizer details explicitly
  let organizerDetails: any = null;
  try {
    const { data: orgData } = await supabase
      .from('organizer_profiles')
      .select('*')
      .eq('id', organizerId)
      .single();
    organizerDetails = orgData;
  } catch (e) {
    console.warn('Could not fetch organizer_profiles manually:', e);
  }
  
  return data.map((event: any) => ({
    ...event,
    organizer: {
      ...event.organizer,
      organizer_details: organizerDetails
    },
    interested: event.saved_events?.[0]?.count || 0,
    shares: event.posts?.[0]?.count || 0,
    attendees: (event.attendees || 0) + (event.tickets?.[0]?.count || 0)
  }));
};

export const incrementEventView = async (eventId: number) => {
  // RPC (atomic increment)
  const { error } = await supabase.rpc('increment_event_view', { event_id: eventId });

  if (error) {
    console.warn('RPC increment_event_view failed:', error);
  }
};

export const incrementPostView = async (postId: number) => {
  const { error } = await supabase.rpc('increment_post_view', { post_id: postId });

  if (error) {
    console.warn('RPC increment_post_view failed:', error);
  }
};

export const incrementUserMediaView = async (mediaId: number) => {
  const { error } = await supabase.rpc('increment_media_view', { media_id: mediaId });
  
  if (error) {
    console.warn('RPC increment_media_view failed:', error);
  }
};

export const getEventAnalytics = async (eventId: number) => {
  try {
    const { data, error } = await supabase.rpc('get_event_analytics', {
      target_event_id: eventId
    });

    if (error) {
      console.error('Error fetching event analytics (RPC):', error);
      // Return mock data on error to prevent UI crash
      return {
        views: { total: 0, change: 0, trend: 'neutral', daily: [] },
        interested: { total: 0, change: 0, trend: 'neutral' },
        shares: { total: 0, change: 0, trend: 'neutral' },
        ticketsSold: { total: 0, change: 0, trend: 'neutral' },
        revenue: { total: 'TSh 0', change: 0, trend: 'neutral' }
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
    console.warn('Falling back to mock analytics data due to error:', err);
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
    console.error('Error fetching event by id:', error);
    throw error;
  }

  // Fetch organizer details explicitly to ensure we have role-specific data (like avatar)
  if (data.organizer_id) {
    const { data: orgData } = await supabase
      .from('organizer_profiles')
      .select('*')
      .eq('id', data.organizer_id)
      .single();
    
    if (orgData) {
      // Map DB field avatar_url to type field organizer_avatar_url if needed
      // but here we just attach the whole object as organizer_details
      // The client code expects organizer_details to have organizer_avatar_url (which comes from DB avatar_url column currently? 
      // Wait, in migration I am renaming or just mapping?
      // In api.ts I mapped it for getOrganizerProfile.
      // Here I am attaching raw DB response.
      // The raw DB response has 'organizer_avatar_url' column (after migration).
      // So it should be fine.
      data.organizer = {
        ...data.organizer,
        organizer_details: orgData
      };
    }
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
  if (new Date(eventData.date) < new Date(new Date().setHours(0,0,0,0))) {
    throw new Error('Event date cannot be in the past');
  }

  if (eventData.title.length < 3 || eventData.title.length > 100) {
    throw new Error('Title must be between 3 and 100 characters');
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
    console.error('Error creating event:', error);
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
    console.error('Error updating event:', error);
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
    console.error('Error deleting event via RPC:', error);
    // Fallback for older DB versions or if RPC missing (though this will likely fail with FK violation)
    if (error.code === '42883') { // undefined_function
      console.warn('RPC delete_event_complete not found, falling back to manual delete...');
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
      console.error(`Error deleting file from ${bucket}:`, error);
    }
  } catch (err) {
    console.error(`Error in deleteFile for ${bucket}:`, err);
  }
};

export const uploadImage = async (file: File, bucket: 'events' | 'avatars' | 'posts', path?: string) => {
  // Validate file type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, WebP, GIF, MP4, WebM, and MOV are allowed.');
  }

  // Validate file size (100MB limit for videos, 10MB for images)
  const isVideo = file.type.startsWith('video/');
  const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
  
  if (file.size > maxSize) {
    throw new Error(`File size too large. Maximum size is ${isVideo ? '100MB' : '10MB'}.`);
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}_${Date.now()}.${fileExt}`;
  const filePath = path ? `${path}/${fileName}` : fileName;

  const tryUpload = async (targetBucket: 'events' | 'avatars' | 'posts') => {
    const { error: uploadError } = await supabase.storage
      .from(targetBucket)
      .upload(filePath, file, {
        contentType: file.type,
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

export const createTicket = async (ticket: Omit<Ticket, 'id' | 'created_at' | 'event'>) => {
  // Use the secure RPC function to purchase tickets (prevents free ticket glitch)
  const { data, error } = await supabase.rpc('purchase_ticket', {
    p_event_id: ticket.event_id,
    p_ticket_type: ticket.ticket_type,
    p_customer_name: ticket.customer_name,
    p_customer_email: ticket.customer_email,
    p_ticket_number: ticket.ticket_number,
    p_qr_code: ticket.qr_code || null
  });

  if (error) {
    console.error('Error creating ticket:', error);
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

// --- TRANSACTIONS / PAYMENTS ---

export const createTransaction = async (transactionData: {
  user_id: string;
  event_id: number;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  metadata?: any;
}) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transactionData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const initiatePayment = async (params: {
  amount: number;
  accountNumber: string; // e.g., "2557..."
  provider: string; // "Airtel", "Tigo", "Halantel", "Azampesa"
  externalId: string; // Transaction ID
}) => {
  const { data, error } = await supabase.functions.invoke('azampay-payment', {
    body: params,
  });

  if (error) throw error;

  if (data && !data.success) {
    throw new Error(data.error || 'Payment initiation failed');
  }

  return data;
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
    .single();

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
    .single();

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
    console.error('Error fetching posts:', error);
    throw error;
  }

  // Manually fetch organizer profiles for posts made as organizer
  const organizerUserIds = Array.from(new Set(
    posts
      .filter((p: any) => p.posted_as_organizer)
      .map((p: any) => p.user_id)
  ));

  let organizerProfilesMap: Record<string, any> = {};
  
  if (organizerUserIds.length > 0) {
    const { data: orgProfiles } = await supabase
      .from('organizer_profiles')
      .select('*')
      .in('id', organizerUserIds);
      
    if (orgProfiles) {
      orgProfiles.forEach((op: any) => {
        organizerProfilesMap[op.id] = op;
      });
    }
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
      console.warn('Error fetching user interactions:', e);
    }
  }

  return posts.map((p: any) => ({
    ...p,
    organizer_profile: organizerProfilesMap[p.user_id] || null,
    likes_count: p.likes?.[0]?.count || 0,
    comments_count: p.comments?.[0]?.count || 0,
    is_liked: likedPostIds.has(p.id),
    is_saved: savedPostIds.has(p.id)
  }));
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

export const createPost = async (post: Omit<Post, 'id' | 'created_at' | 'user' | 'event' | 'likes_count' | 'comments_count' | 'is_liked'>) => {
  // Input Validation
  if (!post.content?.trim() && (!post.image_urls || post.image_urls.length === 0)) {
    throw new Error('Post must contain text or an image');
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
      user:profiles(*)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

export const createPostComment = async (postId: number, userId: string, text: string) => {
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
    .insert({ post_id: postId, user_id: userId, text: trimmedText })
    .select(`
      *,
      user:profiles(*)
    `)
    .single();

  if (error) throw error;

  return data;
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
      liveViewers: isLive ? 0 : undefined,
      startedAt: isLive ? new Date().toISOString() : undefined,
    }
  };

  // If going live, ensure we have stream keys (mock or real)
  if (isLive) {
    updates.streaming.stream_key = `live_${eventId}_${Math.random().toString(36).substr(2, 9)}`;
    updates.streaming.ingest_url = "rtmp://global-live.mux.com:5222/app";
    updates.streaming.playback_url = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"; // Demo HLS stream
    updates.streaming.quality = 'HD';
  }

  // We need to merge with existing streaming data, not overwrite
  // But Supabase simple update overwrites the column. 
  // Ideally we fetch first, but for now let's assume we want to set these specific fields.
  // A better approach with JSONB is to use postgres jsonb_set but supabase js client 
  // usually requires fetching or sending the whole object.
  // Let's fetch first to be safe.
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
  return data;
};

export const generateStreamKeys = async (eventId: number) => {
  // In a real app, this would call a backend function (Edge Function) to talk to Mux/AWS
  const streamKey = `sk_${Math.random().toString(36).substr(2, 12)}`;
  const ingestUrl = "rtmp://global-live.mux.com:5222/app";
  const playbackUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"; // Demo stream for testing

  const updates = {
    stream_key: streamKey,
    ingest_url: ingestUrl,
    playback_url: playbackUrl
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
      .single();

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
    .single();

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
    .single();
    
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
      // Use profile if available, otherwise fallback to "Guest"
      const buyerName = ticket.user?.full_name || 'Guest User';
      const buyerAvatar = ticket.user?.avatar_url || '';
      
      notifications.push({
        id: `sale-${ticket.id}`,
        type: 'event', // reusing 'event' type for sales
        user: { 
          name: buyerName, 
          avatar: buyerAvatar
        },
        content: `bought a ${ticket.ticket_type} ticket for "${ticket.event?.title || 'Event'}"`,
        time: ticket.created_at,
        read: new Date(ticket.created_at).getTime() <= lastReadTime,
        created_at: ticket.created_at
      });
    });
  }

  // 4. Fetch Event Reminders (Upcoming events for ticket holders)
  const { data: upcomingTickets } = await supabase
    .from('tickets')
    .select(`
      id,
      event:events!inner(id, title, date, time, image_url)
    `)
    .eq('user_id', userId)
    .eq('status', 'valid')
    .gte('event.date', new Date().toISOString().split('T')[0]); // Events in future or today

  if (upcomingTickets) {
    const now = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(now.getDate() + 2);

    upcomingTickets.forEach((ticket: any) => {
      if (ticket.event) {
        const eventDate = new Date(`${ticket.event.date}T${ticket.event.time || '00:00:00'}`);
        
        // If event is within next 48 hours
        if (eventDate > now && eventDate <= twoDaysFromNow) {
           notifications.push({
            id: `reminder-${ticket.event.id}`,
            type: 'event',
            user: {
              name: 'Eventz Reminder',
              avatar: ticket.event.image_url || '/logo.png' // Fallback to logo or event image
            },
            content: `Event "${ticket.event.title}" is coming up on ${new Date(ticket.event.date).toLocaleDateString()}`,
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

