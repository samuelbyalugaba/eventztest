import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  getProfile,
  getUserTickets,
  getSavedEvents,
  getSavedPosts,
  getFollowersCount,
  getFollowingCount,
  getProfilePostsGrid,
  subscribeToSavedEvents,
  subscribeToSavedPosts,
  getOrganizerStats,
  getOrganizerEvents,
  checkIsFollowing,
  getProfileStreamedVideos,
} from '../utils/supabase/api';
import type { Ticket, Event as AppEvent } from '../utils/supabase/api';
import { useProfileStore } from '../store/profileStore';
import { useAuth } from '../contexts/AuthContext';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';

type SavedEvent = AppEvent & { isSaved: boolean; hasReminder: boolean };

const POSTS_PAGE_SIZE = 18;
const PROFILE_CACHE_TTL_MS = 60_000;

export function useProfileData(userId?: string, activeTab?: string) {
  const { user: authUser } = useAuth();
  const cachedProfile = useProfileStore((s) => s.profile);
  const cachedOrgStats = useProfileStore((s) => s.organizerStats);
  const cachedFollowStats = useProfileStore((s) => s.followStats);
  const isOwnProfileCheck = !userId;

  const [currentUser, setCurrentUser] = useState<any>(authUser ?? null);

  const targetUserId = userId || currentUser?.id;
  const viewerId = authUser?.id || null;
  const isOwnProfile = !userId || (userId === authUser?.id);

  useEffect(() => {
    setCurrentUser(authUser ?? null);
  }, [authUser]);

  /* Profile summary — single query */
  const profileQuery = useQuery({
    queryKey: queryKeys.profile.summary(viewerId, targetUserId || ''),
    queryFn: async () => {
      const profile = await getProfile(targetUserId!);
      const [followers, following, followingFlag, stats] = await Promise.all([
        getFollowersCount(targetUserId!),
        getFollowingCount(targetUserId!),
        authUser && targetUserId !== authUser.id
          ? checkIsFollowing(authUser.id, targetUserId!)
          : Promise.resolve(false),
        profile?.is_organizer ? getOrganizerStats(targetUserId!) : Promise.resolve(null),
      ]);

      const followStats = { followers, following };

      if (profile) {
        useProfileStore.getState().setProfile(profile);
        useProfileStore.getState().setFollowStats(followStats);
        if (stats) useProfileStore.getState().setOrganizerStats(stats);
      }

      return { profile, followStats, isFollowing: !!followingFlag, organizerStats: stats };
    },
    enabled: !!targetUserId,
    staleTime: PROFILE_CACHE_TTL_MS,
    placeholderData: () => {
      if (cachedProfile && targetUserId === cachedProfile.id) {
        return {
          profile: cachedProfile,
          followStats: cachedFollowStats || { followers: 0, following: 0 },
          isFollowing: false,
          organizerStats: cachedOrgStats || null,
        };
      }
      return undefined;
    },
  });

  const isLoading = profileQuery.isPending && !profileQuery.isPlaceholderData;
  const isProfileError = profileQuery.isError;

  const userProfile = profileQuery.data?.profile ?? null;
  const followStats = profileQuery.data?.followStats ?? { followers: 0, following: 0 };
  const isFollowing = profileQuery.data?.isFollowing ?? false;
  const organizerStats = profileQuery.data?.organizerStats ?? null;
  const isOrganizer = !!userProfile?.is_organizer;

  /* Posts grid — infinite query */
  const postsQuery = useInfiniteQuery({
    queryKey: queryKeys.profile.posts(targetUserId || '', 0),
    queryFn: async ({ pageParam }) => {
      const posts = await getProfilePostsGrid({
        authorId: targetUserId!,
        limit: POSTS_PAGE_SIZE,
        offset: pageParam as number,
      });
      return posts || [];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (!lastPage || lastPage.length < POSTS_PAGE_SIZE) return undefined;
      return (lastPageParam as number) + POSTS_PAGE_SIZE;
    },
    enabled: !!targetUserId,
    staleTime: PROFILE_CACHE_TTL_MS,
    select: (data) => data.pages.flat(),
  });

  const userPosts = postsQuery.data ?? [];
  const isLoadingPosts = postsQuery.isPending;
  const hasMorePosts = postsQuery.hasNextPage ?? false;
  const isLoadingMorePosts = postsQuery.isFetchingNextPage;

  const loadMorePosts = useCallback(() => {
    if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
      postsQuery.fetchNextPage();
    }
  }, [postsQuery]);

  /* Tab-specific data via useQuery */

  const organizerEventsQuery = useQuery({
    queryKey: queryKeys.profile.organizerEvents(targetUserId || ''),
    queryFn: () =>
      getOrganizerEvents(targetUserId!).then((events) =>
        events
          ? events.map((e: any) => ({ ...e, coverImage: e.image_url || e.coverImage, price: e.price_range || e.price }))
          : [],
      ),
    enabled: !!targetUserId && isOrganizer,
    staleTime: PROFILE_CACHE_TTL_MS,
  });

  const savedEventsQuery = useQuery({
    queryKey: queryKeys.profile.savedEvents(targetUserId || ''),
    queryFn: () => getSavedEvents(targetUserId!) as unknown as Promise<SavedEvent[]>,
    enabled: !!targetUserId && isOwnProfileCheck && activeTab === 'saved',
    staleTime: PROFILE_CACHE_TTL_MS,
  });

  const savedPostsQuery = useQuery({
    queryKey: queryKeys.profile.savedPosts(targetUserId || ''),
    queryFn: () => getSavedPosts(targetUserId!),
    enabled: !!targetUserId && isOwnProfileCheck && activeTab === 'saved',
    staleTime: PROFILE_CACHE_TTL_MS,
  });

  const ticketsQuery = useQuery({
    queryKey: queryKeys.profile.tickets(targetUserId || ''),
    queryFn: () => getUserTickets(targetUserId!),
    enabled: !!targetUserId && !isOrganizer,
    staleTime: PROFILE_CACHE_TTL_MS,
  });

  const streamedVideosQuery = useQuery({
    queryKey: queryKeys.profile.streamedVideos(targetUserId || ''),
    queryFn: () => getProfileStreamedVideos(targetUserId!),
    enabled: !!targetUserId,
    staleTime: PROFILE_CACHE_TTL_MS,
  });

  const publishedEvents = organizerEventsQuery.data ?? [];
  const isLoadingOrganizerEvents = organizerEventsQuery.isFetching;

  const savedEvents = savedEventsQuery.data ?? [];
  const isLoadingSavedEvents = savedEventsQuery.isPending && savedEventsQuery.fetchStatus !== 'idle';

  const savedPosts = savedPostsQuery.data ?? [];

  const ticketEvents = ticketsQuery.data ?? [];
  const isLoadingTickets = ticketsQuery.isPending && ticketsQuery.fetchStatus !== 'idle';

  const streamedVideos = streamedVideosQuery.data ?? [];
  const isLoadingStreamedVideos = streamedVideosQuery.isPending && streamedVideosQuery.fetchStatus !== 'idle';

  const attendedEvents = useMemo(() => {
    if (!ticketEvents.length) return [];
    const attended = ticketEvents
      .filter((t: Ticket) => {
        if (!t.event?.date) return false;
        const d = new Date(t.event.date);
        return !isNaN(d.getTime()) && d < new Date();
      })
      .map((t: Ticket) => t.event!)
      .filter((e): e is AppEvent => !!e);
    return Array.from(new Map(attended.map((item) => [item.id, item])).values());
  }, [ticketEvents]);

  /* Subscriptions for saved items — real-time invalidations */
  useEffect(() => {
    let savedEventsSub: any = null;
    let savedPostsSub: any = null;

    const setup = async () => {
      if (isOwnProfileCheck && authUser) {
        const refresh = () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.profile.savedEvents(authUser.id) });
          queryClient.invalidateQueries({ queryKey: queryKeys.profile.savedPosts(authUser.id) });
        };
        savedEventsSub = subscribeToSavedEvents(authUser.id, refresh);
        savedPostsSub = subscribeToSavedPosts(authUser.id, refresh);
      }
    };
    void setup();

    return () => {
      savedEventsSub?.unsubscribe?.();
      savedPostsSub?.unsubscribe?.();
    };
  }, [authUser, isOwnProfileCheck]);

  return {
    currentUser,
    userProfile,
    organizerStats,
    publishedEvents,
    savedEvents,
    savedPosts,
    attendedEvents,
    ticketEvents,
    userPosts,
    streamedVideos,
    isLoading,
    isProfileError,
    isLoadingPosts,
    isLoadingMorePosts,
    hasMorePosts,
    isLoadingSavedEvents,
    isLoadingOrganizerEvents,
    isLoadingTickets,
    isLoadingStreamedVideos,
    isFollowing,
    followStats,
    isOwnProfile,
    isOrganizer,
    loadMorePosts,
    refetchProfile: () => profileQuery.refetch(),
  };
}
