import { useEffect, useState } from 'react';

type NetworkConnection = EventTarget & {
  effectiveType?: string;
  saveData?: boolean;
};

export function useNetworkStatus() {
  const [isLowInternet, setIsLowInternet] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection as NetworkConnection | undefined;

    const updateConnection = () => {
      setIsLowInternet(
        connection?.effectiveType === '2g' ||
        connection?.effectiveType === 'slow-2g' ||
        !!connection?.saveData
      );
    };

    if (connection) {
      connection.addEventListener('change', updateConnection);
      updateConnection();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) connection.removeEventListener('change', updateConnection);
    };
  }, []);

  return { isLowInternet, isOffline };
}
