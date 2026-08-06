import { useEffect, useState } from 'react';
import {
  EventsPageSkeleton,
  FeedPageSkeleton,
  LivePageSkeleton,
  ProfilePageSkeleton,
} from '../skeletons/PageSkeletons';

interface LoadingScreenProps {
  isCheckingAuth: boolean;
}

/**
 * App-shell skeleton shown while auth is resolving on cold start.
 * Renders the same KeepAliveTabs skeleton layout so the transition
 * to the real UI is a seamless swap, not a hard cut.
 */
export default function LoadingScreen({ isCheckingAuth }: LoadingScreenProps) {
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    if (!isCheckingAuth) {
      setAuthTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setAuthTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [isCheckingAuth]);

  if (authTimedOut) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <p className="text-foreground font-semibold text-lg">Taking longer than expected</p>
          <p className="text-muted-foreground text-sm">Check your connection and try again.</p>
          <button
            onClick={() => { setAuthTimedOut(false); window.location.reload(); }}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50">
      <div
        className="fixed top-0 left-0 right-0 z-[1] bg-primary"
        style={{ height: 'var(--eventz-safe-area-top)' }}
        aria-hidden="true"
      />

      <div
        style={{ display: 'block' }}
        className="h-[100dvh] overflow-y-auto overscroll-behavior-y-contain scrollbar-hide"
        data-eventz-view="events"
      >
        <EventsPageSkeleton />
      </div>
      <div
        style={{ display: 'none' }}
        className="h-[100dvh] overflow-hidden"
        data-eventz-view="feed"
      >
        <FeedPageSkeleton />
      </div>
      <div
        style={{ display: 'none' }}
        className="h-[100dvh] overflow-y-auto overscroll-behavior-y-contain scrollbar-hide"
        data-eventz-view="live"
      >
        <LivePageSkeleton />
      </div>
      <div
        style={{ display: 'none' }}
        className="h-[100dvh] overflow-y-auto overscroll-behavior-y-contain scrollbar-hide"
        data-eventz-view="profile"
      >
        <ProfilePageSkeleton />
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 pb-[var(--eventz-safe-area-bottom)] lg:hidden"
        aria-hidden="true"
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-around h-[4.75rem]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5">
                <div className="h-[1.375rem] w-[1.375rem] rounded-full bg-gray-200 animate-pulse" />
                <div className="h-2.5 w-8 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
