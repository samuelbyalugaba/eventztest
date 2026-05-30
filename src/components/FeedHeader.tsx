import { useEffect, useRef } from 'react';
import { Bell, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface FeedHeaderProps {
  currentUser?: any;
  showNotifications: boolean;
  showMessages: boolean;
  unreadMessagesCount: number;
  notifications: any[];
  onToggleNotifications: () => void;
  onToggleMessages: () => void;
  showMessagesOrPost?: boolean;
  /** The element that actually scrolls (feed content). If not set, falls back to window. */
  scrollContainer?: HTMLElement | null;
}

export function FeedHeader({
  currentUser,
  showNotifications,
  showMessages,
  unreadMessagesCount,
  notifications,
  onToggleNotifications,
  onToggleMessages,
  showMessagesOrPost = false,
  scrollContainer
}: FeedHeaderProps) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const headerHeightRef = useRef(0);
  const headerOffsetRef = useRef(0);

  const SCROLL_THRESHOLD_PX = 60;

  const getScrollY = (el: HTMLElement | null | undefined) => {
    if (el) return el.scrollTop;
    if (typeof window === 'undefined') return 0;
    const docEl = document.scrollingElement;
    return docEl ? docEl.scrollTop : window.scrollY ?? document.documentElement.scrollTop ?? 0;
  };

  const applyOffset = (nextOffset: number) => {
    const el = headerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(headerHeightRef.current, nextOffset));
    headerOffsetRef.current = clamped;
    el.style.transform = `translate3d(0, ${-clamped}px, 0)`;
  };

  useEffect(() => {
    lastScrollY.current = getScrollY(scrollContainer ?? undefined);
  }, [scrollContainer]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const update = () => {
      headerHeightRef.current = Math.ceil(el.getBoundingClientRect().height);
      applyOffset(headerOffsetRef.current);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const scrollEl = scrollContainer ?? null;
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(() => {
          const currentScrollY = getScrollY(scrollEl);
          const prev = lastScrollY.current;
          const delta = currentScrollY - prev;
          lastScrollY.current = currentScrollY;

          if (showMessagesOrPost || currentScrollY <= SCROLL_THRESHOLD_PX) {
            applyOffset(0);
            ticking.current = false;
            return;
          }

          if (delta !== 0) {
            applyOffset(headerOffsetRef.current + delta);
          }
          ticking.current = false;
        });
      }
    };

    if (scrollEl) {
      lastScrollY.current = scrollEl.scrollTop;
      scrollEl.addEventListener('scroll', onScroll, { passive: true });
      return () => scrollEl.removeEventListener('scroll', onScroll);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [scrollContainer, showMessagesOrPost]);

  return (
    <div
      id="feed-header"
      ref={headerRef}
      className="bg-white border-b border-gray-100 fixed top-0 left-0 right-0 lg:left-64 xl:left-72 xl:right-80 z-30 transform-gpu will-change-transform"
    >
      <div className="px-3 pt-4 pb-3">
        {/* Brand Section - Always visible */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-gray-900 text-xl font-bold transition-all duration-300">
              <span className='text-purple-600'>Community</span> Explore
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Notifications"
              className={`p-2 rounded-lg transition-colors relative ${showNotifications ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-700'}`}
              onClick={() => {
                if (!currentUser) {
                  toast.error('Sign in to view notifications');
                  return;
                }
                onToggleNotifications();
              }}
            >
              <Bell className={`w-4 h-4 ${showNotifications ? 'text-purple-600' : 'text-gray-700'}`} />
              {/* Notification Badge */}
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>
            <button
              aria-label="Messages"
              className={`p-2 rounded-lg transition-colors relative ${showMessages ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-700'}`}
              onClick={() => {
                if (!currentUser) {
                  toast.error('Sign in to view messages');
                  return;
                }
                onToggleMessages();
              }}
            >
              <MessageSquare className="w-4 h-4 text-gray-700" />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-[#8A2BE2] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
