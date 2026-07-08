import { Link } from 'react-router-dom';
import { Calendar, Menu, Radio, Search, User } from 'lucide-react';
import type { Location } from 'react-router-dom';

interface BottomNavProps {
  location: Location;
  shouldHideBottomNav: boolean;
  isSearchTab: boolean;
  hasLiveEvents: boolean;
}

export default function BottomNav({ location, shouldHideBottomNav, isSearchTab, hasLiveEvents }: BottomNavProps) {
  if (shouldHideBottomNav) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 pb-[var(--eventz-safe-area-bottom)] lg:hidden">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-around h-[4.75rem]">
          <Link
            to="/events"
            aria-label="Events"
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors ${
              (location.pathname === '/events' || location.pathname === '/') && !isSearchTab ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <Calendar className="w-[1.375rem] h-[1.375rem]" />
            <span className="text-xs font-medium">Events</span>
          </Link>
          <Link
            to="/live"
            aria-label="Live"
            className={`relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors ${
              location.pathname === '/live' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <Radio className="w-[1.375rem] h-[1.375rem]" />
            <span className="text-xs font-medium">Live</span>
            {hasLiveEvents && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </Link>
          <Link
            to="/search"
            aria-label="Search"
            className={`bottom-search-link relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 px-1 py-1 transition-colors ${
              location.pathname === '/search' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <span className="bottom-search-orb">
              <Search className="h-3.5 w-3.5" />
            </span>
            <span className="bottom-search-label">Search</span>
          </Link>
          <Link
            to="/feed"
            aria-label="Feed"
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors ${
              location.pathname === '/feed' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <Menu className="w-[1.375rem] h-[1.375rem]" />
            <span className="text-xs font-medium">Feed</span>
          </Link>
          <Link
            to="/profile"
            aria-label="Profile"
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors ${
              location.pathname === '/profile' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <User className="w-[1.375rem] h-[1.375rem]" />
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
