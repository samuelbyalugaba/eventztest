import { supabase } from './client';
import type { Event } from './events';
import type { ApiPost } from './posts';

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
  
  return data.map(item => ({
    ...item.event,
    isSaved: true,
    hasReminder: item.is_reminder
  }));
};

export const getSavedPosts = async (userId: string) => {
  const { data, error } = await supabase
    .from('saved_posts')
    .select(`
      created_at,
      post:posts (
        *,
        user:profiles(*),
        event:events(*),
        likes:post_likes(count),
        comments:post_comments(count)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const posts = (data || [])
    .map((item: any) => item.post)
    .filter(Boolean);
  const postIds = posts.map((post: any) => post.id);
  const likedPostIds = new Set<number>();

  if (postIds.length > 0) {
    const { data: likes, error: likesError } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds);

    if (likesError) throw likesError;
    likes?.forEach((like) => likedPostIds.add(like.post_id));
  }

  return posts.map((post: any) => ({
    ...post,
    likes_count: post.likes?.[0]?.count || 0,
    comments_count: post.comments?.[0]?.count || 0,
    is_liked: likedPostIds.has(post.id),
    is_saved: true,
  })) as ApiPost[];
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

export const subscribeToSavedPosts = (userId: string, callback: () => void) => {
  return supabase
    .channel(`saved_posts:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'saved_posts',
        filter: `user_id=eq.${userId}`
      },
      () => {
        callback();
      }
    )
    .subscribe();
};
