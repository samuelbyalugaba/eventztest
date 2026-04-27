import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { getFollowedUserIds, getNotifications, getPosts, getProfile, type Notification } from '../utils/supabase/api';
import { mapPostsToViewModel } from '../utils/postMapper';
import type { Post } from '../types';

let feedCacheMemory: { posts: any[]; timestamp: number } | null = null;

const FEED_CACHE_TTL_MS = 5 * 60 * 1000;
const FEED_CACHE_KEY = 'eventz-feed-cache-v1';

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

      const fresh = await getPosts({ currentUserId: user?.id, limit: 20, offset: 0 });
      setHasMore(!fresh || fresh.length >= 20);
      const mapped = fresh && fresh.length > 0 ? mapPostsToViewModel(fresh) : [];

      setPosts((prev) => {
        if (sessionStorage.getItem('feedScrollPos') && prev.length > mapped.length) {
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
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fresh = await getPosts({ currentUserId: user?.id, limit: 20, offset: posts.length });
      if (!fresh || fresh.length < 20) setHasMore(false);
      if (fresh && fresh.length > 0) {
        const mapped = mapPostsToViewModel(fresh);
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          return [...prev, ...mapped.filter((p) => !existingIds.has(p.id))];
        });
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadPosts(true);
    const handlePostsUpdated = () => { void loadPosts(false); };
    window.addEventListener('postsUpdated', handlePostsUpdated);
    return () => { window.removeEventListener('postsUpdated', handlePostsUpdated); };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const fetchNotifications = async () => {
      setNotificationsLoading(true);
      try {
        const data = await getNotifications(currentUser.id);
        setNotifications(data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setNotificationsLoading(false);
      }
    };
    void fetchNotifications();
  }, [currentUser]);

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
    setNotifications,
    setNotificationsLoading,
  };
}
