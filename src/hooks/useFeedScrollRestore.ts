import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { Post } from '../types';

export function useFeedScrollRestore(isLoading: boolean, posts: Post[]) {
  const [isRestoringScroll, setIsRestoringScroll] = useState(
    !!sessionStorage.getItem('feedScrollPos') || !!sessionStorage.getItem('feedLastPostId')
  );
  const restoreAttemptedRef = useRef(false);
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const [feedScrollContainer, setFeedScrollContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      const original = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';
      return () => { window.history.scrollRestoration = original; };
    }
  }, []);

  useLayoutEffect(() => {
    if (restoreAttemptedRef.current) return;
    if (isLoading || posts.length === 0) return;

    const savedPos = sessionStorage.getItem('feedScrollPos');
    const lastPostId = sessionStorage.getItem('feedLastPostId');
    const hasRestoreData = (savedPos !== null && savedPos !== '') || (lastPostId !== null && lastPostId !== '');

    if (!hasRestoreData) {
      restoreAttemptedRef.current = true;
      setIsRestoringScroll(false);
      return;
    }

    let rafId = 0;
    const startMs = performance.now();
    const maxWaitMs = 2500;

    const finish = () => {
      sessionStorage.removeItem('feedScrollPos');
      sessionStorage.removeItem('feedLastPostId');
      restoreAttemptedRef.current = true;
      setIsRestoringScroll(false);
    };

    const attempt = () => {
      const scrollEl = feedScrollRef.current;
      const currentLastPostId = sessionStorage.getItem('feedLastPostId');
      const currentSavedPos = sessionStorage.getItem('feedScrollPos');
      const target = currentLastPostId ? document.getElementById(`post-${currentLastPostId}`) : null;

      if (target) {
        if (scrollEl) {
          const scrollRect = scrollEl.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          scrollEl.scrollTop += targetRect.top - scrollRect.top;
        } else {
          const targetRect = target.getBoundingClientRect();
          window.scrollTo(0, window.scrollY + targetRect.top);
        }
        finish();
        return;
      }

      if (currentSavedPos !== null && currentSavedPos !== '') {
        const scrollY = parseInt(currentSavedPos, 10);
        if (!isNaN(scrollY) && scrollY >= 0) {
          if (scrollEl) {
            const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
            if (maxScrollTop >= scrollY) { scrollEl.scrollTop = scrollY; finish(); return; }
          } else {
            const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            if (maxScrollTop >= scrollY) { window.scrollTo(0, scrollY); finish(); return; }
          }
        }
      }

      if (performance.now() - startMs >= maxWaitMs) { finish(); return; }
      rafId = requestAnimationFrame(attempt);
    };

    attempt();
    return () => { cancelAnimationFrame(rafId); };
  }, [isLoading, posts.length]);

  return { isRestoringScroll, feedScrollRef, feedScrollContainer, setFeedScrollContainer };
}
