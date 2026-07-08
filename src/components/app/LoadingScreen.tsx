import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  isCheckingAuth: boolean;
}

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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        {authTimedOut ? (
          <div className="space-y-3">
            <p className="text-red-500 font-medium">Taking longer than expected</p>
            <button
              onClick={() => { setAuthTimedOut(false); window.location.reload(); }}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary"
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
