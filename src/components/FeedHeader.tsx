import { useState, useEffect } from 'react';
import { Search, Bell, MessageSquare, LayoutGrid, Users as UsersIcon, Star, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface FeedHeaderProps {
  currentUser?: any;
  showNotifications: boolean;
  showMessages: boolean;
  unreadMessagesCount: number;
  notifications: any[];
  exploreSearch: string;
  setExploreSearch: (value: string) => void;
  activeFilter: 'all' | 'organizers' | 'trending' | 'following';
  setActiveFilter: (filter: 'all' | 'organizers' | 'trending' | 'following') => void;
  onToggleNotifications: () => void;
  onToggleMessages: () => void;
  showMessagesOrPost?: boolean;
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
  showMessagesOrPost = false
}: FeedHeaderProps) {
  const [showExtendedHeader, setShowExtendedHeader] = useState(true);

  useEffect(() => {
    const sentinel = document.getElementById('top-sentinel');
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is intersecting, we are at the top
        const atTop = entry.isIntersecting;
        setShowExtendedHeader(atTop);
      },
      { 
        threshold: 0,
        // Using 0px to ensure it triggers correctly at the very top
        rootMargin: '0px' 
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`bg-white border-b border-gray-100 transition-all duration-300 sticky top-0 ${showMessagesOrPost ? 'z-0' : 'z-50'}`}>
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
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
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
              <Star className="w-4 h-4" />
              Creators
            </button>
            <button
              onClick={() => setActiveFilter('trending')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                activeFilter === 'trending'
                  ? 'bg-[#8A2BE2] text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Trending
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
