import { useEffect, useState } from 'react';

type NetworkConnection = EventTarget & {
  effectiveType?: string;
  saveData?: boolean;
};

export function useNetworkStatus() {
  const [isLowInternet, setIsLowInternet] = useState(false);

  useEffect(() => {
    const connection = (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection as NetworkConnection | undefined;

    if (!connection) return;

    const updateConnection = () => {
      setIsLowInternet(
        connection.effectiveType === '2g' ||
        connection.effectiveType === 'slow-2g' ||
        !!connection.saveData
      );
    };

    connection.addEventListener('change', updateConnection);
    updateConnection();
    return () => connection.removeEventListener('change', updateConnection);
  }, []);

  return { isLowInternet };
}
