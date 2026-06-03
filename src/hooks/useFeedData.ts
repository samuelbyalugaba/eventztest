import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { getFollowedUserIds, getNotifications, getPosts, getProfile, type Notification } from '../utils/supabase/api';
import { mapPostsToViewModel } from '../utils/postMapper';
import type { Post } from '../types';

let feedCacheMemory: { posts: any[]; timestamp: number } | null = null;

const FEED_CACHE_TTL_MS = 5 * 60 * 1000;
const FEED_CACHE_KEY = 'eventz-feed-cache-v1';
const FEED_PAGE_SIZE = 20;

export const removePostFromFeedCache = (postId: number) => {
  feedCacheMemory = feedCacheMemory
    ? { ...feedCacheMemory, posts: feedCacheMemory.posts.filter((post) => post.id !== postId) }
    : null;

  try {
    const cachedRaw = localStorage.getItem(FEED_CACHE_KEY);
    if (!cachedRaw) return;

    const cached = JSON.parse(cachedRaw);
    if (!Array.isArray(cached.posts)) return;

    localStorage.setItem(
      FEED_CACHE_KEY,
      JSON.stringify({
        ...cached,
        posts: cached.posts.filter((post: Post) => post.id !== postId),
        timestamp: Date.now(),
      }),
    );
  } catch {
    localStorage.removeItem(FEED_CACHE_KEY);
  }
};

export const removeUserPostsFromFeedCache = (userId: string) => {
  const isDifferentUser = (post: Post) => String(post.user?.id || post.user_id || '') !== String(userId);

  feedCacheMemory = feedCacheMemory
    ? { ...feedCacheMemory, posts: feedCacheMemory.posts.filter(isDifferentUser) }
    : null;

  try {
    const cachedRaw = localStorage.getItem(FEED_CACHE_KEY);
    if (!cachedRaw) return;

    const cached = JSON.parse(cachedRaw);
    if (!Array.isArray(cached.posts)) return;

    localStorage.setItem(
      FEED_CACHE_KEY,
      JSON.stringify({
        ...cached,
        posts: cached.posts.filter(isDifferentUser),
        timestamp: Date.now(),
      }),
    );
  } catch {
    localStorage.removeItem(FEED_CACHE_KEY);
  }
};

export function useFeedData(initialCurrentUser?: any) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(initialCurrentUser || null);
  const [isLoading, setIsLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const nextOffsetRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    setCurrentUser(initialCurrentUser || null);
  }, [initialCurrentUser]);

  const loadPosts = async (useCacheFirst: boolean) => {
    setIsLoading(true);
    try {
      if (useCacheFirst && feedCacheMemory && (Date.now() - feedCacheMemory.timestamp < FEED_CACHE_TTL_MS)) {
        setPosts(feedCacheMemory.posts as Post[]);
        setIsLoading(false);
      }
      if (useCacheFirst) {
        const cachedRaw = localStorage.getItem(FEED_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.timestamp && Date.now() - cached.timestamp < FEED_CACHE_TTL_MS && Array.isArray(cached.posts)) {
            setPosts(cached.posts);
            setIsLoading(false);
          }
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        try { const profile = await getProfile(user.id); setCurrentUserProfile(profile || null); } catch { setCurrentUserProfile(null); }
        try { const following = await getFollowedUserIds(user.id); setFollowingIds(new Set(following)); } catch (e) { console.error('Error loading following:', e); }
      }

      const fresh = await getPosts({ currentUserId: user?.id, limit: FEED_PAGE_SIZE, offset: 0 });
      const freshCount = fresh?.length ?? 0;
      nextOffsetRef.current = freshCount;
      setHasMore(freshCount === FEED_PAGE_SIZE);
      const mapped = fresh && fresh.length > 0 ? mapPostsToViewModel(fresh) : [];

      setPosts((prev) => {
        if (useCacheFirst && sessionStorage.getItem('feedScrollPos') && prev.length > mapped.length) {
          const merged = [...prev];
          mapped.forEach((post, i) => { merged[i] = post; });
          return merged;
        }
        return mapped;
      });

      const payload = { posts: mapped, timestamp: Date.now() };
      feedCacheMemory = payload;
      localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMoreRef.current || isLoadingMore || !hasMore) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const offset = Math.max(nextOffsetRef.current, posts.length);
      const fresh = await getPosts({ currentUserId: user?.id, limit: FEED_PAGE_SIZE, offset });
      const freshCount = fresh?.length ?? 0;
      nextOffsetRef.current = offset + freshCount;

      if (!fresh || freshCount === 0) {
        setHasMore(false);
        return;
      }

      const mapped = mapPostsToViewModel(fresh);
      const existingIds = new Set(posts.map((p) => p.id));
      const uniqueMapped = mapped.filter((p) => !existingIds.has(p.id));

      if (uniqueMapped.length === 0) {
        setHasMore(false);
        return;
      }

      setPosts((prev) => {
        const latestIds = new Set(prev.map((p) => p.id));
        return [...prev, ...mapped.filter((p) => !latestIds.has(p.id))];
      });
      setHasMore(freshCount === FEED_PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadPosts(true);
    const handlePostsUpdated = (event: Event) => {
      const deletedPostId = (event as CustomEvent<{ deletedPostId?: number }>).detail?.deletedPostId;
      if (typeof deletedPostId === 'number') {
        removePostFromFeedCache(deletedPostId);
        setPosts((prev) => prev.filter((post) => post.id !== deletedPostId));
        setIsLoading(false);
        return;
      }
      void loadPosts(false);
    };
    window.addEventListener('postsUpdated', handlePostsUpdated);
    return () => { window.removeEventListener('postsUpdated', handlePostsUpdated); };
  }, []);

  const refreshNotifications = useCallback(async (options?: { silent?: boolean }) => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }

    if (!options?.silent) setNotificationsLoading(true);
    try {
      const data = await getNotifications(currentUser.id);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (!options?.silent) setNotificationsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;

    void refreshNotifications();
    const interval = window.setInterval(() => {
      void refreshNotifications({ silent: true });
    }, 60000);
    const handleNotificationsUpdated = () => {
      void refreshNotifications({ silent: true });
    };

    window.addEventListener('notificationsUpdated', handleNotificationsUpdated);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdated);
    };
  }, [currentUser?.id, refreshNotifications]);

  return {
    posts,
    setPosts,
    hasMore,
    isLoadingMore,
    currentUser,
    isLoading,
    followingIds,
    notifications,
    notificationsLoading,
    currentUserProfile,
    loadPosts,
    handleLoadMore,
    refreshNotifications,
    setNotifications,
    setNotificationsLoading,
  };
}
