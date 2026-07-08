import { MoreHorizontal, Flag } from 'lucide-react';
import { BackButton } from '../ui/BackButton';
import { UserAvatar } from '../UserAvatar';
import type { Profile } from '../../utils/supabase/api';

interface ChatHeaderProps {
  recipient: Profile;
  isOnline?: boolean;
  onBack: () => void;
  onViewProfile?: () => void;
  offsetTop: number;
  showMenu: boolean;
  onToggleMenu: () => void;
  onBlockUser: () => void;
  onReportUser: () => void;
  onViewProfileFromMenu: () => void;
}

export function ChatHeader({
  recipient,
  isOnline,
  onBack,
  onViewProfile,
  offsetTop,
  showMenu,
  onToggleMenu,
  onBlockUser,
  onReportUser,
  onViewProfileFromMenu,
}: ChatHeaderProps) {
  return (
    <div
      className="fixed left-0 right-0 px-4 border-b border-gray-100 flex items-center justify-between bg-white z-20"
      style={{
        top: offsetTop,
        height: 'calc(3.5rem + var(--eventz-safe-area-top))',
        paddingTop: 'var(--eventz-safe-area-top)',
      }}
    >
      <div className="flex items-center gap-3">
        <BackButton
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          iconClassName="w-6 h-6 text-gray-900"
          onClick={onBack}
        />

        <button
          type="button"
          onClick={onViewProfile}
          aria-label="View profile"
          className="relative shrink-0 rounded-full focus:outline-none"
        >
          <UserAvatar
            src={recipient.avatar_url}
            name={recipient.full_name || recipient.username}
            className="w-10 h-10 rounded-full"
          />
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={onViewProfile}
          className="min-w-0 text-left focus:outline-none"
        >
          <div className="flex min-w-0 items-center gap-1">
            <h2 className="truncate text-base font-bold text-gray-900">
              {recipient.full_name || recipient.username}
            </h2>
            {recipient.verified && (
              <svg className="h-3.5 w-3.5 shrink-0 fill-current text-blue-500" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <p className="truncate text-xs text-gray-500">
            @{recipient.username?.replace(/^@/, '')} - {isOnline ? 'Active now' : 'Offline'}
          </p>
        </button>
      </div>

      <div className="relative">
        <button
          onClick={onToggleMenu}
          aria-label="Conversation options"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <MoreHorizontal className="w-6 h-6 text-gray-900" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={onViewProfileFromMenu}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              View Profile
            </button>
            <button
              onClick={onBlockUser}
              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              Block User
            </button>
            <button
              onClick={onReportUser}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Flag className="w-4 h-4" />
              Report User
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
