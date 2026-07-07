import { useCallback } from 'react';

export function useHaptic(duration = 10) {
  return useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }, [duration]);
}
