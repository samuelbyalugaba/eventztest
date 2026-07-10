import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';

interface LoadingScreenProps {
  isCheckingAuth: boolean;
}

/**
 * App-shell skeleton shown while auth is resolving on cold start.
 * No spinner — renders the same structural chrome the app uses so the
 * transition to the real UI is a seamless swap, not a hard cut.
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
      {/* Safe-area primary strip — matches App.tsx:212 */}
      <div
        className="fixed top-0 left-0 right-0 z-[1] bg-primary"
        style={{ height: 'var(--eventz-safe-area-top)' }}
        aria-hidden="true"
      />

      {/* Events tab shell (default landing route) */}
      <div className="event-discovery-page pb-20">
        <div className="px-3 pb-6 pt-0">
          <div className="sticky top-0 z-50 -mx-3 rounded-b-[24px] bg-gray-50/95 px-3 pb-3 pt-[calc(0.75rem+var(--eventz-safe-area-top))] backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton.Line className="h-6 w-24" />
                <Skeleton.Line className="h-4 w-64 max-w-full" />
              </div>
              <Skeleton.Circle className="h-10 w-10 bg-white" />
            </div>
          </div>

          <div className="mt-2 -mx-3 overflow-hidden px-3 pb-1">
            <div className="flex w-max items-center gap-1.5">
              {[40, 98, 86, 62, 70, 72, 76, 70].map((width, index) => (
                <Skeleton
                  key={`${width}-${index}`}
                  className="h-[1.65rem] shrink-0 rounded-full bg-white"
                  style={{ width }}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <Skeleton.Image className="h-40" />
                <div className="space-y-3 p-4">
                  <Skeleton.Line className="h-5 w-3/4" />
                  <Skeleton.Line className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom nav shell — matches BottomNav visual dimensions */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white/95 backdrop-blur-sm"
        style={{ paddingBottom: 'var(--eventz-safe-area-bottom)' }}
        aria-hidden="true"
      >
        <div className="flex items-center justify-around px-4 py-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton.Circle key={i} className="h-9 w-9" />
          ))}
        </div>
      </div>
    </div>
  );
}
