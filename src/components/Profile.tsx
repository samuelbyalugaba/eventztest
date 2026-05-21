import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { deleteEvent, Ticket, ApiPost, getFollowers, getFollowing, toggleFollow } from '../utils/supabase/api';
import type { Event as AppEvent } from '../utils/supabase/api';
import { UserListModal } from './UserListModal';
import { TicketListModal } from './TicketListModal';
import { Conversation, Post as UiPost } from '../types';
import { formatTimeAgo } from '../utils/format';
import { EventListModal } from './EventListModal';
import { useProfileData } from '../hooks/useProfileData';

// Lazy-load heavy modals
const SettingsModal = lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const LiveSetupModal = lazy(() => import('./LiveSetupModal').then(m => ({ default: m.LiveSetupModal })));
const ProfessionalDashboardModal = lazy(() => import('./ProfessionalDashboardModal').then(m => ({ default: m.ProfessionalDashboardModal })));
const EventDetailModal = lazy(() => import('./EventDetailModal').then(m => ({ default: m.EventDetailModal })));
const TicketViewer = lazy(() => import('./TicketViewer').then(m => ({ default: m.TicketViewer })));
const WalletModal = lazy(() => import('./WalletModal').then(m => ({ default: m.WalletModal })));

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

export function Profile({ onLogout, onCreateEvent, onEditEvent, onStartOrganizerSetup, onStartConversation, userId: userIdProp, onBack, onViewPost, isPaused = false }: ProfileProps) {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const userId = userIdProp || userIdParam;
  const navigate = useNavigate();
  const location = useLocation();
  const returnToEvent = (location.state as { returnToEvent?: { pathname?: string; search?: string; hash?: string; state?: unknown } } | null)?.returnToEvent;
  const currentRouteTarget = {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    state: location.state,
  };

  const handleBack = onBack || (userId ? () => {
    if (returnToEvent?.pathname) {
      navigate({
        pathname: returnToEvent.pathname,
        search: returnToEvent.search || '',
        hash: returnToEvent.hash || '',
      }, { replace: true, state: returnToEvent.state });
      return;
    }

    navigate(-1);
  } : undefined);

  const [activeTab, setActiveTab] = useState<ProfileTab>('media');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialView, setSettingsInitialView] = useState<'main' | 'profile'>('main');
  const [showTicketViewer, setShowTicketViewer] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketViewerTicket | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [showLiveSetupModal, setShowLiveSetupModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isStartingMessage, setIsStartingMessage] = useState(false);

  const [showTicketListModal, setShowTicketListModal] = useState(false);
  const [selectedEventTickets, setSelectedEventTickets] = useState<Ticket[]>([]);
  const [showProfessionalDashboard, setShowProfessionalDashboard] = useState(false);

  const [showEventListModal, setShowEventListModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followList, setFollowList] = useState<any[]>([]);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);
  

  const {
    currentUser,
    userProfile,
    
    publishedEvents,
    savedEvents,
    savedPosts,
    attendedEvents,
    ticketEvents,
    userPosts,
    streamedVideos,
    isLoading,
    isLoadingPosts,
    isLoadingMorePosts,
    hasMorePosts,
    isLoadingSavedEvents,
    isLoadingOrganizerEvents,
    isLoadingTickets,
    isLoadingStreamedVideos,
    followStats,
    isFollowing,
    isOwnProfile,
    isOrganizer,
    setPublishedEvents,
    setSavedEvents,
    setFollowStats,
    setIsFollowing,
    loadMorePosts,
  } = useProfileData(userId, activeTab);

  // Scroll to top on mount or when user changes
  useEffect(() => {
    // Target the parent scroll container if it exists
    const container = document.querySelector('.overflow-y-auto.overscroll-behavior-y-contain');
    if (container) {
      container.scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
    }
  }, [userId]);

  const profileImage = userProfile?.avatar_url;
  const displayName = userProfile?.full_name || 'User';
  const organizerCategory = userProfile?.organizer_type;

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
      toast.error('Failed to load following');
    } finally {
      setIsLoadingFollowList(false);
    }
  };

  const handleOpenPost = (post: ApiPost) => {
    sessionStorage.setItem('eventz_profile_scroll', String(window.scrollY));
    sessionStorage.setItem('eventz_profile_post_id', String(post.id));

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
  const pastHostedEvents = publishedEvents.filter(e => new Date(e.date) < new Date());
  const pastHostedEventIds = new Set(pastHostedEvents.map((event) => event.id));
  const additionalHostedStreams = streamedVideos.filter((stream) => !stream.event_id || !pastHostedEventIds.has(stream.event_id));
  const hostedCount = pastHostedEvents.length + additionalHostedStreams.length;

  const handleFollow = async () => {
    const targetUserId = userId || currentUser?.id;
    if (!currentUser || !targetUserId) return;
    try {
      await toggleFollow(currentUser.id, targetUserId);
      setIsFollowing(prev => !prev);
      setFollowStats(prev => ({ ...prev, followers: prev.followers + (isFollowing ? -1 : 1) }));
    } catch (err) {
      toast.error('Failed to update follow status');
    }
  };

  return (
    <div className="bg-white min-h-screen pb-16 px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6">
      <ProfileHeader
        isLoading={isLoading}
        profileImage={profileImage}
        displayName={displayName}
        username={userProfile?.username}
        isOwnProfile={isOwnProfile}
        isOrganizer={isOrganizer}
        isVerified={!!userProfile?.verified}
        onBack={handleBack}
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
            onWallet={() => setShowWalletModal(true)}
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
        isOrganizer={isOrganizer}
        hostedCount={hostedCount}
        attendedCount={attendedEvents.length}
        followers={followStats.followers}
        following={followStats.following}
        dataReady={!isLoading}
        onHostedClick={() => {
          setShowEventListModal(true);
        }}
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
        isMessaging={isStartingMessage}
        onMessage={async () => {
          if (!currentUser) { toast.error('Please sign in to message'); return; }
          if (!userId) { toast.error('Could not find this profile'); return; }
          if (isStartingMessage) return;
          if (!onStartConversation) {
            navigate('/messages', { state: { returnTo: currentRouteTarget } });
            return;
          }

          const toastId = toast.loading('Opening chat...');
          setIsStartingMessage(true);
          try {
            const conversation = await onStartConversation({
              id: userId,
              name: displayName,
              username: userProfile?.username || '',
              avatar: userProfile?.avatar_url || '',
              verified: !!userProfile?.verified,
              isOrganizer: !!userProfile?.is_organizer,
            });

            if (conversation) {
              toast.dismiss(toastId);
              navigate(`/messages/${conversation.id}`, { state: { returnTo: currentRouteTarget } });
            } else {
              toast.error('Could not start conversation', { id: toastId });
            }
          } catch {
            toast.error('Failed to start conversation', { id: toastId });
          } finally {
            setIsStartingMessage(false);
          }
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
        savedPosts={savedPosts}
        onEventClick={(e) => setSelectedEvent(e)}
        onOpenSavedPost={handleOpenPost}
        currentUserId={currentUser?.id}
        onEditEvent={onEditEvent}
        onDeleteEvent={handleDeleteEvent}
        isLoadingOrganizerEvents={isLoadingOrganizerEvents}
        publishedEvents={publishedEvents}
        onCreateEvent={onCreateEvent}
        isLoadingTickets={isLoadingTickets}
        uniqueTicketGroups={uniqueTicketGroups}
        onTicketGroupClick={(tickets) => { setSelectedEventTickets(tickets); setShowTicketListModal(true); }}
        isLoadingStreamedVideos={isLoadingStreamedVideos}
        streamedVideos={streamedVideos}
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

      {/* Modals - lazy-loaded with Suspense */}
      <Suspense fallback={null}>
        {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} initialView={settingsInitialView} />}
        {showLiveSetupModal && <LiveSetupModal isOpen={showLiveSetupModal} onClose={() => setShowLiveSetupModal(false)} />}
        {showTicketViewer && selectedTicket && <TicketViewer ticket={selectedTicket} onClose={() => setShowTicketViewer(false)} />}
        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onPurchaseTicket={() => toast.info("Please go to Events page to purchase tickets")}
            onPurchaseNormalTicket={() => toast.info("Please go to Events page to purchase tickets")}
          />
        )}
        {showProfessionalDashboard && (
          <ProfessionalDashboardModal onClose={() => setShowProfessionalDashboard(false)} organizerProfile={userProfile} onCreateEvent={onCreateEvent || (() => {})} onEditEvent={onEditEvent} />
        )}
        {showWalletModal && (
          <WalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />
        )}
      </Suspense>
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
      {showEventListModal && (
          <EventListModal
            title={isOrganizer ? "Hosted" : "Attended Events"}
            events={isOrganizer ? pastHostedEvents : (attendedEvents as any)}
            streams={isOrganizer ? streamedVideos : []}
            onClose={() => setShowEventListModal(false)}
            onEventClick={(event) => {
              setSelectedEvent(event);
              setShowEventListModal(false);
            }}
          />
        )}
      {showFollowersModal && (
        <UserListModal isOpen={showFollowersModal} onClose={() => setShowFollowersModal(false)} title="Followers" users={followList} loading={isLoadingFollowList}
          onUserSelect={(user) => {
            navigate(`/profile/${user.id}`);
            setShowFollowersModal(false);
          }}
        />
      )}
      {showFollowingModal && (
        <UserListModal isOpen={showFollowingModal} onClose={() => setShowFollowingModal(false)} title="Following" users={followList} loading={isLoadingFollowList}
          onUserSelect={(user) => {
            navigate(`/profile/${user.id}`);
            setShowFollowingModal(false);
          }}
        />
      )}

    </div>
  );
}
