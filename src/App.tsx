import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './contexts/AuthContext';
import { useMessaging } from './contexts/MessagingContext';
import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';
import { getPosts } from './utils/supabase/api';
import { mapPostsToViewModel } from './utils/postMapper';
import { DesktopSidebar } from './components/desktop/DesktopSidebar';
import { RightRail } from './components/desktop/RightRail';
import LoadingScreen from './components/app/LoadingScreen';
import UnauthenticatedApp from './components/app/UnauthenticatedApp';
import KeepAliveTabs from './components/app/KeepAliveTabs';
import AppRoutes from './components/app/AppRoutes';
import BottomNav from './components/app/BottomNav';
import { ReportReasonProvider } from './contexts/ReportReasonContext';

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

  const handleAuthSuccess = (_token: string, _user: Record<string, unknown>) => {
    navigate('/events', { replace: true });
  };

  const scheduleIdle = (cb: () => void, timeout: number): (() => void) => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      const handle = w.requestIdleCallback(cb, { timeout });
      return () => w.cancelIdleCallback?.(handle);
    }
    const handle = window.setTimeout(cb, Math.min(timeout / 2, 750));
    return () => window.clearTimeout(handle);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const cleanup = scheduleIdle(() => {
      queryClient.prefetchInfiniteQuery({
        queryKey: queryKeys.feed.firstPage(currentUser?.id),
        queryFn: async ({ pageParam }) => {
          const fresh = await getPosts({ currentUserId: currentUser?.id, limit: 20, offset: (pageParam as number) ?? 0 });
          return {
            posts: fresh && fresh.length > 0 ? mapPostsToViewModel(fresh) : [],
            count: fresh?.length ?? 0,
          };
        },
        initialPageParam: 0,
        staleTime: 5 * 60 * 1000,
      });
    }, 500);

    return cleanup;
  }, [isAuthenticated, currentUser?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const cleanup = scheduleIdle(() => {
      void import('./components/MessagesPage');
      void import('./components/EventDetails');
      void import('./components/LiveFeed');
      void import('./components/Feed');
      void import('./components/Profile');
      void import('./components/CreatePostPage');
      void import('./components/DashboardPage');
      void import('./components/WalletPage');
    }, 1500);
    return cleanup;
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
      <div className="fixed top-0 left-0 right-0 z-[1] bg-primary" style={{ height: 'var(--eventz-safe-area-top)' }} aria-hidden="true" />
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
