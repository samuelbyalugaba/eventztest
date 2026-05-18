import { ChevronLeft, Radio } from 'lucide-react';
import { UserAvatar } from '../UserAvatar';

interface ProfileHeaderProps {
  isLoading: boolean;
  profileImage?: string;
  displayName: string;
  username?: string;
  isOwnProfile: boolean;
  isOrganizer: boolean;
  isVerified?: boolean;
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
  isVerified,
  onBack,
  onGoLive,
  sidebarSlot,
}: ProfileHeaderProps) {
  return (
    <div className="mb-5 space-y-4">
      <div className="flex min-h-10 items-center justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-900 transition-colors hover:bg-gray-100 active:bg-gray-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {!onBack && <div className="h-10 w-10" />}

        <div className="flex items-center gap-3">
          {isOwnProfile && sidebarSlot}

          {isOwnProfile && isOrganizer && (
            <button
              onClick={onGoLive}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition-colors hover:bg-red-50 active:bg-red-50"
              title="Go Live"
              aria-label="Go Live"
            >
              <Radio className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-gray-200">
          {isLoading ? (
            <div className="h-full w-full animate-pulse bg-gray-200" />
          ) : (
            <UserAvatar
              src={profileImage}
              name={displayName}
              className="h-full w-full text-2xl"
              size="3xl"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            </div>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-1.5">
                <h1 className="truncate text-xl font-semibold leading-tight text-gray-900">
                  {displayName || 'User'}
                </h1>
                {isVerified && (
                  <img
                    src="/src/assets/verified-badge.png"
                    alt="Creator badge"
                    className="h-4 w-4 flex-shrink-0 object-contain drop-shadow-sm pointer-events-none select-none"
                    style={{ visibility: 'visible', opacity: 1, display: 'inline-block' }}
                    loading="eager"
                    onError={(e) => {
                      console.error('Badge image failed to load:', e);
                      (e.target as any).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <p className="mt-1 truncate text-xs font-medium text-gray-500">
                @{username || 'user'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
