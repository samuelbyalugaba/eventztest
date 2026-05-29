import { Plus, BarChart3, ChevronRight, ShieldAlert, Ban } from 'lucide-react';
import verifiedBadge from '../../assets/verified-badge.png';

interface ProfileActionsProps {
  isOwnProfile: boolean;
  isOrganizer: boolean;
  isLoading: boolean;
  isFollowing: boolean;
  onCreateEvent?: () => void;
  onDashboard: () => void;
  onStartOrganizerSetup?: () => void;
  onFollow: () => void;
  onMessage: () => void;
  onReport?: () => void;
  onBlock?: () => void;
  isMessaging?: boolean;
}

export function ProfileActions({
  isOwnProfile,
  isOrganizer,
  isLoading,
  isFollowing,
  onCreateEvent,
  onDashboard,
  onStartOrganizerSetup,
  onFollow,
  onMessage,
  onReport,
  onBlock,
  isMessaging = false,
}: ProfileActionsProps) {
  if (isOwnProfile) {
    if (isOrganizer) {
      return (
        <div className="flex gap-2.5 mb-4 px-1">
          <button
            onClick={onCreateEvent}
            className="flex-1 py-2 bg-[#8A2BE2] text-white rounded-lg font-medium text-[11px] flex items-center justify-center gap-1.5 hover:bg-[#7a26c9] transition-all active:scale-95 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Event
          </button>
          <button
            onClick={onDashboard}
            className="flex-1 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-all active:scale-95"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Dashboard
          </button>
        </div>
      );
    }

    if (!isLoading) {
      return (
        <div
          onClick={onStartOrganizerSetup}
          className="group mb-5 rounded-xl p-3 flex items-center justify-between cursor-pointer border border-gray-100 bg-gradient-to-br from-white to-purple-50/40 hover:to-purple-50/70 hover:border-purple-200/60 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center transition-all duration-300 group-hover:scale-[1.08]">
              <img
                src={verifiedBadge}
                alt="Creator badge"
                className="w-7 h-7 object-contain transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-gray-900 font-bold text-sm">Switch to Creator Profile</h3>
              <p className="text-gray-500 text-[13px] leading-snug">Go live, host events & grow your audience</p>
            </div>
          </div>
          <div className="text-gray-400 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-gray-500">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      );
    }

    return null;
  }

  // Other user's profile
  return (
    <div className="mb-4 px-1">
      <div className="flex gap-2.5">
        <button
          onClick={onFollow}
          className={`flex-1 py-2 rounded-lg font-medium text-[11px] transition-all active:scale-95 ${
            isFollowing
              ? 'bg-gray-100 text-gray-700 border border-gray-200'
              : 'bg-[#8A2BE2] text-white shadow-sm'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
        <button
          onClick={onMessage}
          disabled={isMessaging}
          aria-busy={isMessaging}
          className="flex-1 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg font-medium text-[11px] hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-60 disabled:active:scale-100"
        >
          Message
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onReport}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 text-[11px] font-medium text-gray-600 active:scale-95"
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Report
        </button>
        <button
          type="button"
          onClick={onBlock}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-white py-2 text-[11px] font-medium text-red-600 active:scale-95"
        >
          <Ban className="h-3.5 w-3.5" />
          Block
        </button>
      </div>
    </div>
  );
}
