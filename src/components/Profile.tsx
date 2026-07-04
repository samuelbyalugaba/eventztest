import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Ban, Camera, Menu, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { blockUser, deleteEvent, reportContent, Ticket, ApiPost, toggleFollow } from '../utils/supabase/api';
import type { Event as AppEvent } from '../utils/supabase/api';
import { TicketListModal } from './TicketListModal';
import { Conversation, Post as UiPost } from '../types';
import { formatTimeAgo } from '../utils/format';
import { EventListModal } from './EventListModal';
import { useProfileData } from '../hooks/useProfileData';
import { useProfileStore } from '../store/profileStore';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';

// Lazy-load heavy modals
const SettingsModal = lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const LiveSetupModal = lazy(() => import('./LiveSetupModal').then(m => ({ default: m.LiveSetupModal })));
const EventDetailModal = lazy(() => import('./EventDetailModal').then(m => ({ default: m.EventDetailModal })));
const TicketViewer = lazy(() => import('./TicketViewer').then(m => ({ default: m.TicketViewer })));
import { ProfileHeader } from './profile/ProfileHeader';
import { ProfileBio } from './profile/ProfileBio';
import { ProfileStats } from './profile/ProfileStats';
import { ProfileTabs, type ProfileTab } from './profile/ProfileTabs';
import { ProfileContent } from './profile/ProfileContent';
import { ProfileSidebar } from './profile/ProfileSidebar';
import { ProfileActions } from './profile/ProfileActions';
import { askForReportReason, confirmBlockUser } from '../utils/moderation';
import { ConfirmDialog } from './ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

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
  const [eventPendingDelete, setEventPendingDelete] = useState<AppEvent | null>(null);

  const [showTicketListModal, setShowTicketListModal] = useState(false);
  const [selectedEventTickets, setSelectedEventTickets] = useState<Ticket[]>([]);
  const [showEventListModal, setShowEventListModal] = useState(false);
  

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
    isProfileError,
    refetchProfile,
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
    setEventPendingDelete(event);
  };

  const handleConfirmDeleteEvent = async () => {
    if (!eventPendingDelete || !currentUser || currentUser.id !== eventPendingDelete.organizer_id) return;
    const event = eventPendingDelete;
    setEventPendingDelete(null);
    try {
      await deleteEvent(event.id);
      if (userId) {
        queryClient.setQueryData(queryKeys.profile.organizerEvents(userId), (prev: any) => {
          if (!Array.isArray(prev)) return prev;
          return prev.filter((e: any) => e.id !== event.id);
        });
        queryClient.setQueryData(queryKeys.profile.savedEvents(userId), (prev: any) => {
          if (!Array.isArray(prev)) return prev;
          return prev.filter((e: any) => e.id !== event.id);
        });
      }
      if (selectedEvent?.id === event.id) setSelectedEvent(null);
      window.dispatchEvent(new Event('eventsUpdated'));
      toast.success('Event deleted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete event');
    }
  };

  const handleOpenPost = (post: ApiPost) => {
    sessionStorage.setItem('eventz_profile_scroll', String(window.scrollY));
    sessionStorage.setItem('eventz_profile_post_id', String(post.id));

    const postAuthor = post.user;
    const hasPostAuthor = !!(postAuthor?.id || postAuthor?.full_name || postAuthor?.username || postAuthor?.avatar_url);
    let postUser;
    if (hasPostAuthor) {
      const isOrganizerPage = !!post.posted_as_organizer;
      postUser = {
        id: postAuthor?.id || post.user_id || 'unknown',
        name: postAuthor?.full_name || postAuthor?.username || 'Unknown User',
        username: postAuthor?.username || '@unknown',
        avatar: postAuthor?.avatar_url || '',
        verified: postAuthor?.verified || false,
        isOrganizer: postAuthor?.is_organizer || isOrganizerPage,
        isOrganizerPage,
      };
    } else if (isOwnProfile) {
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
      highlights: post.video_url ? [{ id: post.id, thumbnail: (post.image_urls?.find(url => !url.match(/\.(mp4|webm|ogg|ogv|mov|m4v|hevc|3gp|3gpp)$/i))) || 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=300&h=500&fit=crop', duration: post.duration || '', title: post.content || 'Video Highlight', videoUrl: post.video_url, views: post.views || 0 }] : undefined,
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
  const uniqueTicketGroups = Object.values(groupedTickets) as Ticket[][];
  const pastHostedEvents = publishedEvents.filter(e => new Date(e.date) < new Date());
  const pastHostedEventIds = new Set(pastHostedEvents.map((event) => event.id));
  const additionalHostedStreams = streamedVideos.filter((stream) => !stream.event_id || !pastHostedEventIds.has(stream.event_id));
  const computedHostedCount = pastHostedEvents.length + additionalHostedStreams.length;

  // Persist hosted/attended counts to the store so they survive page reloads
  const cachedHostedCount = useProfileStore((s) => s.hostedCount);
  const cachedAttendedCount = useProfileStore((s) => s.attendedCount);
  const hostedDataReady = !isLoadingOrganizerEvents && !isLoadingStreamedVideos;
  const hostedCount = hostedDataReady ? computedHostedCount : cachedHostedCount;
  const attendedCount = !isLoadingTickets ? attendedEvents.length : cachedAttendedCount;

  // Save computed counts to persisted store for next visit
  useEffect(() => {
    if (hostedDataReady) useProfileStore.getState().setHostedCount(computedHostedCount);
  }, [computedHostedCount, hostedDataReady]);
  useEffect(() => {
    if (!isLoadingTickets) useProfileStore.getState().setAttendedCount(attendedEvents.length);
  }, [attendedEvents.length, isLoadingTickets]);
  const profileSubpagePath = (section: 'hosted' | 'followers' | 'following') => (
    userId ? `/profile/${userId}/${section}` : `/${section}`
  );
  const profileListRouteState = {
    initialFollowersCount: followStats.followers,
    initialFollowingCount: followStats.following,
    initialProfile: userProfile
      ? {
          id: userProfile.id,
          full_name: userProfile.full_name,
          username: userProfile.username,
          avatar_url: userProfile.avatar_url,
          verified: userProfile.verified,
          is_organizer: userProfile.is_organizer,
        }
      : undefined,
  };
  const hostedRouteState = {
    ...profileListRouteState,
    initialHostedCount: hostedCount,
    initialHostedEvents: publishedEvents,
    initialHostedStreams: streamedVideos,
  };

  const handleReportProfile = async () => {
    if (!currentUser) { toast.error('Please sign in to report profiles'); return; }
    if (!userId) { toast.error('Could not find this profile'); return; }
    const reason = askForReportReason('this profile');
    if (!reason) return;
    try {
      await reportContent({
        contentType: 'profile',
        contentId: userId,
        reason,
        reportedUserId: userId,
      });
      toast.success('Report submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit report');
    }
  };

  const handleBlockProfile = async () => {
    if (!currentUser) { toast.error('Please sign in to block profiles'); return; }
    if (!userId) { toast.error('Could not find this profile'); return; }
    if (!confirmBlockUser(displayName)) return;
    try {
      await blockUser(userId);
      toast.success('Profile blocked');
      navigate('/feed', { replace: true });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to block profile');
    }
  };

  const handleFollow = async () => {
    const targetUserId = userId || currentUser?.id;
    if (!currentUser || !targetUserId) return;
    if (currentUser.id === targetUserId) return;
    try {
      await toggleFollow(currentUser.id, targetUserId);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.summary(currentUser.id, targetUserId) });
    } catch (err) {
      console.error('Follow toggle failed', err);
      toast.error('Failed to update follow status');
    }
  };

  if (isProfileError) {
    return (
      <div className="bg-white min-h-screen pb-14 px-4 pt-[calc(0.95rem+var(--eventz-safe-area-top))] sm:px-5 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <span className="text-red-500 text-2xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load profile</h2>
        <p className="text-gray-500 mb-6 max-w-sm">This profile may not exist or is temporarily unavailable.</p>
        <button
          onClick={() => refetchProfile()}
          className="rounded-full bg-[#8A2BE2] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#7C3AED]"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-14 px-4 pt-[calc(0.95rem+var(--eventz-safe-area-top))] sm:px-5">
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
          isOwnProfile ? (
            <ProfileSidebar
              isOpen={isSidebarOpen}
              onOpenChange={setIsSidebarOpen}
              profileImage={profileImage}
              displayName={displayName}
              username={userProfile?.username}
              isOrganizer={isOrganizer}
              onEditProfile={() => { setSettingsInitialView('profile'); setShowSettingsModal(true); }}
              onSettings={() => { setSettingsInitialView('main'); setShowSettingsModal(true); }}
              onDashboard={() => navigate('/dashboard')}
               onWallet={() => navigate('/wallet')}
              onLogout={onLogout}
            />
          ) : (
            <ProfileSafetyMenu
              onReport={handleReportProfile}
              onBlock={handleBlockProfile}
            />
          )
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
        attendedCount={attendedCount}
        followers={followStats.followers}
        following={followStats.following}
        dataReady={!isLoading}
        onHostedClick={() => {
          if (isOrganizer) {
            navigate(profileSubpagePath('hosted'), { state: hostedRouteState });
          } else {
            setShowEventListModal(true);
          }
        }}
        onFollowersClick={() => navigate(profileSubpagePath('followers'), { state: profileListRouteState })}
        onFollowingClick={() => navigate(profileSubpagePath('following'), { state: profileListRouteState })}
      />

      <ProfileActions
        isOwnProfile={isOwnProfile}
        isOrganizer={isOrganizer}
        isLoading={isLoading}
        isFollowing={isFollowing}
        onCreateEvent={onCreateEvent}
        onDashboard={() => navigate('/dashboard')}
        onStartOrganizerSetup={onStartOrganizerSetup}
        onFollow={handleFollow}
        onMessage={() => {
          if (!currentUser) { toast.error('Please sign in to message'); return; }
          if (!userId) { toast.error('Could not find this profile'); return; }

          navigate('/messages', {
            state: {
              returnTo: currentRouteTarget,
              startConversationUser: {
              id: userId,
              name: displayName,
              username: userProfile?.username || '',
              avatar: userProfile?.avatar_url || '',
              verified: !!userProfile?.verified,
              isOrganizer: !!userProfile?.is_organizer,
              },
            },
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
          className="fixed bottom-[calc(6.25rem+var(--eventz-safe-area-bottom))] right-5 w-12 h-12 rounded-full bg-[#8A2BE2] shadow-xl hover:shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center z-40 group"
          title="Share a post"
        >
          <Camera className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Modals - lazy-loaded with Suspense */}
      <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" /></div>}>
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
      <ConfirmDialog
        open={eventPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setEventPendingDelete(null);
        }}
        title="Delete event?"
        description="This removes the event and cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDeleteEvent}
      />
    </div>
  );
}

function ProfileSafetyMenu({ onReport, onBlock }: { onReport: () => void; onBlock: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Profile actions"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-900 transition-colors hover:bg-gray-100 active:bg-gray-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="z-[80] min-w-[170px] rounded-xl border-gray-100 bg-white p-1.5 shadow-lg">
        <DropdownMenuItem
          onClick={onReport}
          className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 focus:bg-gray-50"
        >
          <ShieldAlert className="h-4 w-4" />
          Report profile
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={onBlock}
          className="gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 focus:bg-red-50 focus:text-red-600"
        >
          <Ban className="h-4 w-4" />
          Block profile
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
