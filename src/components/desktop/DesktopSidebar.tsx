import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Radio, Rss, User, Plus, LogOut } from 'lucide-react';
import { UserAvatar } from '../UserAvatar';
import { useAuth } from '../../contexts/AuthContext';
import { useMessaging } from '../../contexts/MessagingContext';
import { supabase } from '../../utils/supabase/client';

const navItems = [
  { to: '/events', label: 'Events', icon: Calendar, match: (p: string) => p === '/events' || p === '/' },
  { to: '/live', label: 'Live', icon: Radio, match: (p: string) => p === '/live', live: true },
  { to: '/feed', label: 'Feed', icon: Rss, match: (p: string) => p === '/feed' },
  { to: '/profile', label: 'Profile', icon: User, match: (p: string) => p === '/profile' },
];

export function DesktopSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { hasLiveEvents } = useMessaging();

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); navigate('/events'); } catch { /* silent */ }
  };

  return (
    <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 xl:w-72 flex-col border-r border-gray-200/70 bg-white/80 backdrop-blur-xl z-30">
      <div className="px-6 pt-7 pb-6">
        <Link to="/events" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <span className="text-white font-bold tracking-tight">E</span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-[#1A1A1A]">Eventz</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(item => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                active
                  ? 'bg-gray-100 text-[#1A1A1A]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#1A1A1A]'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#8A2BE2]" />
              )}
              <Icon className={`w-5 h-5 ${active ? 'text-[#1A1A1A]' : 'text-gray-500 group-hover:text-[#1A1A1A]'}`} />
              <span className="text-sm font-medium">{item.label}</span>
              {item.live && hasLiveEvents && (
                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}

        <button
          onClick={() => navigate('/create')}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#2a2a2a] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create
        </button>
      </nav>

      {user && (() => {
        const meta: any = user.user_metadata || {};
        const displayName: string = profile?.full_name || profile?.username || meta.full_name || meta.name || meta.username || (user.email ? user.email.split('@')[0] : 'User');
        const username: string = profile?.username || meta.username || (user.email ? user.email.split('@')[0] : 'user');
        const avatarUrl: string | undefined = profile?.avatar_url || meta.avatar_url || meta.picture;
        return (
        <div className="p-3 border-t border-gray-200/70">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            <UserAvatar src={avatarUrl} name={displayName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#1A1A1A] truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">@{username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 hover:text-[#1A1A1A] hover:bg-gray-100 transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        );
      })()}
    </aside>
  );
}
