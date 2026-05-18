import { useState, useEffect, useRef } from 'react';
import { Search, Bell, MessageSquare, LayoutGrid, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import verifiedBadge from '../assets/verified-badge.png';

interface FeedHeaderProps {
  currentUser?: any;
  showNotifications: boolean;
  showMessages: boolean;
  unreadMessagesCount: number;
  notifications: any[];
  exploreSearch: string;
  setExploreSearch: (value: string) => void;
  activeFilter: 'all' | 'organizers' | 'following';
  setActiveFilter: (filter: 'all' | 'organizers' | 'following') => void;
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
  exploreSearch,
  setExploreSearch,
  activeFilter,
  setActiveFilter,
  onToggleNotifications,
  onToggleMessages,
  showMessagesOrPost = false,
  scrollContainer
}: FeedHeaderProps) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [showExtendedHeader, setShowExtendedHeader] = useState(true);
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

  useEffect(() => {
    const sentinel = document.getElementById('top-sentinel');
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const atTop = entry.isIntersecting;
        setShowExtendedHeader(atTop);
      },
      {
        root: scrollContainer ?? null,
        threshold: 0,
        rootMargin: '0px'
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scrollContainer]);

  return (
    <div
      id="feed-header"
      ref={headerRef}
      className="bg-white border-b border-gray-100 fixed top-0 left-0 right-0 lg:left-64 xl:left-72 xl:right-80 z-30 transform-gpu will-change-transform"
    >
      <div className="px-4 pt-5 pb-4">
        {/* Brand Section - Always visible */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-gray-900 text-xl font-bold transition-all duration-300">
              <span className='text-purple-600'>Community</span> Explore
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Notifications"
              className={`p-2.5 rounded-xl transition-colors relative ${showNotifications ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-700'}`}
              onClick={() => {
                if (!currentUser) {
                  toast.error('Sign in to view notifications');
                  return;
                }
                onToggleNotifications();
              }}
            >
              <Bell className={`w-5 h-5 ${showNotifications ? 'text-purple-600' : 'text-gray-700'}`} />
              {/* Notification Badge */}
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>
            <button
              aria-label="Messages"
              className={`p-2.5 rounded-xl transition-colors relative ${showMessages ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-700'}`}
              onClick={() => {
                if (!currentUser) {
                  toast.error('Sign in to view messages');
                  return;
                }
                onToggleMessages();
              }}
            >
              <MessageSquare className="w-5 h-5 text-gray-700" />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-[#8A2BE2] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search and Filters - Animated on scroll */}
        <div className={`overflow-hidden transition-[max-height,opacity,margin-top] duration-200 ease-out ${
          showExtendedHeader ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0 pointer-events-none'
        }`}>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={exploreSearch}
                onChange={(e) => setExploreSearch(e.target.value)}
                placeholder="Search"
                className="w-full pl-11 pr-4 py-3 bg-gray-100/60 hover:bg-gray-100 focus:bg-white border border-transparent rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          {/* Unique Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-[#8A2BE2] text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              All
            </button>
            <button
              onClick={() => setActiveFilter('following')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                activeFilter === 'following'
                  ? 'bg-[#8A2BE2] text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
              }`}
            >
              <UsersIcon className="w-4 h-4" />
              Following
            </button>
            <button
              onClick={() => setActiveFilter('organizers')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                activeFilter === 'organizers'
                  ? 'bg-[#8A2BE2] text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
              }`}
            >
              <img src={verifiedBadge} alt="Creator badge" className="w-4 h-4 object-contain" />
              Creators
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
