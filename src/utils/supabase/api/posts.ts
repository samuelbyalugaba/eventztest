import { supabase } from './client';
import type { Profile } from './profile';
import type { Event } from './events';
import { getBlockedUserIds } from './moderation';

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

export type PostComment = {
  id: number;
  user_id: string;
  post_id: number;
  text: string;
  created_at: string;
  duration?: string;
  user?: Profile;
};

export const incrementPostView = async (postId: number) => {
  const { error } = await supabase.rpc('increment_post_view', { post_id: postId });

  if (error) {
  }
};

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
  let blockedUserIds = new Set<string>();

  if (options.currentUserId) {
    try {
      blockedUserIds = await getBlockedUserIds(options.currentUserId);

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

  return (posts || [])
    .filter((p: any) => !blockedUserIds.has(p.user_id))
    .map((p: any) => ({
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
  const { data: post } = await supabase
    .from('posts')
    .select('image_urls, video_url')
    .eq('id', postId)
    .maybeSingle();

  const { data: deletedRows, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .select('id');

  if (error) throw error;
  if (!deletedRows || deletedRows.length === 0) {
    throw new Error('Post could not be deleted. Please refresh and try again.');
  }

  const { deleteFile } = await import('./storage');
  if (post?.image_urls && Array.isArray(post.image_urls)) {
    await Promise.all(post.image_urls.map(url => deleteFile('posts', url)));
  }
  if (post?.video_url) {
    await deleteFile('posts', post.video_url);
  }

  try {
    localStorage.removeItem('eventz-feed-cache-v1');
    sessionStorage.removeItem('feedScrollPos');
    sessionStorage.removeItem('feedLastPostId');
  } catch (error) {
    console.error('Failed to clear feed cache:', error);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('postsUpdated', { detail: { deletedPostId: postId } }));
  }
};

export const createPost = async (post: Omit<ApiPost, 'id' | 'created_at' | 'user' | 'event' | 'likes_count' | 'comments_count' | 'is_liked'>) => {
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
      content: post.content?.trim()
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
    const [{ sendSocialPushNotification }, { sendSocialEmailNotification }] = await Promise.all([
      import('../../pushNotifications'),
      import('../../email'),
    ]);
    void sendSocialPushNotification('like', { postId });
    void sendSocialEmailNotification('like', { postId });
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
  const { data: { user } } = await supabase.auth.getUser();
  let blockedUserIds = new Set<string>();
  if (user) {
    try {
      blockedUserIds = await getBlockedUserIds(user.id);
    } catch (error) {
      console.error('Failed to get blocked user IDs for comments:', error);
      blockedUserIds = new Set<string>();
    }
  }

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
  return (data || []).filter((comment: any) => !blockedUserIds.has(comment.user_id));
};

export const createPostComment = async (postId: number, userId: string, text: string, parentId?: number) => {
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

  const [{ sendSocialPushNotification }, { sendSocialEmailNotification }] = await Promise.all([
    import('../../pushNotifications'),
    import('../../email'),
  ]);
  void sendSocialPushNotification('comment', { postId, commentId: data.id });
  void sendSocialEmailNotification('comment', { postId, commentId: data.id });

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
