import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsModal } from './SettingsModal';
import { TicketViewer } from './TicketViewer';
import { EventDetailModal } from './EventDetailModal';
import { supabase } from '../utils/supabase/client';
import { deleteEvent, getProfile, getUserTickets, getSavedEvents, getFollowersCount, getFollowingCount, getProfilePostsGrid, subscribeToSavedEvents, Profile as UserProfile, Ticket, ApiPost, getFollowers, getFollowing, getOrganizerStats, getOrganizerEvents, toggleFollow, checkIsFollowing } from '../utils/supabase/api';
import { LiveSetupModal } from './LiveSetupModal';
import type { Event as AppEvent } from '../utils/supabase/api';
import { UserListModal } from './UserListModal';
import { UserProfileModal } from './UserProfileModal';
import { TicketListModal } from './TicketListModal';
import { ProfessionalDashboardModal } from './ProfessionalDashboardModal';
import { Conversation, Post as UiPost } from '../types';
import { formatTimeAgo } from '../utils/format';
import { EventListModal } from './EventListModal';

import { ProfileHeader } from './profile/ProfileHeader';
import { ProfileBio } from './profile/ProfileBio';
import { ProfileStats } from './profile/ProfileStats';
import { ProfileTabs, type ProfileTab } from './profile/ProfileTabs';
import { ProfileContent } from './profile/ProfileContent';
import { ProfileSidebar } from './profile/ProfileSidebar';
import { ProfileActions } from './profile/ProfileActions';

type TicketViewerTicket = {
  id: number;
  name: string;
  date: string;
  time: string;
  location: string;
  image: string;
  category: string;
  ticketType: string;
  price: string;
  qrCode: string;
};

interface ProfileProps {
  onLogout?: () => Promise<void>;
  onCreateEvent?: () => void;
  onEditEvent?: (event: any) => void;
  onStartOrganizerSetup?: () => void;
  onStartConversation?: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => Promise<Conversation | null | undefined> | Conversation | null;
  userId?: string;
  onBack?: () => void;
  onViewPost?: (post: any) => void;
  isPaused?: boolean;
}

export function Profile({ onLogout, onCreateEvent, onEditEvent, onStartOrganizerSetup, userId: userIdProp, onBack, onViewPost, isPaused = false }: ProfileProps) {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const userId = userIdProp || userIdParam;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>('media');
  const [savedEvents, setSavedEvents] = useState<(AppEvent & { isSaved: boolean; hasReminder: boolean })[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialView, setSettingsInitialView] = useState<'main' | 'profile'>('main');
  const [showTicketViewer, setShowTicketViewer] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketViewerTicket | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [showLiveSetupModal, setShowLiveSetupModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [showTicketListModal, setShowTicketListModal] = useState(false);
  const [selectedEventTickets, setSelectedEventTickets] = useState<Ticket[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [organizerStats, setOrganizerStats] = useState<any>(null);
  const [publishedEvents, setPublishedEvents] = useState<any[]>([]);
  const [showProfessionalDashboard, setShowProfessionalDashboard] = useState(false);

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
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const loadSeqRef = useRef(0);
  const lastLoadedProfileIdRef = useRef<string | null>(null);
  const savedEventsLoadedRef = useRef(false);
  const ticketsLoadedRef = useRef(false);
  const organizerEventsLoadedRef = useRef(false);

  const [showEventListModal, setShowEventListModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followList, setFollowList] = useState<any[]>([]);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState<any>(null);

  const isOwnProfile = !userId || (currentUser && userId === currentUser.id);
  const isOrganizer = userProfile?.is_organizer || false;
  const profileImage = userProfile?.avatar_url;
  const displayName = userProfile?.full_name || 'User';
  const organizerCategory = userProfile?.organizer_type;
  const POSTS_PAGE_SIZE = 18;
  const PROFILE_CACHE_TTL_MS = 60_000;
  const PROFILE_SCROLL_KEY = 'eventz_profile_scroll';
  const PROFILE_POST_ID_KEY = 'eventz_profile_post_id';
  const savedEventsSubscriptionRef = useRef<any>(null);

  const handleDeleteEvent = async (event: AppEvent) => {
    if (!currentUser || currentUser.id !== event.organizer_id) return;
    const confirmed = window.confirm('Delete this event? This action cannot be undone.');
    if (!confirmed) return;
    try {
      await deleteEvent(event.id);
      setPublishedEvents(prev => prev.filter(e => e.id !== event.id));
      setSavedEvents(prev => prev.filter(e => e.id !== event.id));
      if (selectedEvent?.id === event.id) setSelectedEvent(null);
      toast.success('Event deleted');
    } catch (error: any) {
      console.error('Failed to delete event', error);
      toast.error(error?.message || 'Failed to delete event');
    }
  };

  const handleShowFollowers = async () => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;
    setShowFollowersModal(true);
    setIsLoadingFollowList(true);
    try {
      const followers = await getFollowers(targetUserId);
      setFollowList(followers);
    } catch (err) {
      console.error('Error fetching followers:', err);
      toast.error('Failed to load followers');
    } finally {
      setIsLoadingFollowList(false);
    }
  };

  const handleShowFollowing = async () => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;
    setShowFollowingModal(true);
    setIsLoadingFollowList(true);
    try {
      const following = await getFollowing(targetUserId);
      setFollowList(following);
    } catch (err) {
      console.error('Error fetching following:', err);
      toast.error('Failed to load following');
    } finally {
      setIsLoadingFollowList(false);
    }
  };

  const loadData = async () => {
    const seq = ++loadSeqRef.current;
    try {
      setIsLoading(true);
      setIsLoadingPosts(true);
      setIsLoadingMorePosts(false);
      setPostsOffset(0);
      setHasMorePosts(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (seq !== loadSeqRef.current) return;

      if (user) setCurrentUser(user);
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      const viewerId = user?.id || null;
      const cacheKey = viewerId ? `eventz_profile_cache_${viewerId}_${targetUserId}` : `eventz_profile_cache_${targetUserId}`;
      try {
        const cachedRaw = sessionStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached?.ts && Date.now() - cached.ts < PROFILE_CACHE_TTL_MS) {
            if (cached.profile) setUserProfile(cached.profile);
            if (cached.followStats) setFollowStats(cached.followStats);
            if (typeof cached.isFollowing === 'boolean') setIsFollowing(cached.isFollowing);
            if (cached.organizerStats) setOrganizerStats(cached.organizerStats);
            if (Array.isArray(cached.posts)) {
              setUserPosts(cached.posts);
              setPostsOffset(cached.posts.length);
              setHasMorePosts(cached.posts.length === POSTS_PAGE_SIZE);
              setIsLoadingPosts(false);
            }
            setIsLoading(false);
          }
        }
      } catch {}

      if (lastLoadedProfileIdRef.current !== targetUserId) {
        setOrganizerStats(null);
        setPublishedEvents([]);
        setSavedEvents([]);
        setTicketEvents([]);
        setAttendedEvents([]);
        setUserPosts([]);
        savedEventsLoadedRef.current = false;
        ticketsLoadedRef.current = false;
        organizerEventsLoadedRef.current = false;
        lastLoadedProfileIdRef.current = targetUserId;
      }

      // Fetch profile first to know if organizer
      const profile = await getProfile(targetUserId);
      if (seq !== loadSeqRef.current) return;
      if (profile) setUserProfile(profile);

      // Now fetch all stats in parallel, including organizer stats
      const [followers, following, followingFlag, stats] = await Promise.all([
        getFollowersCount(targetUserId),
        getFollowingCount(targetUserId),
        user && targetUserId !== user.id ? checkIsFollowing(user.id, targetUserId) : Promise.resolve(false),
        profile?.is_organizer ? getOrganizerStats(targetUserId) : Promise.resolve(null),
      ]);

      if (seq !== loadSeqRef.current) return;

      if (stats) setOrganizerStats(stats);
      setFollowStats({ followers, following });
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
    } catch (error) {
      console.error('Error loading profile:', error);
      setIsLoading(false);
      setIsLoadingPosts(false);
    } finally {
      if (seq === loadSeqRef.current) setIsLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (isLoadingPosts || isLoadingMorePosts || !hasMorePosts) return;
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;
    try {
      setIsLoadingMorePosts(true);
      const next = await getProfilePostsGrid({ authorId: targetUserId, limit: POSTS_PAGE_SIZE, offset: postsOffset });
      const nextPosts = next || [];
      setUserPosts(prev => [...prev, ...nextPosts]);
      setPostsOffset(prev => prev + nextPosts.length);
      setHasMorePosts(nextPosts.length === POSTS_PAGE_SIZE);
    } catch (e) {
      console.error('Error loading more posts:', e);
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
    } catch (e) {
      console.error('Error loading organizer events:', e);
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
      if (saved) setSavedEvents(saved as unknown as (AppEvent & { isSaved: boolean; hasReminder: boolean })[]);
      savedEventsLoadedRef.current = true;
    } catch (e) {
      console.error('Error loading saved events:', e);
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
          .filter(t => { if (!t.event?.date) return false; const d = new Date(t.event.date); return !isNaN(d.getTime()) && d < new Date(); })
          .map(t => t.event!)
          .filter(e => !!e);
        setAttendedEvents(Array.from(new Map(attended.map(item => [item.id, item])).values()));
      }
      ticketsLoadedRef.current = true;
    } catch (e) {
      console.error('Error loading tickets:', e);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    const handleProfileUpdated = () => { loadData(); };
    window.addEventListener('profileUpdated', handleProfileUpdated as EventListener);
    return () => { window.removeEventListener('profileUpdated', handleProfileUpdated as EventListener); };
  }, [userId, isOwnProfile]);

  useEffect(() => {
    if (activeTab === 'upcoming') loadOrganizerEventsIfNeeded();
  }, [activeTab, userProfile?.is_organizer, currentUser?.id, userId]);

  useEffect(() => {
    if (activeTab === 'saved') loadSavedEventsIfNeeded();
  }, [activeTab, isOwnProfile, currentUser?.id, userId]);

  useEffect(() => {
    if (activeTab === 'tickets') loadTicketsIfNeeded();
  }, [activeTab, isOwnProfile, isOrganizer, currentUser?.id, userId]);

  useEffect(() => {
    loadTicketsIfNeeded();
  }, [isOwnProfile, isOrganizer, currentUser?.id, userId]);

  useEffect(() => {
    if (isLoading || userPosts.length === 0) return;
    const savedScroll = sessionStorage.getItem(PROFILE_SCROLL_KEY);
    const savedPostId = sessionStorage.getItem(PROFILE_POST_ID_KEY);
    if (!savedScroll && !savedPostId) return;
    const restore = () => {
      if (savedPostId) {
        const el = document.getElementById(`profile-post-${savedPostId}`);
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); sessionStorage.removeItem(PROFILE_SCROLL_KEY); sessionStorage.removeItem(PROFILE_POST_ID_KEY); return; }
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
    loadData();
    let subscription: any = null;
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (isOwnProfile && user) {
        subscription = subscribeToSavedEvents(user.id, async () => {
          try {
            const saved = await getSavedEvents(user.id);
            if (saved) { setSavedEvents(saved as unknown as (AppEvent & { isSaved: boolean; hasReminder: boolean })[]); savedEventsLoadedRef.current = true; }
          } catch (e) { console.error('Error refreshing saved events:', e); }
        });
        savedEventsSubscriptionRef.current = subscription;
      }
    };
    setupSubscription();
    return () => { if (subscription) subscription.unsubscribe?.(); savedEventsSubscriptionRef.current = null; };
  }, [userId, isOwnProfile]);

  const handleOpenPost = (post: ApiPost) => {
    sessionStorage.setItem(PROFILE_SCROLL_KEY, String(window.scrollY));
    sessionStorage.setItem(PROFILE_POST_ID_KEY, String(post.id));

    let postUser;
    if (isOwnProfile) {
      const currentProfileIsOrganizer = userProfile?.is_organizer || false;
      postUser = { id: currentUser?.id, name: displayName, username: userProfile?.username || '@user', avatar: profileImage || '', verified: userProfile?.verified || false, isOrganizer: currentProfileIsOrganizer, isOrganizerPage: currentProfileIsOrganizer };
    } else {
      const isOrganizerPage = !!post.posted_as_organizer;
      postUser = { id: post.user?.id || 'unknown', name: post.user?.full_name || post.user?.username || 'Unknown User', username: post.user?.username || userProfile?.username || '@unknown', avatar: post.user?.avatar_url || profileImage || '', verified: post.user?.verified || false, isOrganizer: post.user?.is_organizer || false, isOrganizerPage };
    }

    const uiPost: UiPost = {
      id: post.id, user_id: post.user_id, user: postUser,
      event: post.event ? { id: post.event.id, name: post.event.title, date: post.event.date, time: post.event.time, location: post.event.location, image: post.event.image_url, price: post.event.price_range } : undefined,
      content: { text: post.content, images: post.image_urls, image: post.image_urls?.[0], hashtags: post.hashtags },
      timestamp: formatTimeAgo(post.created_at), likes: post.likes_count || 0, comments: [], comments_count: post.comments_count || 0,
      shares: 0, views: post.views || 0, isLiked: post.is_liked || false, isSaved: post.is_saved || false,
      isHighlight: !!post.video_url,
      highlights: post.video_url ? [{ id: post.id, thumbnail: (post.image_urls?.find(url => !url.match(/\.(mp4|webm|ogg|mov)$/i))) || 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=300&h=500&fit=crop', duration: post.duration || '', title: post.content || 'Video Highlight', videoUrl: post.video_url, views: post.views || 0 }] : undefined,
      video_url: post.video_url
    };
    onViewPost?.(uiPost);
  };

  const groupedTickets = ticketEvents.reduce((acc, ticket) => {
    const eventId = ticket.event_id;
    if (!acc[eventId]) acc[eventId] = [];
    acc[eventId].push(ticket);
    return acc;
  }, {} as Record<number, Ticket[]>);
  const uniqueTicketGroups = Object.values(groupedTickets);

  const handleFollow = async () => {
    const targetUserId = userId || currentUser?.id;
    if (!currentUser || !targetUserId) return;
    try {
      await toggleFollow(currentUser.id, targetUserId);
      setIsFollowing(prev => !prev);
      setFollowStats(prev => ({ ...prev, followers: prev.followers + (isFollowing ? -1 : 1) }));
    } catch (err) {
      console.error('Error toggling follow:', err);
      toast.error('Failed to update follow status');
    }
  };

  return (
    <div className="bg-white min-h-screen pb-16 pt-6 px-6">
      <ProfileHeader
        isLoading={isLoading}
        profileImage={profileImage}
        displayName={displayName}
        username={userProfile?.username}
        isOwnProfile={isOwnProfile}
        isOrganizer={isOrganizer}
        onBack={onBack}
        onGoLive={() => setShowLiveSetupModal(true)}
        sidebarSlot={
          <ProfileSidebar
            isOpen={isSidebarOpen}
            onOpenChange={setIsSidebarOpen}
            profileImage={profileImage}
            displayName={displayName}
            username={userProfile?.username}
            isOrganizer={isOrganizer}
            onEditProfile={() => { setSettingsInitialView('profile'); setShowSettingsModal(true); }}
            onSettings={() => { setSettingsInitialView('main'); setShowSettingsModal(true); }}
            onDashboard={() => setShowProfessionalDashboard(true)}
            onLogout={onLogout}
          />
        }
      />

      <ProfileBio
        isLoading={isLoading}
        isOrganizer={isOrganizer}
        isOwnProfile={isOwnProfile}
        organizerCategory={organizerCategory}
        bio={userProfile?.bio}
        onSetBio={() => { setSettingsInitialView('profile'); setShowSettingsModal(true); }}
      />

      <ProfileStats
        isLoading={isLoading}
        isOrganizer={isOrganizer}
        hostedCount={organizerStats?.totalEvents ?? null}
        attendedCount={attendedEvents.length}
        followers={followStats.followers}
        following={followStats.following}
        onHostedClick={() => setShowEventListModal(true)}
        onFollowersClick={handleShowFollowers}
        onFollowingClick={handleShowFollowing}
      />

      <ProfileActions
        isOwnProfile={isOwnProfile}
        isOrganizer={isOrganizer}
        isLoading={isLoading}
        isFollowing={isFollowing}
        onCreateEvent={onCreateEvent}
        onDashboard={() => setShowProfessionalDashboard(true)}
        onStartOrganizerSetup={onStartOrganizerSetup}
        onFollow={handleFollow}
        onMessage={() => {
          if (!currentUser) { toast.error('Please sign in to message'); return; }
          navigate('/feed', {
            state: {
              openMessages: true,
              userToMessage: { id: userId, name: displayName, username: userProfile?.username || '', avatar: userProfile?.avatar_url || '', verified: !!userProfile?.verified, isOrganizer: !!userProfile?.is_organizer }
            }
          });
        }}
      />

      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} isOwnProfile={isOwnProfile} isOrganizer={isOrganizer} />

      <ProfileContent
        activeTab={activeTab}
        isOwnProfile={isOwnProfile}
        isPaused={isPaused}
        isLoadingPosts={isLoadingPosts}
        userPosts={userPosts}
        hasMorePosts={hasMorePosts}
        isLoadingMorePosts={isLoadingMorePosts}
        onLoadMorePosts={loadMorePosts}
        onOpenPost={handleOpenPost}
        isLoadingSavedEvents={isLoadingSavedEvents}
        savedEvents={savedEvents}
        onEventClick={(e) => setSelectedEvent(e)}
        currentUserId={currentUser?.id}
        onEditEvent={onEditEvent}
        onDeleteEvent={handleDeleteEvent}
        isLoadingOrganizerEvents={isLoadingOrganizerEvents}
        publishedEvents={publishedEvents}
        onCreateEvent={onCreateEvent}
        isLoadingTickets={isLoadingTickets}
        uniqueTicketGroups={uniqueTicketGroups}
        onTicketGroupClick={(tickets) => { setSelectedEventTickets(tickets); setShowTicketListModal(true); }}
      />

      {/* FAB */}
      {isOwnProfile && (
        <button
          onClick={() => navigate('/compose/post')}
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-6 w-12 h-12 rounded-full bg-[#8A2BE2] shadow-xl hover:shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center z-40 group"
          title="Share a post"
        >
          <Camera className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Modals */}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} initialView={settingsInitialView} />}
      {showLiveSetupModal && <LiveSetupModal isOpen={showLiveSetupModal} onClose={() => setShowLiveSetupModal(false)} />}
      {showTicketListModal && (
        <TicketListModal
          isOpen={showTicketListModal}
          eventName={selectedEventTickets[0]?.event?.title || 'My Tickets'}
          onClose={() => setShowTicketListModal(false)}
          tickets={selectedEventTickets}
          onSelectTicket={(ticket) => {
            setSelectedTicket({
              id: ticket.id, name: ticket.event?.title || 'Event', date: ticket.event?.date || '', time: ticket.event?.time || '',
              location: ticket.event?.location || '', image: ticket.event?.image_url || '', category: (ticket.event as any)?.category || '',
              ticketType: ticket.ticket_type || '', price: ticket.price || '', qrCode: ticket.qr_code || ticket.barcode || ticket.ticket_number || String(ticket.id),
            });
            setShowTicketViewer(true);
          }}
        />
      )}
      {showTicketViewer && selectedTicket && <TicketViewer ticket={selectedTicket} onClose={() => setShowTicketViewer(false)} />}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onPurchaseTicket={() => toast.info("Please go to Events page to purchase tickets")}
          onPurchaseNormalTicket={() => toast.info("Please go to Events page to purchase tickets")}
        />
      )}
      {showEventListModal && (
        <EventListModal
          title={isOrganizer ? "Hosted Events" : "Attended Events"}
          events={isOrganizer ? (publishedEvents as any) : attendedEvents}
          onClose={() => setShowEventListModal(false)}
          onEventClick={(event) => { setSelectedEvent(event); setShowEventListModal(false); }}
        />
      )}
      {showFollowersModal && (
        <UserListModal isOpen={showFollowersModal} onClose={() => setShowFollowersModal(false)} title="Followers" users={followList} loading={isLoadingFollowList}
          onUserSelect={(user) => { setSelectedUserForModal(user); setShowUserProfileModal(true); }}
        />
      )}
      {showFollowingModal && (
        <UserListModal isOpen={showFollowingModal} onClose={() => setShowFollowingModal(false)} title="Following" users={followList} loading={isLoadingFollowList}
          onUserSelect={(user) => { setSelectedUserForModal(user); setShowUserProfileModal(true); }}
        />
      )}
      {showUserProfileModal && selectedUserForModal && (
        <UserProfileModal
          user={{ id: selectedUserForModal.id, name: selectedUserForModal.full_name || selectedUserForModal.username || 'User', type: selectedUserForModal.is_organizer ? 'Organizer' : 'Attendee', avatar: selectedUserForModal.avatar_url || '', verified: !!selectedUserForModal.verified, isOrganizer: !!selectedUserForModal.is_organizer, username: selectedUserForModal.username || '' } as any}
          onClose={() => setShowUserProfileModal(false)}
          onMessage={() => {
            if (!currentUser) { toast.error('Please sign in to message'); return; }
            navigate('/feed', { state: { openMessages: true, userToMessage: { id: selectedUserForModal.id, name: selectedUserForModal.full_name || selectedUserForModal.username || 'User', username: selectedUserForModal.username || '', avatar: selectedUserForModal.avatar_url || '', verified: !!selectedUserForModal.verified, isOrganizer: !!selectedUserForModal.is_organizer } } });
            setShowUserProfileModal(false);
          }}
        />
      )}
      {showProfessionalDashboard && (
        <ProfessionalDashboardModal onClose={() => setShowProfessionalDashboard(false)} organizerProfile={userProfile} onCreateEvent={onCreateEvent || (() => {})} onEditEvent={onEditEvent} />
      )}
    </div>
  );
}
