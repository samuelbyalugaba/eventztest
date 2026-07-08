import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { blockUser, deleteEvent, reportContent, ApiPost, toggleFollow } from '../utils/supabase/api';
import type { Event as AppEvent } from '../utils/supabase/api';
import { Conversation, Post as UiPost } from '../types';
import { formatTimeAgo } from '../utils/format';
import { useProfileData } from '../hooks/useProfileData';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';
import type { ProfileTab } from './profile/ProfileTabs';
import { ProfileHeader } from './profile/ProfileHeader';
import { ProfileBio } from './profile/ProfileBio';
import { ProfileStats } from './profile/ProfileStats';
import { ProfileTabs } from './profile/ProfileTabs';
import { ProfileContent } from './profile/ProfileContent';
import { ProfileSidebar } from './profile/ProfileSidebar';
import { ProfileActions } from './profile/ProfileActions';
import { ProfileSafetyMenu } from './profile/ProfileSafetyMenu';
import { ProfileError } from './profile/ProfileError';
import { ProfileFab } from './profile/ProfileFab';
import { ProfileModals } from './profile/ProfileModals';
import { useProfileStats } from './profile/useProfileStats';
import { confirmBlockUser } from '../utils/moderation';

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
  ticketNumber?: string;
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
  const [selectedEventTickets, setSelectedEventTickets] = useState<any[]>([]);
  const [showEventListModal, setShowEventListModal] = useState(false);
  const [showReportReason, setShowReportReason] = useState(false);

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

  useEffect(() => {
    const container = document.querySelector('.overflow-y-auto.overscroll-behavior-y-contain');
    if (container) {
      (container as HTMLElement).scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
    }
  }, [userId]);

  const profileImage = userProfile?.avatar_url;
  const displayName = userProfile?.full_name || 'User';
  const organizerCategory = userProfile?.organizer_type;

  const {
    uniqueTicketGroups,
    pastHostedEvents,
    hostedCount,
    attendedCount,
    displayFollowers,
    displayFollowing,
  } = useProfileStats({
    userId,
    isOwnProfile,
    isOrganizer,
    ticketEvents,
    publishedEvents,
    attendedEvents,
    streamedVideos,
    isLoadingOrganizerEvents,
    isLoadingStreamedVideos,
    isLoadingTickets,
    isLoading,
    followStats,
  });

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
      queryClient.invalidateQueries({ queryKey: queryKeys.events.root });
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
      highlights: post.video_url ? [{ id: post.id, thumbnail: (post.image_urls?.find((url: string) => !url.match(/\.(mp4|webm|ogg|ogv|mov|m4v|hevc|3gp|3gpp)$/i))) || 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=300&h=500&fit=crop', duration: post.duration || '', title: post.content || 'Video Highlight', videoUrl: post.video_url, views: post.views || 0 }] : undefined,
      video_url: post.video_url
    };
    onViewPost?.(uiPost);
  };

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
    setShowReportReason(true);
  };

  const handleReportReasonConfirm = async (reason: string) => {
    if (!reason || !userId) return;
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
    return <ProfileError onRetry={refetchProfile} />;
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
            <ProfileSafetyMenu onReport={handleReportProfile} onBlock={handleBlockProfile} />
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
        followers={displayFollowers}
        following={displayFollowing}
        dataReady={true}
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

      {isOwnProfile && <ProfileFab />}

      <ProfileModals
        showSettingsModal={showSettingsModal}
        settingsInitialView={settingsInitialView}
        onCloseSettings={() => setShowSettingsModal(false)}
        showLiveSetupModal={showLiveSetupModal}
        onCloseLiveSetup={() => setShowLiveSetupModal(false)}
        showTicketViewer={showTicketViewer}
        selectedTicket={selectedTicket}
        onCloseTicketViewer={() => setShowTicketViewer(false)}
        selectedEvent={selectedEvent}
        onCloseEventDetail={() => setSelectedEvent(null)}
        showTicketListModal={showTicketListModal}
        selectedEventTickets={selectedEventTickets}
        onCloseTicketList={() => setShowTicketListModal(false)}
        onSelectTicket={(ticket) => {
          setSelectedTicket({
            id: ticket.id, name: ticket.event?.title || 'Event', date: ticket.event?.date || '', time: ticket.event?.time || '',
            location: ticket.event?.location || '', image: ticket.event?.image_url || '', category: (ticket.event as any)?.category || '',
            ticketType: ticket.ticket_type || '', price: ticket.price || '', qrCode: ticket.qr_code || ticket.barcode || ticket.ticket_number || String(ticket.id),
            ticketNumber: ticket.ticket_number,
          });
          setShowTicketViewer(true);
        }}
        showEventListModal={showEventListModal}
        isOrganizer={isOrganizer}
        pastHostedEvents={pastHostedEvents}
        attendedEvents={attendedEvents}
        streamedVideos={streamedVideos}
        onCloseEventList={() => setShowEventListModal(false)}
        onEventClickFromList={(event) => {
          setSelectedEvent(event);
          setShowEventListModal(false);
        }}
        eventPendingDelete={eventPendingDelete}
        onConfirmDeleteOpenChange={(open) => {
          if (!open) setEventPendingDelete(null);
        }}
        onConfirmDelete={handleConfirmDeleteEvent}
        showReportReason={showReportReason}
        onReportReasonOpenChange={setShowReportReason}
        onReportReasonConfirm={handleReportReasonConfirm}
      />
    </div>
  );
}
