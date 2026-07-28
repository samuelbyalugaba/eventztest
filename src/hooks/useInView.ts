import { useEffect, useState, useRef, type RefObject } from 'react';

export function useInView(ref: RefObject<HTMLDivElement | null>, options?: IntersectionObserverInit): boolean {
  const [isInView, setIsInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { rootMargin: '200px', ...options }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [ref, options?.rootMargin, options?.threshold, options?.root]);

  return isInView;
}
