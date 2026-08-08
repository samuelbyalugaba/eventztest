import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { getFollowedUserIds, getNotifications, getPosts, type Notification } from '../utils/supabase/api';
import { mapPostsToViewModel } from '../utils/postMapper';
import type { Post } from '../types';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { useInView } from './useInView';
import { useAuth } from '../contexts/AuthContext';

const FEED_PAGE_SIZE = 20;

export const removePostFromFeedCache = (postId: number) => {
  queryClient.setQueriesData(
    { queryKey: queryKeys.feed.root },
    (cached: unknown) => {
      if (!cached || typeof cached !== 'object') return cached;
      const data = cached as Record<string, unknown>;
      if (Array.isArray(data.pages)) {
        return {
          ...data,
          pages: (data.pages as Array<{ posts: Post[] }>).map((page) => ({
            ...page,
            posts: page.posts.filter((post: Post) => post.id !== postId),
          })),
        };
      }
      if (Array.isArray(data.posts)) {
        return { ...data, posts: (data.posts as Post[]).filter((post) => post.id !== postId) };
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
      if (!cached || typeof cached !== 'object') return cached;
      const data = cached as Record<string, unknown>;
      if (Array.isArray(data.pages)) {
        return {
          ...data,
          pages: (data.pages as Array<{ posts: Post[] }>).map((page) => ({
            ...page,
            posts: page.posts.filter(isDifferentUser),
          })),
        };
      }
      if (Array.isArray(data.posts)) {
        return { ...data, posts: (data.posts as Post[]).filter(isDifferentUser) };
      }
      return cached;
    },
  );
};

export function useFeedData(isPaused = false) {
  const { user: authUser, profile: authProfile } = useAuth();
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const followingLoaded = useRef(false);
  const cacheCleared = useRef(false);

  useEffect(() => {
    if (!cacheCleared.current) {
      cacheCleared.current = true;
      queryClient.removeQueries({ queryKey: ['feed'] });
    }
  }, []);

  useEffect(() => {
    if (!authUser?.id || followingLoaded.current) return;
    followingLoaded.current = true;
    getFollowedUserIds(authUser.id)
      .then((following) => setFollowingIds(new Set(following)))
      .catch(() => {});
  }, [authUser?.id]);

  const postsQuery = useInfiniteQuery({
    queryKey: queryKeys.feed.firstPage(authUser?.id),
    queryFn: async ({ pageParam }) => {
      try {
        const fresh = await getPosts({ currentUserId: authUser?.id, limit: FEED_PAGE_SIZE, offset: pageParam as number });
        return {
          posts: fresh && fresh.length > 0 ? mapPostsToViewModel(fresh) : [],
          count: fresh?.length ?? 0,
        };
      } catch (error) {
        console.error('Feed query error:', error);
        return { posts: [], count: 0 };
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (!lastPage || lastPage.count < FEED_PAGE_SIZE || !Array.isArray(allPages)) return undefined;
      return (lastPageParam as number) + FEED_PAGE_SIZE;
    },
    staleTime: 5 * 60 * 1000,
    select: (data) => {
      const allPosts = data.pages.flatMap((page) => page.posts);
      const seen = new Set<number>();
      return allPosts.filter((post) => {
        if (seen.has(post.id)) return false;
        seen.add(post.id);
        return true;
      });
    },
  });

  const isLoading = postsQuery.isPending && postsQuery.data === undefined;
  const posts = postsQuery.data ?? [];
  const hasMore = postsQuery.hasNextPage ?? false;
  const isLoadingMore = postsQuery.isFetchingNextPage;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const sentinelInView = useInView(sentinelRef);

  const handleLoadMore = useCallback(() => {
    if (!postsQuery.isFetchingNextPage && postsQuery.hasNextPage) {
      postsQuery.fetchNextPage();
    }
  }, [postsQuery]);

  useEffect(() => {
    if (sentinelInView && hasMore && !isLoadingMore) {
      handleLoadMore();
    }
  }, [sentinelInView, hasMore, isLoadingMore, handleLoadMore]);

  const setPosts: React.Dispatch<React.SetStateAction<Post[]>> = useCallback((updater) => {
    const key = queryKeys.feed.firstPage(authUser?.id);
    queryClient.setQueryData(key, (old: unknown) => {
      if (!old || typeof old !== 'object') return old;
      const data = old as { pages: Array<{ posts: Post[]; count: number }>; pageParams: unknown[] };
      if (!Array.isArray(data.pages)) return old;
      const currentFlat = data.pages.flatMap((page) => page.posts);
      const nextFlat = typeof updater === 'function'
        ? (updater as (prev: Post[]) => Post[])(currentFlat)
        : updater;
      let cursor = 0;
      return {
        ...data,
        pages: data.pages.map((page) => {
          const slice = nextFlat.slice(cursor, cursor + page.posts.length);
          cursor += page.posts.length;
          return { ...page, posts: slice };
        }),
      };
    });
  }, [authUser?.id, queryClient]);

  const refreshNotifications = useCallback(async (options?: { silent?: boolean }) => {
    if (!authUser?.id) {
      setNotifications([]);
      return;
    }

    if (!options?.silent) setNotificationsLoading(true);
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(authUser.id) });
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.notifications.list(authUser.id),
        staleTime: 60_000,
        queryFn: () => getNotifications(authUser.id),
      });
      setNotifications(data ?? []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      if (!options?.silent) setNotificationsLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser?.id || isPaused) return;

    void refreshNotifications();
    const interval = window.setInterval(() => {
      void refreshNotifications({ silent: true });
    }, 60000);
    return () => {
      window.clearInterval(interval);
    };
  }, [authUser?.id, refreshNotifications, isPaused]);

  return {
    posts,
    setPosts,
    hasMore,
    isLoadingMore,
    currentUser: authUser,
    isLoading,
    followingIds,
    notifications,
    notificationsLoading,
    currentUserProfile: authProfile,
    handleLoadMore,
    refreshNotifications,
    setNotifications,
    setNotificationsLoading,
    sentinelRef,
  };
}
