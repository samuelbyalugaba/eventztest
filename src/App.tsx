import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './contexts/AuthContext';
import { useMessaging } from './contexts/MessagingContext';
import { getPosts } from './utils/supabase/api';
import { formatTimeAgo } from './utils/format';
import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';
import { isVideoMedia } from './utils/media';
import { DesktopSidebar } from './components/desktop/DesktopSidebar';
import { RightRail } from './components/desktop/RightRail';
import LoadingScreen from './components/app/LoadingScreen';
import UnauthenticatedApp from './components/app/UnauthenticatedApp';
import KeepAliveTabs from './components/app/KeepAliveTabs';
import AppRoutes from './components/app/AppRoutes';
import BottomNav from './components/app/BottomNav';
import { ReportReasonProvider } from './contexts/ReportReasonContext';

const FEED_CACHE_KEY = 'eventz-feed-cache-v1';
const FEED_CACHE_TTL_MS = 5 * 60 * 1000;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const prevTabPathRef = useRef<string | null>(null);

  const {
    user: currentUser,
    isAuthenticated,
    isLoading: isCheckingAuth,
    signOut,
  } = useAuth();

  const {
    conversations,
    hasLiveEvents,
    startConversation: handleStartConversation,
    sendMessage: handleSendMessage,
  } = useMessaging();

  const handleAuthSuccess = (_token: string, _user: any) => {
    navigate('/events', { replace: true });
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const prefetchFeed = async () => {
      try {
        const cachedRaw = localStorage.getItem(FEED_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.timestamp && Date.now() - cached.timestamp < FEED_CACHE_TTL_MS) {
            const cachedPosts = Array.isArray(cached.posts) ? cached.posts : [];
            queryClient.setQueryData(queryKeys.feed.firstPage(currentUser?.id), {
              pages: [{ posts: cachedPosts, count: cachedPosts.length }],
              pageParams: [0],
            });
            return;
          }
        }
        const fresh = await getPosts({ currentUserId: currentUser?.id, limit: 20, offset: 0 });
        const mapped = (fresh || []).map((p: any) => {
          const isOrganizerPage = !!p.posted_as_organizer;
          const displayName = p.user?.full_name || p.user?.username || 'Unknown User';
          const avatarUrl = p.user?.avatar_url;
          return {
            id: p.id,
            user_id: p.user_id,
            user: {
              id: p.user?.id || 'unknown',
              name: displayName || 'Unknown',
              username: p.user?.username || '@unknown',
              avatar: avatarUrl || '',
              verified: p.user?.verified || false,
              isOrganizer: p.user?.is_organizer || false,
              isOrganizerPage,
            },
            event: p.event ? {
              id: p.event.id,
              name: p.event.title,
              date: p.event.date,
              time: p.event.time,
              location: p.event.location,
              image: p.event.image_url,
              price: p.event.price_range,
            } : undefined,
            content: {
              text: p.content,
              images: p.image_urls,
              image: p.image_urls?.[0],
              hashtags: p.hashtags,
            },
            timestamp: formatTimeAgo(p.created_at),
            likes: p.likes_count || 0,
            comments: [],
            comments_count: p.comments_count || 0,
            shares: 0,
            views: p.views || 0,
            isLiked: p.is_liked || false,
            isSaved: p.is_saved || false,
            isHighlight: !!p.video_url,
            highlights: p.video_url ? [{
              id: p.id,
              thumbnail: (p.image_urls?.find((url: string) => !isVideoMedia(url))) || 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=300&h=500&fit=crop',
              duration: p.duration || '',
              title: p.content || 'Video Highlight',
              videoUrl: p.video_url,
              views: p.views || 0,
            }] : undefined,
            mutualFriends: [],
          };
        });
        localStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ posts: mapped, timestamp: Date.now() }));
        queryClient.setQueryData(queryKeys.feed.firstPage(currentUser?.id), {
          pages: [{ posts: mapped, count: mapped.length }],
          pageParams: [0],
        });
      } catch (error) {
        console.warn('Feed prefetch failed', error);
      }
    };

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let scheduled: { type: 'idle' | 'timeout'; handle: number };
    if (typeof w.requestIdleCallback === 'function') {
      scheduled = { type: 'idle', handle: w.requestIdleCallback(() => { void prefetchFeed(); }, { timeout: 5000 }) };
    } else {
      scheduled = { type: 'timeout', handle: window.setTimeout(() => { void prefetchFeed(); }, 3000) as unknown as number };
    }
    return () => {
      if (scheduled.type === 'timeout') window.clearTimeout(scheduled.handle);
      else (window as any).cancelIdleCallback?.(scheduled.handle);
    };
  }, [isAuthenticated, currentUser?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handle = window.setTimeout(() => {
      void import('./components/MessagesPage');
    }, 1000);
    return () => window.clearTimeout(handle);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const preloadRoutes = () => {
      void import('./components/EventDetails');
      void import('./components/LiveFeed');
      void import('./components/Feed');
      void import('./components/Profile');
      void import('./components/profile/ProfileListPage');
      void import('./components/CreateEventWrapper');
      void import('./components/PostDetailWrapper');
      void import('./components/ProfileModalWrapper');
      void import('./components/EventDetailWrapper');
      void import('./components/LiveStreamPage');
      void import('./components/CreatePostPage');
      void import('./components/MessagesPage');
      void import('./components/DashboardPage');
      void import('./components/WalletPage');
    };

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let scheduled: { type: 'idle' | 'timeout'; handle: number };
    if (typeof w.requestIdleCallback === 'function') {
      scheduled = { type: 'idle', handle: w.requestIdleCallback(preloadRoutes, { timeout: 1500 }) };
    } else {
      scheduled = { type: 'timeout', handle: window.setTimeout(preloadRoutes, 750) as unknown as number };
    }

    return () => {
      if (scheduled.type === 'timeout') window.clearTimeout(scheduled.handle);
      else w.cancelIdleCallback?.(scheduled.handle);
    };
  }, [isAuthenticated]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/events');
    } catch (error) {
      console.warn('Sign out failed', error);
    }
  };

  const handleCreateEvent = () => navigate('/create');
  const handleStartOrganizerSetup = () => navigate('/create');
  const handleEditEvent = (event: any) => navigate(`/edit-event/${event.id}`);

  const handleViewPost = (item: any) => {
    const backgroundBase = (location.state as any)?.backgroundLocation || location;
    if (item.isProfile) {
      if (item.id && item.id !== 'unknown') {
        navigate(`/profile/${item.id}`, { state: { backgroundLocation: backgroundBase } });
      } else {
        navigate('/profile', { state: { backgroundLocation: backgroundBase } });
      }
    } else {
      navigate(`/post/${item.id}`, {
        state: {
          backgroundLocation: backgroundBase,
          post: item,
          startTime: item.startTime,
          isMuted: item.isMuted,
        },
      });
    }
  };

  const backgroundLocation = location.state?.backgroundLocation;
  const isProfileSubpagePath = (path?: string) => {
    if (!path) return false;
    return path === '/hosted' ||
      path === '/followers' ||
      path === '/following' ||
      /^\/profile\/[^/]+\/(hosted|followers|following)$/.test(path);
  };
  const isPostModal = location.pathname.startsWith('/post/') && backgroundLocation;
  const isEventModal = location.pathname.startsWith('/event/') && backgroundLocation;
  const shouldHideBottomNav = location.pathname.startsWith('/create') ||
    location.pathname.startsWith('/edit-event') ||
    (location.pathname.startsWith('/post') && !isPostModal) ||
    (location.pathname.startsWith('/event/') && !isEventModal) ||
    location.pathname.startsWith('/live/') ||
    location.pathname.startsWith('/messages') ||
    location.pathname.startsWith('/dashboard') ||
    location.pathname === '/wallet' ||
    location.pathname === '/privacy' ||
    location.pathname === '/terms' ||
    location.pathname === '/delete-account' ||
    isProfileSubpagePath(location.pathname) ||
    isProfileSubpagePath(backgroundLocation?.pathname);
  const effectiveLocation = backgroundLocation || location;
  const effectivePath = effectiveLocation.pathname;
  const isSearchTab = effectivePath === '/search';
  const isEventsTab = effectivePath === '/events' || effectivePath === '/';
  const isFeedTab = effectivePath === '/feed';
  const isLiveTab = effectivePath === '/live';
  const isOwnProfileTab = effectivePath === '/profile';
  const isKeepAliveTab = isEventsTab || isFeedTab || isLiveTab || isOwnProfileTab;
  type KeepAliveTab = 'events' | 'feed' | 'live' | 'profile';
  const activeKeepAliveTab: KeepAliveTab | null = isEventsTab
    ? 'events'
    : isFeedTab
      ? 'feed'
      : isLiveTab
        ? 'live'
        : isOwnProfileTab
          ? 'profile'
          : null;
  const [mountedTabs, setMountedTabs] = useState<Set<KeepAliveTab>>(() => (
    activeKeepAliveTab ? new Set([activeKeepAliveTab]) : new Set()
  ));
  const shouldMountEventsTab = activeKeepAliveTab === 'events' || mountedTabs.has('events');
  const shouldMountFeedTab = activeKeepAliveTab === 'feed' || mountedTabs.has('feed');
  const shouldMountLiveTab = activeKeepAliveTab === 'live' || mountedTabs.has('live');
  const shouldMountProfileTab = activeKeepAliveTab === 'profile' || mountedTabs.has('profile');

  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const liveScrollRef = useRef<HTMLDivElement>(null);
  const profileScrollRef = useRef<HTMLDivElement>(null);
  const routeScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeKeepAliveTab) {
      setMountedTabs((current) => {
        if (current.has(activeKeepAliveTab)) return current;
        const next = new Set(current);
        next.add(activeKeepAliveTab);
        return next;
      });
    }
  }, [activeKeepAliveTab]);

  useEffect(() => {
    const isTabSwitch = prevTabPathRef.current !== effectivePath;
    if (isTabSwitch) {
      if (isEventsTab && eventsScrollRef.current) eventsScrollRef.current.scrollTop = 0;
      if (isLiveTab && liveScrollRef.current) liveScrollRef.current.scrollTop = 0;
      if (isOwnProfileTab && profileScrollRef.current) profileScrollRef.current.scrollTop = 0;
      if (routeScrollRef.current) routeScrollRef.current.scrollTop = 0;

      window.scrollTo(0, 0);
    }
    prevTabPathRef.current = effectivePath;
  }, [effectivePath, isEventsTab, isLiveTab, isOwnProfileTab]);

  if (isCheckingAuth) {
    return <LoadingScreen isCheckingAuth={isCheckingAuth} />;
  }

  if (!isAuthenticated) {
    return <UnauthenticatedApp location={location} onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <ReportReasonProvider>
    <div className="h-[100dvh] overflow-hidden bg-gray-50">
      <div className="fixed top-0 left-0 right-0 z-[1] bg-primary" style={{ height: 'var(--eventz-safe-area-top)' }} />
      <Toaster
        position="top-center"
        richColors={false}
        closeButton
        toastOptions={{
          duration: 2500,
          className: '',
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: '16px',
            color: '#1a1a1a',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
            padding: '16px',
            fontSize: 14,
            fontWeight: 500,
          },
          classNames: {
            toast: 'group toast group-[.toaster]:bg-white group-[.toaster]:text-neutral-900 group-[.toaster]:border-neutral-200 group-[.toaster]:shadow-lg',
            description: 'group-[.toast]:text-neutral-500',
            actionButton: 'group-[.toast]:bg-neutral-900 group-[.toast]:text-neutral-50',
            cancelButton: 'group-[.toast]:bg-neutral-100 group-[.toast]:text-neutral-500',
            error: 'group-[.toaster]:border-l-4 group-[.toaster]:border-l-red-500',
            success: 'group-[.toaster]:border-l-4 group-[.toaster]:border-l-black',
            warning: 'group-[.toaster]:border-l-4 group-[.toaster]:border-l-amber-500',
            info: 'group-[.toaster]:border-l-4 group-[.toaster]:border-l-blue-500',
          },
        }}
      />
      <DesktopSidebar />
      <RightRail />
      <div className="h-[100dvh] overflow-hidden max-w-7xl mx-auto lg:max-w-none lg:ml-64 xl:ml-72 xl:mr-80">
        <KeepAliveTabs
          isEventsTab={isEventsTab}
          isFeedTab={isFeedTab}
          isLiveTab={isLiveTab}
          isOwnProfileTab={isOwnProfileTab}
          shouldMountEventsTab={shouldMountEventsTab}
          shouldMountFeedTab={shouldMountFeedTab}
          shouldMountLiveTab={shouldMountLiveTab}
          shouldMountProfileTab={shouldMountProfileTab}
          eventsScrollRef={eventsScrollRef}
          liveScrollRef={liveScrollRef}
          profileScrollRef={profileScrollRef}
          conversations={conversations}
          handleStartConversation={handleStartConversation}
          handleSendMessage={handleSendMessage}
          currentUser={currentUser}
          handleViewPost={handleViewPost}
          handleLogout={handleLogout}
          handleCreateEvent={handleCreateEvent}
          handleEditEvent={handleEditEvent}
          handleStartOrganizerSetup={handleStartOrganizerSetup}
          backgroundLocation={backgroundLocation}
        />
        <div 
          ref={routeScrollRef}
          style={{ display: isKeepAliveTab && !isEventModal && !isPostModal ? 'none' : 'block' }}
          className="h-[100dvh] overflow-y-auto overscroll-behavior-y-contain scrollbar-hide"
        >
          <AppRoutes
            location={location}
            backgroundLocation={backgroundLocation}
            handleLogout={handleLogout}
            handleCreateEvent={handleCreateEvent}
            handleEditEvent={handleEditEvent}
            handleStartOrganizerSetup={handleStartOrganizerSetup}
            handleStartConversation={handleStartConversation}
            handleViewPost={handleViewPost}
          />
        </div>
      </div>
      <BottomNav
        location={location}
        shouldHideBottomNav={shouldHideBottomNav}
        isSearchTab={isSearchTab}
        hasLiveEvents={hasLiveEvents}
      />
    </div>
    </ReportReasonProvider>
  );
}
