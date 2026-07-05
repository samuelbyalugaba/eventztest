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
}: ProfileActionsProps) {
  if (isOwnProfile) {
    if (isOrganizer) {
      return (
        <div className="flex gap-2 mb-3.5 px-1">
          <button
            onClick={onCreateEvent}
            className="flex-1 min-h-8 py-1.5 bg-[#7C3AED] text-white rounded-lg font-medium text-[0.72rem] flex items-center justify-center gap-1 hover:bg-[#6D28D9] transition-all active:scale-95 shadow-sm"
          >
            <Plus className="w-3 h-3" />
            Create Event
          </button>
          <button
            onClick={onDashboard}
            className="flex-1 min-h-8 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg font-medium text-[0.72rem] flex items-center justify-center gap-1 hover:bg-gray-50 transition-all active:scale-95"
          >
            <BarChart3 className="w-3 h-3" />
            Dashboard
          </button>
        </div>
      );
    }

    if (!isLoading) {
      return (
        <div
          onClick={onStartOrganizerSetup}
          className="group mb-4 rounded-xl p-3 flex items-center justify-between cursor-pointer border border-gray-100 bg-gradient-to-br from-white to-purple-50/40 hover:to-purple-50/70 hover:border-purple-200/60 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-[2.15rem] h-[2.15rem] flex items-center justify-center transition-all duration-300 group-hover:scale-[1.08]">
              <img
                src={verifiedBadge}
                alt="Creator badge"
                className="w-[1.6rem] h-[1.6rem] object-contain transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-gray-900 font-bold text-[0.82rem] leading-4">Switch to Creator Profile</h3>
              <p className="text-gray-500 text-[0.72rem] leading-4">Go live, host events & grow your audience</p>
            </div>
          </div>
          <div className="text-gray-400 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-gray-500">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      );
    }

    return null;
  }

  // Other user's profile
  return (
    <div className="flex gap-2 mb-3.5 px-1">
      <button
        onClick={onFollow}
        className={`flex-1 min-h-8 py-1.5 rounded-lg font-medium text-[0.72rem] transition-all active:scale-95 ${
          isFollowing
            ? 'bg-gray-100 text-gray-700 border border-gray-200'
            : 'bg-[#7C3AED] text-white shadow-sm'
        }`}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>
      <button
        onClick={onMessage}
        className="flex-1 min-h-8 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg font-medium text-[0.72rem] hover:bg-gray-50 transition-all active:scale-95"
      >
        Message
      </button>
    </div>
  );
}
