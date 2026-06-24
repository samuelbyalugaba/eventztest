import { supabase } from './client';
import type { Profile } from './profile';

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
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
    const [{ sendSocialPushNotification }, { sendSocialEmailNotification }] = await Promise.all([
      import('../../pushNotifications'),
      import('../../email'),
    ]);
    void sendSocialPushNotification('follow', { targetUserId: followingId });
    void sendSocialEmailNotification('follow', { targetUserId: followingId });
    return true;
  }
};

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
  const { data: following, error: followingError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (followingError) throw followingError;

  const followingIds = following.map(f => f.following_id);

  if (followingIds.length === 0) return [];

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
