import { Plus, BarChart3, ChevronRight } from 'lucide-react';
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
  isMessaging = false,
}: ProfileActionsProps) {
  if (isOwnProfile) {
    if (isOrganizer) {
      return (
        <div className="flex gap-3 mb-6 px-1">
          <button
            onClick={onCreateEvent}
            className="flex-1 py-2.5 bg-[#8A2BE2] text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2 hover:bg-[#7a26c9] transition-all active:scale-95 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
          <button
            onClick={onDashboard}
            className="flex-1 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium text-xs flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-95"
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      );
    }

    if (!isLoading) {
      return (
        <div
          onClick={onStartOrganizerSetup}
          className="group mb-8 rounded-2xl p-3 flex items-center justify-between cursor-pointer border border-gray-100 bg-gradient-to-br from-white to-purple-50/40 hover:to-purple-50/70 hover:border-purple-200/60 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center transition-all duration-300 group-hover:scale-[1.08]">
              <img
                src={verifiedBadge}
                alt="Creator badge"
                className="w-8 h-8 object-contain transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-gray-900 font-bold text-sm">Become a Creator</h3>
              <p className="text-gray-500 text-xs leading-snug">Go live, host events & grow your audience</p>
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
    <div className="flex gap-3 mb-6 px-1">
      <button
        onClick={onFollow}
        className={`flex-1 py-2.5 rounded-xl font-medium text-xs transition-all active:scale-95 ${
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
        className="flex-1 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium text-xs hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-60 disabled:active:scale-100"
      >
        Message
      </button>
    </div>
  );
}
