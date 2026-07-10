import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOffline, isLowInternet } = useNetworkStatus();

  if (!isOffline && !isLowInternet) return null;

  return (
    <div
      className="fixed top-[var(--eventz-safe-area-top)] left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-all"
      style={{
        background: isOffline ? '#FEF3C7' : '#EDE9FE',
        color: isOffline ? '#92400E' : '#5B21B6',
      }}
      role="status"
      aria-live="polite"
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>You're offline. Some features may be unavailable.</span>
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5 shrink-0" />
          <span>Slow connection detected. Loading may take longer.</span>
        </>
      )}
    </div>
  );
}
