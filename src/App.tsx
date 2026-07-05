import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { AuthScreen } from './components/AuthScreen';
import { Calendar, Menu, Radio, Search, User } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useMessaging } from './contexts/MessagingContext';
import { Toaster } from 'sonner';
import { getPosts } from './utils/supabase/api';
import { formatTimeAgo } from './utils/format';
import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';
import {
  CreatePageSkeleton,
  DashboardPageSkeleton,
  DetailPageSkeleton,
  EventsPageSkeleton,
  FeedPageSkeleton,
  ListPageSkeleton,
  LivePageSkeleton,
  MessagesPageSkeleton,
  ProfilePageSkeleton,
} from './components/skeletons/PageSkeletons';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { DesktopSidebar } from './components/desktop/DesktopSidebar';
import { RightRail } from './components/desktop/RightRail';
import { LegalPage } from './components/legal/LegalPage';
import { DeleteAccountPage } from './components/legal/DeleteAccountPage';
import { SupportPage } from './components/support/SupportPage';
import { HostedPage } from './components/profile/HostedPage';
import { AuthCallbackPage } from './components/AuthCallbackPage';

// Lazy-loaded heavy pages and route wrappers
const EventDetails = lazy(() => import('./components/EventDetails').then(m => ({ default: m.EventDetails })));
const LiveFeed = lazy(() => import('./components/LiveFeed').then(m => ({ default: m.LiveFeed })));
const Feed = lazy(() => import('./components/Feed').then(m => ({ default: m.Feed })));
const Profile = lazy(() => import('./components/Profile').then(m => ({ default: m.Profile })));
const ProfileListPage = lazy(() => import('./components/profile/ProfileListPage').then(m => ({ default: m.ProfileListPage })));
const CreateEventWrapper = lazy(() => import('./components/CreateEventWrapper').then(m => ({ default: m.CreateEventWrapper })));
const PostDetailWrapper = lazy(() => import('./components/PostDetailWrapper').then(m => ({ default: m.PostDetailWrapper })));
const ProfileModalWrapper = lazy(() => import('./components/ProfileModalWrapper').then(m => ({ default: m.ProfileModalWrapper })));
const EventDetailWrapper = lazy(() => import('./components/EventDetailWrapper').then(m => ({ default: m.EventDetailWrapper })));
const LiveStreamPage = lazy(() => import('./components/LiveStreamPage').then(m => ({ default: m.LiveStreamPage })));
const CreatePostPage = lazy(() => import('./components/CreatePostPage'));
const MessagesPage = lazy(() => import('./components/MessagesPage'));
const DashboardPage = lazy(() => import('./components/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SearchPage = lazy(() => import('./components/SearchPage').then(m => ({ default: m.SearchPage })));
const WalletPage = lazy(() => import('./components/WalletPage').then(m => ({ default: m.WalletPage })));

const FEED_CACHE_KEY = 'eventz-feed-cache-v1';
const FEED_CACHE_TTL_MS = 5 * 60 * 1000;
const isVideoAsset = (url?: string) => {
  if (!url) return false;
  const cleaned = url.split('#')[0].split('?')[0];
  return /\.(mp4|webm|ogg|ogv|mov|m4v|hevc|3gp|3gpp)$/i.test(cleaned);
};

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

  // Prefetch feed on idle for instant tab switch
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
              thumbnail: (p.image_urls?.find((url: string) => !isVideoAsset(url))) || 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=300&h=500&fit=crop',
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
      } catch {/* silent */}
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
    } catch {/* silent */}
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

  // Refs to manage scroll position of each tab
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const liveScrollRef = useRef<HTMLDivElement>(null);
  const profileScrollRef = useRef<HTMLDivElement>(null);
  const routeScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top on actual tab/page switches, but keep the list position when
  // opening modal routes over the current tab.
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
      
      // Also reset window scroll just in case something is using it
      window.scrollTo(0, 0);
    }
    prevTabPathRef.current = effectivePath;
  }, [effectivePath, isEventsTab, isLiveTab, isOwnProfileTab]);

  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    if (!isCheckingAuth) {
      setAuthTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setAuthTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [isCheckingAuth]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#8A2BE2]/30 border-t-[#8A2BE2] rounded-full animate-spin mx-auto" />
          {authTimedOut ? (
            <div className="space-y-3">
              <p className="text-red-500 font-medium">Taking longer than expected</p>
              <button
                onClick={() => { setAuthTimedOut(false); window.location.reload(); }}
                className="rounded-full bg-[#8A2BE2] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#7C3AED]"
              >
                Retry
              </button>
            </div>
          ) : (
            <p className="text-gray-600 font-medium">Loading EVENTZ...</p>
          )}
        </div>
      </div>
    );
  }

  if (!isAuthenticated && location.pathname === '/auth/callback') {
    return (
      <div className="h-[100dvh] overflow-y-auto bg-gray-50">
        <Toaster position="top-center" richColors={false} closeButton toastOptions={{ duration: 2500 }} />
        <AuthCallbackPage />
      </div>
    );
  }

  if (!isAuthenticated && (location.pathname === '/privacy' || location.pathname === '/terms' || location.pathname === '/delete-account')) {
    return (
      <div className="h-[100dvh] overflow-y-auto bg-gray-50">
        <Toaster position="top-center" richColors={false} closeButton toastOptions={{ duration: 2500 }} />
        {location.pathname === '/delete-account'
          ? <DeleteAccountPage />
          : <LegalPage type={location.pathname === '/privacy' ? 'privacy' : 'terms'} />}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-[100dvh] overflow-y-auto bg-gray-50">
        <Toaster position="top-center" richColors={false} closeButton toastOptions={{ duration: 2500 }} />
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50">
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
        {/* Keep-alive tab views with lazy loading */}
        <div 
          ref={eventsScrollRef}
          style={{ display: isEventsTab ? 'block' : 'none' }}
          className="h-[100dvh] overflow-y-auto overscroll-behavior-y-contain scrollbar-hide"
          data-eventz-view="events"
        >
          {shouldMountEventsTab && (
            <RouteErrorBoundary>
              <Suspense fallback={<EventsPageSkeleton />}>
                <EventDetails
                  conversations={conversations}
                  onStartConversation={handleStartConversation}
                  onSendMessage={handleSendMessage}
                />
              </Suspense>
            </RouteErrorBoundary>
          )}
        </div>
        <div style={{ display: isFeedTab ? 'block' : 'none' }} className="h-[100dvh] overflow-hidden" data-eventz-view="feed">
          {shouldMountFeedTab && (
            <RouteErrorBoundary>
              <Suspense fallback={<FeedPageSkeleton />}>
                <Feed
                  conversations={conversations}
                  onStartConversation={handleStartConversation}
                  currentUser={currentUser}
                  onViewPost={handleViewPost}
                  isPaused={!isFeedTab || !!backgroundLocation}
                />
              </Suspense>
            </RouteErrorBoundary>
          )}
        </div>
        <div 
          ref={liveScrollRef}
          style={{ display: isLiveTab ? 'block' : 'none' }}
          className="h-[100dvh] overflow-y-auto overscroll-behavior-y-contain scrollbar-hide"
          data-eventz-view="live"
        >
          {shouldMountLiveTab && (
            <Suspense fallback={<LivePageSkeleton />}>
              <LiveFeed />
            </Suspense>
          )}
        </div>
        <div 
          ref={profileScrollRef}
          style={{ display: isOwnProfileTab ? 'block' : 'none' }}
          className="h-[100dvh] overflow-y-auto overscroll-behavior-y-contain scrollbar-hide"
          data-eventz-view="profile"
        >
          {shouldMountProfileTab && (
            <RouteErrorBoundary>
              <Suspense fallback={<ProfilePageSkeleton />}>
                <Profile
                  onLogout={handleLogout}
                  onCreateEvent={handleCreateEvent}
                  onEditEvent={handleEditEvent}
                  onStartOrganizerSetup={handleStartOrganizerSetup}
                  onStartConversation={handleStartConversation}
                  onViewPost={handleViewPost}
                  isPaused={!isOwnProfileTab || !!backgroundLocation}
                />
              </Suspense>
            </RouteErrorBoundary>
          )}
        </div>

        <div 
          ref={routeScrollRef}
          style={{ display: isKeepAliveTab ? 'none' : 'block' }}
          className="h-[100dvh] overflow-y-auto overscroll-behavior-y-contain scrollbar-hide"
        >
          <Routes location={backgroundLocation || location}>
            <Route path="/" element={<Navigate to="/events" replace />} />
            <Route path="/events" element={null} />
            <Route path="/feed" element={null} />
            <Route path="/live" element={null} />
            <Route path="/profile" element={null} />
            <Route path="/hosted" element={
              <Suspense fallback={<ListPageSkeleton />}><HostedPage /></Suspense>
            } />
            <Route path="/followers" element={
              <Suspense fallback={<ListPageSkeleton />}><ProfileListPage type="followers" /></Suspense>
            } />
            <Route path="/following" element={
              <Suspense fallback={<ListPageSkeleton />}><ProfileListPage type="following" /></Suspense>
            } />
            <Route path="/profile/:userId" element={
              <RouteErrorBoundary>
                <Suspense fallback={<ProfilePageSkeleton />}>
                  <Profile
                    onLogout={handleLogout}
                    onCreateEvent={handleCreateEvent}
                    onEditEvent={handleEditEvent}
                    onStartOrganizerSetup={handleStartOrganizerSetup}
                    onStartConversation={handleStartConversation}
                    onViewPost={handleViewPost}
                    isPaused={!!backgroundLocation}
                  />
                </Suspense>
              </RouteErrorBoundary>
            } />
            <Route path="/profile/:userId/hosted" element={
              <Suspense fallback={<ListPageSkeleton />}><HostedPage /></Suspense>
            } />
            <Route path="/profile/:userId/followers" element={
              <Suspense fallback={<ListPageSkeleton />}><ProfileListPage type="followers" /></Suspense>
            } />
            <Route path="/profile/:userId/following" element={
              <Suspense fallback={<ListPageSkeleton />}><ProfileListPage type="following" /></Suspense>
            } />
            <Route path="/create" element={
              <Suspense fallback={<CreatePageSkeleton />}><CreateEventWrapper /></Suspense>
            } />
            <Route path="/edit-event/:id" element={
              <Suspense fallback={<CreatePageSkeleton />}><CreateEventWrapper /></Suspense>
            } />
            <Route path="/post/:id" element={
              <RouteErrorBoundary>
                <Suspense fallback={<DetailPageSkeleton />}><PostDetailWrapper /></Suspense>
              </RouteErrorBoundary>
            } />
            <Route path="/event/:id" element={
              <RouteErrorBoundary>
                <Suspense fallback={<DetailPageSkeleton />}><EventDetailWrapper onStartConversation={handleStartConversation} /></Suspense>
              </RouteErrorBoundary>
            } />
            <Route path="/live/:id" element={
              <Suspense fallback={<LivePageSkeleton />}><LiveStreamPage /></Suspense>
            } />
            <Route path="/search" element={
              <RouteErrorBoundary>
                <Suspense fallback={<div className="flex h-[100dvh] items-center justify-center bg-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" /></div>}>
                  <SearchPage />
                </Suspense>
              </RouteErrorBoundary>
            } />
            <Route path="/messages" element={
              <RouteErrorBoundary>
                <Suspense fallback={<MessagesPageSkeleton />}><MessagesPage /></Suspense>
              </RouteErrorBoundary>
            } />
            <Route path="/messages/:conversationId" element={
              <RouteErrorBoundary>
                <Suspense fallback={<MessagesPageSkeleton />}><MessagesPage /></Suspense>
              </RouteErrorBoundary>
            } />
            <Route path="/dashboard" element={
              <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
            } />
            <Route path="/dashboard/events" element={
              <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
            } />
            <Route path="/dashboard/live" element={
              <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
            } />
            <Route path="/dashboard/notify" element={
              <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
            } />
            <Route path="/dashboard/payouts" element={
              <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
            } />
            <Route path="/wallet" element={
              <Suspense fallback={<DashboardPageSkeleton />}><WalletPage /></Suspense>
            } />
            <Route path="/compose/post" element={
              <Suspense fallback={<CreatePageSkeleton />}><CreatePostPage /></Suspense>
            } />
            <Route path="/privacy" element={<LegalPage type="privacy" />} />
            <Route path="/terms" element={<LegalPage type="terms" />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/delete-account" element={<DeleteAccountPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
          </Routes>
        </div>
      </div>

      {backgroundLocation && (
        <Routes>
          <Route path="/post/:id" element={
            <Suspense fallback={<DetailPageSkeleton />}><PostDetailWrapper /></Suspense>
          } />
          <Route path="/event/:id" element={
            <Suspense fallback={<DetailPageSkeleton />}><EventDetailWrapper onStartConversation={handleStartConversation} /></Suspense>
          } />
          <Route path="/profile" element={
            <Suspense fallback={<ProfilePageSkeleton />}>
              <ProfileModalWrapper
                onLogout={handleLogout}
                onCreateEvent={handleCreateEvent}
                onEditEvent={handleEditEvent}
                onStartOrganizerSetup={handleStartOrganizerSetup}
                onStartConversation={handleStartConversation}
                onViewPost={handleViewPost}
              />
            </Suspense>
          } />
          <Route path="/profile/:userId" element={
            <Suspense fallback={<ProfilePageSkeleton />}>
              <ProfileModalWrapper
                onLogout={handleLogout}
                onCreateEvent={handleCreateEvent}
                onEditEvent={handleEditEvent}
                onStartOrganizerSetup={handleStartOrganizerSetup}
                onStartConversation={handleStartConversation}
                onViewPost={handleViewPost}
              />
            </Suspense>
          } />
        </Routes>
      )}

      {!shouldHideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 pb-[var(--eventz-safe-area-bottom)] lg:hidden">
          <div className="max-w-7xl mx-auto px-2 sm:px-4">
            <div className="flex items-center justify-around h-[4.75rem]">
              <Link
                to="/events"
                className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors ${
                  (location.pathname === '/events' || location.pathname === '/') && !isSearchTab ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <Calendar className="w-[1.375rem] h-[1.375rem]" />
                <span className="text-xs font-medium">Events</span>
              </Link>
              <Link
                to="/live"
                className={`relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors ${
                  location.pathname === '/live' ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <Radio className="w-[1.375rem] h-[1.375rem]" />
                <span className="text-xs font-medium">Live</span>
                {hasLiveEvents && (
                  <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </Link>
              <Link
                to="/search"
                aria-label="Search"
                className={`bottom-search-link relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 px-1 py-1 transition-colors ${
                  location.pathname === '/search' ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <span className="bottom-search-orb">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <span className="bottom-search-label">Search</span>
              </Link>
              <Link
                to="/feed"
                className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors ${
                  location.pathname === '/feed' ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <Menu className="w-[1.375rem] h-[1.375rem]" />
                <span className="text-xs font-medium">Feed</span>
              </Link>
              <Link
                to="/profile"
                className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors ${
                  location.pathname === '/profile' ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <User className="w-[1.375rem] h-[1.375rem]" />
                <span className="text-xs font-medium">Profile</span>
              </Link>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
