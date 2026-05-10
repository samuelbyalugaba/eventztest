import { useEffect, useRef, useState } from 'react';

import { getProfile, getUserTickets, getSavedEvents, getFollowersCount, getFollowingCount, getProfilePostsGrid, subscribeToSavedEvents, getOrganizerStats, getOrganizerEvents, checkIsFollowing } from '../utils/supabase/api';
import type { ApiPost, Profile as UserProfile, Ticket, Event as AppEvent } from '../utils/supabase/api';
import { useProfileStore } from '../store/profileStore';
import { useAuth } from '../contexts/AuthContext';

type SavedEvent = AppEvent & { isSaved: boolean; hasReminder: boolean };

export function useProfileData(userId?: string, activeTab?: string) {
  const { user: authUser } = useAuth();
  const cachedProfile = useProfileStore((s) => s.profile);
  const cachedOrgStats = useProfileStore((s) => s.organizerStats);
  const cachedFollowStats = useProfileStore((s) => s.followStats);
  const isOwnProfileCheck = !userId;

  const [currentUser, setCurrentUser] = useState<any>(authUser ?? null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(isOwnProfileCheck && cachedProfile ? cachedProfile : null);
  const [organizerStats, setOrganizerStats] = useState<any>(isOwnProfileCheck && cachedOrgStats ? cachedOrgStats : null);
  const [publishedEvents, setPublishedEvents] = useState<any[]>([]);
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [attendedEvents, setAttendedEvents] = useState<AppEvent[]>([]);
  const [ticketEvents, setTicketEvents] = useState<Ticket[]>([]);
  const [userPosts, setUserPosts] = useState<ApiPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [postsOffset, setPostsOffset] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [isLoadingSavedEvents, setIsLoadingSavedEvents] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isLoadingOrganizerEvents, setIsLoadingOrganizerEvents] = useState(false);
  const [followStats, setFollowStats] = useState(isOwnProfileCheck && cachedFollowStats ? cachedFollowStats : { followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);

  const loadSeqRef = useRef(0);
  const lastLoadedProfileIdRef = useRef<string | null>(null);
  const savedEventsLoadedRef = useRef(false);
  const ticketsLoadedRef = useRef(false);
  const organizerEventsLoadedRef = useRef(false);
  const savedEventsSubscriptionRef = useRef<any>(null);

  const isOwnProfile = !userId || (currentUser && userId === currentUser.id);
  const isOrganizer = userProfile?.is_organizer || false;
  const POSTS_PAGE_SIZE = 18;
  const PROFILE_CACHE_TTL_MS = 60_000;
  const PROFILE_SCROLL_KEY = 'eventz_profile_scroll';
  const PROFILE_POST_ID_KEY = 'eventz_profile_post_id';

  const loadData = async () => {
    const seq = ++loadSeqRef.current;
    try {
      setIsLoading(true);
      setIsLoadingPosts(true);
      setIsLoadingMorePosts(false);
      setPostsOffset(0);
      setHasMorePosts(false);

      const user = authUser;
      if (seq !== loadSeqRef.current) return;

      if (user) setCurrentUser(user);
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      const viewerId = user?.id || null;
      const cacheKey = viewerId ? `eventz_profile_cache_${viewerId}_${targetUserId}` : `eventz_profile_cache_${targetUserId}`;
      let cachedData: any = null;

      try {
        const cachedRaw = sessionStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached?.ts && Date.now() - cached.ts < PROFILE_CACHE_TTL_MS) {
            cachedData = cached;
          }
        }
      } catch {}

      if (lastLoadedProfileIdRef.current !== targetUserId) {
        setUserProfile(cachedData?.profile ?? null);
        setFollowStats(cachedData?.followStats ?? { followers: 0, following: 0 });
        setIsFollowing(typeof cachedData?.isFollowing === 'boolean' ? cachedData.isFollowing : false);
        setOrganizerStats(cachedData?.organizerStats ?? null);
        setPublishedEvents([]);
        setSavedEvents([]);
        setTicketEvents([]);
        setAttendedEvents([]);
        setUserPosts(Array.isArray(cachedData?.posts) ? cachedData.posts : []);
        savedEventsLoadedRef.current = false;
        ticketsLoadedRef.current = false;
        organizerEventsLoadedRef.current = false;
        lastLoadedProfileIdRef.current = targetUserId;
      }

      if (cachedData) {
        if (Array.isArray(cachedData.posts)) {
          setPostsOffset(cachedData.posts.length);
          setHasMorePosts(cachedData.posts.length === POSTS_PAGE_SIZE);
          setIsLoadingPosts(false);
        }
        setIsLoading(false);
      }

      const profile = await getProfile(targetUserId);
      if (seq !== loadSeqRef.current) return;
      if (profile) setUserProfile(profile);

      const [followers, following, followingFlag, stats] = await Promise.all([
        getFollowersCount(targetUserId),
        getFollowingCount(targetUserId),
        user && targetUserId !== user.id ? checkIsFollowing(user.id, targetUserId) : Promise.resolve(false),
        profile?.is_organizer ? getOrganizerStats(targetUserId) : Promise.resolve(null),
      ]);

      if (seq !== loadSeqRef.current) return;

      if (stats) {
        setOrganizerStats(stats);
        if (isOwnProfile) useProfileStore.getState().setOrganizerStats(stats);
      }
      const newFollowStats = { followers, following };
      setFollowStats(newFollowStats);
      if (isOwnProfile) useProfileStore.getState().setFollowStats(newFollowStats);
      setIsFollowing(!!followingFlag);
      setIsLoading(false);

      const posts = await getProfilePostsGrid({ authorId: targetUserId, limit: POSTS_PAGE_SIZE, offset: 0 });
      if (seq !== loadSeqRef.current) return;
      setUserPosts(posts || []);
      setPostsOffset((posts || []).length);
      setHasMorePosts((posts || []).length === POSTS_PAGE_SIZE);
      setIsLoadingPosts(false);

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          ts: Date.now(),
          profile,
          followStats: { followers, following },
          isFollowing: !!followingFlag,
          organizerStats: stats,
          posts: posts || []
        }));
      } catch {}
    } catch {
      setIsLoading(false);
      setIsLoadingPosts(false);
    } finally {
      if (seq === loadSeqRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUser(authUser ?? null);
  }, [authUser]);

  const loadMorePosts = async () => {
    if (isLoadingPosts || isLoadingMorePosts || !hasMorePosts) return;
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;
    try {
      setIsLoadingMorePosts(true);
      const next = await getProfilePostsGrid({ authorId: targetUserId, limit: POSTS_PAGE_SIZE, offset: postsOffset });
      const nextPosts = next || [];
      setUserPosts((prev) => [...prev, ...nextPosts]);
      setPostsOffset((prev) => prev + nextPosts.length);
      setHasMorePosts(nextPosts.length === POSTS_PAGE_SIZE);
    } finally {
      setIsLoadingMorePosts(false);
    }
  };

  const loadOrganizerEventsIfNeeded = async () => {
    if (!userProfile?.is_organizer || isLoadingOrganizerEvents || organizerEventsLoadedRef.current) return;
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;
    try {
      setIsLoadingOrganizerEvents(true);
      const events = await getOrganizerEvents(targetUserId);
      if (events) {
        const mapEvent = (e: any) => ({ ...e, coverImage: e.image_url || e.coverImage, price: e.price_range || e.price });
        setPublishedEvents(events.map(mapEvent));
      }
      organizerEventsLoadedRef.current = true;
    } finally {
      setIsLoadingOrganizerEvents(false);
    }
  };

  const loadSavedEventsIfNeeded = async () => {
    if (!isOwnProfile || isLoadingSavedEvents || savedEventsLoadedRef.current) return;
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;
    try {
      setIsLoadingSavedEvents(true);
      const saved = await getSavedEvents(targetUserId);
      if (saved) setSavedEvents(saved as unknown as SavedEvent[]);
      savedEventsLoadedRef.current = true;
    } finally {
      setIsLoadingSavedEvents(false);
    }
  };

  const loadTicketsIfNeeded = async () => {
    if (!isOwnProfile || isOrganizer || isLoadingTickets || ticketsLoadedRef.current) return;
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;
    try {
      setIsLoadingTickets(true);
      const tickets = await getUserTickets(targetUserId);
      if (tickets) {
        setTicketEvents(tickets);
        const attended = tickets
          .filter((t) => {
            if (!t.event?.date) return false;
            const d = new Date(t.event.date);
            return !isNaN(d.getTime()) && d < new Date();
          })
          .map((t) => t.event!)
          .filter((e) => !!e);
        setAttendedEvents(Array.from(new Map(attended.map((item) => [item.id, item])).values()));
      }
      ticketsLoadedRef.current = true;
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    const handleProfileUpdated = () => { void loadData(); };
    window.addEventListener('profileUpdated', handleProfileUpdated as EventListener);
    return () => { window.removeEventListener('profileUpdated', handleProfileUpdated as EventListener); };
  }, [userId, isOwnProfile, authUser?.id]);

  useEffect(() => {
    if (activeTab === 'upcoming') void loadOrganizerEventsIfNeeded();
  }, [activeTab, userProfile?.is_organizer, currentUser?.id, userId]);

  useEffect(() => {
    if (activeTab === 'saved') void loadSavedEventsIfNeeded();
  }, [activeTab, isOwnProfile, currentUser?.id, userId]);

  useEffect(() => {
    if (activeTab === 'tickets') void loadTicketsIfNeeded();
  }, [activeTab, isOwnProfile, isOrganizer, currentUser?.id, userId]);

  useEffect(() => {
    void loadTicketsIfNeeded();
  }, [isOwnProfile, isOrganizer, currentUser?.id, userId]);

  useEffect(() => {
    if (isLoading || userPosts.length === 0) return;
    const savedScroll = sessionStorage.getItem(PROFILE_SCROLL_KEY);
    const savedPostId = sessionStorage.getItem(PROFILE_POST_ID_KEY);
    if (!savedScroll && !savedPostId) return;
    const restore = () => {
      if (savedPostId) {
        const el = document.getElementById(`profile-post-${savedPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sessionStorage.removeItem(PROFILE_SCROLL_KEY);
          sessionStorage.removeItem(PROFILE_POST_ID_KEY);
          return;
        }
      }
      const scrollY = parseInt(savedScroll || '0', 10);
      if (!isNaN(scrollY) && scrollY >= 0) window.scrollTo({ top: scrollY, behavior: 'smooth' });
      sessionStorage.removeItem(PROFILE_SCROLL_KEY);
      sessionStorage.removeItem(PROFILE_POST_ID_KEY);
    };
    const timeoutId = setTimeout(restore, 150);
    return () => clearTimeout(timeoutId);
  }, [isLoading, userPosts.length]);

  useEffect(() => {
    void loadData();
    let subscription: any = null;
    const setupSubscription = async () => {
      const user = authUser;
      if (isOwnProfile && user) {
        subscription = subscribeToSavedEvents(user.id, async () => {
          try {
            const saved = await getSavedEvents(user.id);
            if (saved) {
              setSavedEvents(saved as unknown as SavedEvent[]);
              savedEventsLoadedRef.current = true;
            }
          } catch (e) {
            console.error('Error refreshing saved events:', e);
          }
        });
        savedEventsSubscriptionRef.current = subscription;
      }
    };
    void setupSubscription();
    return () => {
      if (subscription) subscription.unsubscribe?.();
      savedEventsSubscriptionRef.current = null;
    };
  }, [userId, isOwnProfile, authUser?.id]);

  return {
    currentUser,
    userProfile,
    organizerStats,
    publishedEvents,
    savedEvents,
    attendedEvents,
    ticketEvents,
    userPosts,
    isLoading,
    isLoadingPosts,
    isLoadingMorePosts,
    hasMorePosts,
    isLoadingSavedEvents,
    isLoadingOrganizerEvents,
    isLoadingTickets,
    followStats,
    isFollowing,
    isOwnProfile,
    isOrganizer,
    setPublishedEvents,
    setSavedEvents,
    setFollowStats,
    setIsFollowing,
    loadMorePosts,
  };
}
