import { ChevronLeft, Radio } from 'lucide-react';
import { UserAvatar } from '../UserAvatar';

interface ProfileHeaderProps {
  isLoading: boolean;
  profileImage?: string;
  displayName: string;
  username?: string;
  isOwnProfile: boolean;
  isOrganizer: boolean;
  onBack?: () => void;
  onGoLive: () => void;
  sidebarSlot?: React.ReactNode;
}

export function ProfileHeader({
  isLoading,
  profileImage,
  displayName,
  username,
  isOwnProfile,
  isOrganizer,
  onBack,
  onGoLive,
  sidebarSlot,
}: ProfileHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </button>
        )}
        <div className="w-20 h-20 rounded-full overflow-hidden bg-white ring-1 ring-gray-200">
          {isLoading ? (
            <div className="w-full h-full bg-gray-200 animate-pulse" />
          ) : (
            <UserAvatar
              src={profileImage}
              name={displayName}
              className="w-full h-full text-2xl"
              size="3xl"
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-900 leading-tight">
                {displayName || 'User'}
              </h1>
              <p className="text-gray-500 font-medium text-xs flex items-center gap-1">
                @{username || 'user'}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 items-center">
        {isOwnProfile && sidebarSlot}

        {isOwnProfile && isOrganizer && (
          <button
            onClick={onGoLive}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors border border-red-200 bg-white shadow-sm"
            title="Go Live"
          >
            <Radio className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
