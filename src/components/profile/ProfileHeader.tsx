import { ChevronLeft, Radio } from 'lucide-react';
import { UserAvatar } from '../UserAvatar';
import creatorBadge from '../../assets/verified-badge.png';

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
  const showCreatorBadge = isVerified || isOrganizer;

  if (isOwnProfile) {
    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Back">
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
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-semibold text-gray-900 leading-tight truncate">
                    {displayName || 'User'}
                  </h1>
                  {showCreatorBadge && (
                    <img
                      src={creatorBadge}
                      alt="Creator badge"
                      className="w-4 h-4 object-contain flex-shrink-0 drop-shadow-sm pointer-events-none select-none"
                      style={{ visibility: 'visible', opacity: 1, display: 'inline-block' }}
                      loading="eager"
                      onError={(e) => {
                        console.error('Badge image failed to load:', e);
                        (e.target as any).style.display = 'none';
                      }}
                    />
                  )}
                </div>
                <p className="text-gray-500 font-medium text-xs truncate">
                  @{username || 'user'}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 items-center">
          {sidebarSlot}

          {isOrganizer && (
            <button
              onClick={onGoLive}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors border border-red-200 bg-white shadow-sm"
              title="Go Live"
              aria-label="Go Live"
            >
              <Radio className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

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
                {showCreatorBadge && (
                  <img
                    src={creatorBadge}
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
