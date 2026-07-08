import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { supabase } from '../utils/supabase/client';
import { getFollowedUserIds, getNotifications, getPosts, getProfile, type Notification } from '../utils/supabase/api';
import { mapPostsToViewModel } from '../utils/postMapper';
import type { Post } from '../types';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';

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

export function useFeedData(initialCurrentUser?: any) {
  const [currentUser, setCurrentUser] = useState<any>(initialCurrentUser || null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const initialUserLoaded = useRef(false);

  useEffect(() => {
    setCurrentUser(initialCurrentUser || null);
  }, [initialCurrentUser]);

  const postsQuery = useInfiniteQuery({
    queryKey: queryKeys.feed.firstPage(currentUser?.id),
    queryFn: async ({ pageParam }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        if (!initialUserLoaded.current) {
          initialUserLoaded.current = true;
          try {
            const profile = await getProfile(user.id);
            setCurrentUserProfile(profile || null);
          } catch (error) {
            console.warn('Failed to load profile for feed:', error);
            setCurrentUserProfile(null);
          }
          try {
            const following = await getFollowedUserIds(user.id);
            setFollowingIds(new Set(following));
          } catch (e) {
            console.error('Error loading following:', e);
          }
        }
      }
      const fresh = await getPosts({ currentUserId: user?.id, limit: FEED_PAGE_SIZE, offset: pageParam as number });
      return {
        posts: fresh && fresh.length > 0 ? mapPostsToViewModel(fresh) : [],
        count: fresh?.length ?? 0,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.count < FEED_PAGE_SIZE) return undefined;
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

  const handleLoadMore = useCallback(() => {
    if (!postsQuery.isFetchingNextPage && postsQuery.hasNextPage) {
      postsQuery.fetchNextPage();
    }
  }, [postsQuery]);

  const feedQueryKey = queryKeys.feed.firstPage(currentUser?.id);
  const setPosts: React.Dispatch<React.SetStateAction<Post[]>> = useCallback((updater) => {
    queryClient.setQueryData(feedQueryKey, (old: unknown) => {
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
  }, [feedQueryKey, queryClient]);

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
      setNotifications(data ?? []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
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
    return () => {
      window.clearInterval(interval);
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
    handleLoadMore,
    refreshNotifications,
    setNotifications,
    setNotificationsLoading,
  };
}
