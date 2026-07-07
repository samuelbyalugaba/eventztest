import { useCallback } from 'react';

export function useFullscreen() {
  return useCallback(async (element: HTMLElement | null) => {
    if (!element) return false;

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitEnterFullscreen) {
        (element as any).webkitEnterFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      }
      return true;
    } catch {
      return false;
    }
  }, []);
}
