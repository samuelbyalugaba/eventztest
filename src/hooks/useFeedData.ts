import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { getFollowedUserIds, getNotifications, getPosts, getProfile, type Notification } from '../utils/supabase/api';
import { mapPostsToViewModel } from '../utils/postMapper';
import type { Post } from '../types';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';

const FEED_CACHE_TTL_MS = 5 * 60 * 1000;
const FEED_PAGE_SIZE = 20;

export const removePostFromFeedCache = (postId: number) => {
  queryClient.setQueriesData(
    { queryKey: queryKeys.feed.root },
    (cached: unknown) => {
      if (Array.isArray(cached)) return cached.filter((post: Post) => post.id !== postId);
      if (cached && typeof cached === 'object' && Array.isArray((cached as { posts?: Post[] }).posts)) {
        return {
          ...cached,
          posts: (cached as { posts: Post[] }).posts.filter((post) => post.id !== postId),
        };
      }
      return cached;
    },
  );
};

export const removeUserPostsFromFeedCache = (userId: string) => {
  const isDifferentUser = (post: Post) => String(post.user?.id || post.user_id || '') !== String(userId);
  queryClient.setQueriesData(
    { queryKey: queryKeys.feed.root },
    (cached: unknown) => {
      if (Array.isArray(cached)) return cached.filter(isDifferentUser);
      if (cached && typeof cached === 'object' && Array.isArray((cached as { posts?: Post[] }).posts)) {
        return {
          ...cached,
          posts: (cached as { posts: Post[] }).posts.filter(isDifferentUser),
        };
      }
      return cached;
    },
  );
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
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        try { const profile = await getProfile(user.id); setCurrentUserProfile(profile || null); } catch { setCurrentUserProfile(null); }
        try { const following = await getFollowedUserIds(user.id); setFollowingIds(new Set(following)); } catch (e) { console.error('Error loading following:', e); }
      }

      const firstPageKey = queryKeys.feed.firstPage(user?.id);
      const cachedPage = useCacheFirst
        ? queryClient.getQueryData<{ posts: Post[]; count: number }>(firstPageKey)
        : undefined;

      if (cachedPage) {
        nextOffsetRef.current = cachedPage.count;
        setHasMore(cachedPage.count === FEED_PAGE_SIZE);
        setPosts(cachedPage.posts);
        setIsLoading(false);
      }

      if (!useCacheFirst) {
        await queryClient.invalidateQueries({ queryKey: firstPageKey });
      }

      const page = await queryClient.fetchQuery({
        queryKey: firstPageKey,
        staleTime: FEED_CACHE_TTL_MS,
        queryFn: async () => {
          const fresh = await getPosts({ currentUserId: user?.id, limit: FEED_PAGE_SIZE, offset: 0 });
          return {
            posts: fresh && fresh.length > 0 ? mapPostsToViewModel(fresh) : [],
            count: fresh?.length ?? 0,
          };
        },
      });

      const freshCount = page.count;
      nextOffsetRef.current = freshCount;
      setHasMore(freshCount === FEED_PAGE_SIZE);

      setPosts((prev) => {
        if (useCacheFirst && sessionStorage.getItem('feedScrollPos') && prev.length > page.posts.length) {
          const merged = [...prev];
          page.posts.forEach((post, i) => { merged[i] = post; });
          return merged;
        }
        return page.posts;
      });
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
      const fresh = await queryClient.fetchQuery({
        queryKey: queryKeys.feed.page(user?.id, offset),
        staleTime: FEED_CACHE_TTL_MS,
        queryFn: () => getPosts({ currentUserId: user?.id, limit: FEED_PAGE_SIZE, offset }),
      });
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
    const handleProfileUpdated = () => {
      void loadPosts(false);
    };
    window.addEventListener('postsUpdated', handlePostsUpdated);
    window.addEventListener('profileUpdated', handleProfileUpdated);
    return () => {
      window.removeEventListener('postsUpdated', handlePostsUpdated);
      window.removeEventListener('profileUpdated', handleProfileUpdated);
    };
  }, []);

  const refreshNotifications = useCallback(async (options?: { silent?: boolean }) => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }

    if (!options?.silent) setNotificationsLoading(true);
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(currentUser.id) });
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.notifications.list(currentUser.id),
        staleTime: 60_000,
        queryFn: () => getNotifications(currentUser.id),
      });
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
