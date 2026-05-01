import { useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { AuthScreen } from './components/AuthScreen';
import { Calendar, Radio, User, Rss } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useMessaging } from './contexts/MessagingContext';
import { Toaster } from 'sonner';
import { supabase } from './utils/supabase/client';
import { getPosts } from './utils/supabase/api';
import { formatTimeAgo } from './utils/format';
import { GenericPageSkeleton, FeedPageSkeleton, RouteFallback } from './components/skeletons/PageSkeletons';

// Lazy-loaded heavy pages and route wrappers
const EventDetails = lazy(() => import('./components/EventDetails').then(m => ({ default: m.EventDetails })));
const LiveFeed = lazy(() => import('./components/LiveFeed').then(m => ({ default: m.LiveFeed })));
const Feed = lazy(() => import('./components/Feed').then(m => ({ default: m.Feed })));
const Profile = lazy(() => import('./components/Profile').then(m => ({ default: m.Profile })));
const CreateEventWrapper = lazy(() => import('./components/CreateEventWrapper').then(m => ({ default: m.CreateEventWrapper })));
const PostDetailWrapper = lazy(() => import('./components/PostDetailWrapper').then(m => ({ default: m.PostDetailWrapper })));
const ProfileModalWrapper = lazy(() => import('./components/ProfileModalWrapper').then(m => ({ default: m.ProfileModalWrapper })));
const EventDetailWrapper = lazy(() => import('./components/EventDetailWrapper').then(m => ({ default: m.EventDetailWrapper })));
const CreatePostPage = lazy(() => import('./components/CreatePostPage'));

const FEED_CACHE_KEY = 'eventz-feed-cache-v1';
const FEED_CACHE_TTL_MS = 5 * 60 * 1000;
const isVideoAsset = (url?: string) => {
  if (!url) return false;
  const cleaned = url.split('#')[0].split('?')[0];
  return /\.(mp4|webm|ogg|mov)$/i.test(cleaned);
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const prevTabPathRef = useRef<string | null>(null);
  const prevWasModalRef = useRef(false);
  const {
    user: currentUser,
    isAuthenticated,
    isLoading: isCheckingAuth,
    isOrganizer,
  } = useAuth();

  const {
    conversations,
    onlineFriends,
    hasLiveEvents,
    startConversation: handleStartConversation,
    sendMessage: handleSendMessage,
    markAsRead: handleMarkAsRead,
    deleteConversation: handleDeleteConversation,
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
          if (cached.timestamp && Date.now() - cached.timestamp < FEED_CACHE_TTL_MS) return;
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
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

  const isPostModal = location.pathname.startsWith('/post/') && location.state?.backgroundLocation;
  const isEventModal = location.pathname.startsWith('/event/') && location.state?.backgroundLocation;
  const shouldHideBottomNav = location.pathname.startsWith('/create') ||
    location.pathname.startsWith('/edit-event') ||
    (location.pathname.startsWith('/post') && !isPostModal) ||
    (location.pathname.startsWith('/event/') && !isEventModal);

  const backgroundLocation = location.state?.backgroundLocation;
  const effectiveLocation = backgroundLocation || location;
  const effectivePath = effectiveLocation.pathname;
  const isEventsTab = effectivePath === '/events' || effectivePath === '/';
  const isFeedTab = effectivePath === '/feed';
  const isLiveTab = effectivePath === '/live';
  const isOwnProfileTab = effectivePath === '/profile';

  // Restore scroll on tab change
  useEffect(() => {
    const isModal =
      !!(location.state as any)?.backgroundLocation &&
      (location.pathname.startsWith('/post/') ||
        location.pathname.startsWith('/profile') ||
        location.pathname.startsWith('/event/'));
    const isTabPath = (p: string) => p === '/events' || p === '/live' || p === '/profile';
    const prevPath = prevTabPathRef.current;
    if (prevPath && !prevWasModalRef.current && isTabPath(prevPath)) {
      sessionStorage.setItem(`eventz_tab_scroll_${prevPath}`, String(window.scrollY));
    }
    if (!isModal && isTabPath(location.pathname)) {
      const saved = sessionStorage.getItem(`eventz_tab_scroll_${location.pathname}`);
      if (saved !== null) {
        const y = Number(saved) || 0;
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
    }
    prevTabPathRef.current = location.pathname;
    prevWasModalRef.current = isModal;
  }, [location.key, location.pathname, (location.state as any)?.backgroundLocation]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#8A2BE2]/30 border-t-[#8A2BE2] rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading EVENTZ...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-center" richColors={false} closeButton />
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster
        position="top-center"
        richColors={false}
        closeButton
        toastOptions={{
          className: 'font-sans',
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: '16px',
            color: '#1a1a1a',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
            padding: '16px',
            fontSize: '14px',
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
      <div className={`max-w-7xl mx-auto ${shouldHideBottomNav ? 'pb-20' : 'pb-[calc(5rem+env(safe-area-inset-bottom))]'}`}>
        {/* Keep-alive tab views with lazy loading */}
        <div style={{ display: isEventsTab ? 'block' : 'none' }}>
          <Suspense fallback={<GenericPageSkeleton />}>
            <EventDetails
              conversations={conversations}
              onStartConversation={handleStartConversation}
              onSendMessage={handleSendMessage}
            />
          </Suspense>
        </div>
        <div style={{ display: isFeedTab ? 'block' : 'none' }}>
          <Suspense fallback={<FeedPageSkeleton />}>
            <Feed
              conversations={conversations}
              onStartConversation={handleStartConversation}
              onSendMessage={handleSendMessage}
              onMarkAsRead={handleMarkAsRead}
              onlineUsers={onlineFriends}
              onDeleteConversation={handleDeleteConversation}
              currentUser={currentUser}
              isOrganizer={isOrganizer}
              onCreateEvent={handleCreateEvent}
              onViewPost={handleViewPost}
              isPaused={!isFeedTab || !!backgroundLocation}
            />
          </Suspense>
        </div>
        <div style={{ display: isLiveTab ? 'block' : 'none' }}>
          <Suspense fallback={<GenericPageSkeleton />}>
            <LiveFeed isPaused={!isLiveTab || !!backgroundLocation} />
          </Suspense>
        </div>
        <div style={{ display: isOwnProfileTab ? 'block' : 'none' }}>
          <Suspense fallback={<GenericPageSkeleton />}>
            <Profile
              onLogout={handleLogout}
              onCreateEvent={handleCreateEvent}
              onEditEvent={handleEditEvent}
              onStartOrganizerSetup={handleStartOrganizerSetup}
              onViewPost={handleViewPost}
              isPaused={!isOwnProfileTab || !!backgroundLocation}
            />
          </Suspense>
        </div>

        <Routes location={backgroundLocation || location}>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/events" element={null} />
          <Route path="/feed" element={null} />
          <Route path="/live" element={null} />
          <Route path="/profile" element={null} />
          <Route path="/profile/:userId" element={
            <Suspense fallback={<GenericPageSkeleton />}>
              <Profile
                onLogout={handleLogout}
                onCreateEvent={handleCreateEvent}
                onEditEvent={handleEditEvent}
                onStartOrganizerSetup={handleStartOrganizerSetup}
                onViewPost={handleViewPost}
                isPaused={!!backgroundLocation}
              />
            </Suspense>
          } />
          <Route path="/create" element={
            <Suspense fallback={<RouteFallback />}><CreateEventWrapper /></Suspense>
          } />
          <Route path="/edit-event/:id" element={
            <Suspense fallback={<RouteFallback />}><CreateEventWrapper /></Suspense>
          } />
          <Route path="/post/:id" element={
            <Suspense fallback={<RouteFallback />}><PostDetailWrapper /></Suspense>
          } />
          <Route path="/event/:id" element={
            <Suspense fallback={<RouteFallback />}><EventDetailWrapper onStartConversation={handleStartConversation} /></Suspense>
          } />
          <Route path="/live/:id" element={
            <Suspense fallback={<RouteFallback />}><EventDetailWrapper onStartConversation={handleStartConversation} /></Suspense>
          } />
          <Route path="/compose/post" element={
            <Suspense fallback={<RouteFallback />}><CreatePostPage /></Suspense>
          } />
        </Routes>
      </div>

      {backgroundLocation && (
        <Routes>
          <Route path="/post/:id" element={
            <Suspense fallback={<RouteFallback />}><PostDetailWrapper /></Suspense>
          } />
          <Route path="/event/:id" element={
            <Suspense fallback={<RouteFallback />}><EventDetailWrapper onStartConversation={handleStartConversation} /></Suspense>
          } />
          <Route path="/profile" element={
            <Suspense fallback={<RouteFallback />}>
              <ProfileModalWrapper
                onLogout={handleLogout}
                onCreateEvent={handleCreateEvent}
                onEditEvent={handleEditEvent}
                onStartOrganizerSetup={handleStartOrganizerSetup}
                onViewPost={handleViewPost}
              />
            </Suspense>
          } />
          <Route path="/profile/:userId" element={
            <Suspense fallback={<RouteFallback />}>
              <ProfileModalWrapper
                onLogout={handleLogout}
                onCreateEvent={handleCreateEvent}
                onEditEvent={handleEditEvent}
                onStartOrganizerSetup={handleStartOrganizerSetup}
                onViewPost={handleViewPost}
              />
            </Suspense>
          } />
        </Routes>
      )}

      {!shouldHideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-7xl mx-auto px-2 sm:px-4">
            <div className="flex justify-around items-center h-16">
              <Link
                to="/events"
                className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-2 transition-colors ${
                  location.pathname === '/events' || location.pathname === '/' ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <Calendar className="w-6 h-6" />
                <span className="text-xs">Events</span>
              </Link>
              <Link
                to="/live"
                className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-2 transition-colors relative ${
                  location.pathname === '/live' ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <Radio className="w-6 h-6" />
                <span className="text-xs">Live</span>
                {hasLiveEvents && (
                  <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </Link>
              <Link
                to="/feed"
                className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-2 transition-colors ${
                  location.pathname === '/feed' ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <Rss className="w-6 h-6" />
                <span className="text-xs">Feed</span>
              </Link>
              <Link
                to="/profile"
                className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-2 transition-colors ${
                  location.pathname === '/profile' ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <User className="w-6 h-6" />
                <span className="text-xs">Profile</span>
              </Link>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
