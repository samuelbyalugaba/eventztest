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
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Back">
              <ChevronLeft className="w-5 h-5 text-gray-900" />
            </button>
          )}
          <div className="w-16 h-16 rounded-full overflow-hidden bg-white ring-1 ring-gray-200">
            {isLoading ? (
              <div className="w-full h-full bg-gray-200 animate-pulse" />
            ) : (
              <UserAvatar
                src={profileImage}
                name={displayName}
                className="w-full h-full text-xl"
                size="2xl"
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
                <div className="flex min-w-0 items-center gap-1.5">
                  <h1 className="min-w-0 flex-none max-w-[calc(100%-1.375rem)] whitespace-normal break-words text-xl font-semibold leading-snug text-gray-900">
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
                <p className="text-gray-500 font-medium text-sm truncate">
                  @{username || 'user'}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 items-center">
          {sidebarSlot}

          {isOrganizer && (
            <button
              onClick={onGoLive}
              className="icon-circle-button rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition-colors hover:bg-red-50"
              title="Go Live"
              aria-label="Go Live"
            >
              <Radio className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="flex min-h-10 items-center justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-900 transition-colors hover:bg-gray-100 active:bg-gray-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {!onBack && <div className="h-10 w-10" />}

        <div className="flex items-center gap-3">
          {sidebarSlot}

          {isOwnProfile && isOrganizer && (
            <button
              onClick={onGoLive}
              className="icon-circle-button rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition-colors hover:bg-red-50 active:bg-red-50"
              title="Go Live"
              aria-label="Go Live"
            >
              <Radio className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-gray-200">
          {isLoading ? (
            <div className="h-full w-full animate-pulse bg-gray-200" />
          ) : (
            <UserAvatar
              src={profileImage}
              name={displayName}
              className="h-full w-full text-xl"
              size="2xl"
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
                <h1 className="min-w-0 flex-none max-w-[calc(100%-1.375rem)] whitespace-normal break-words text-xl font-semibold leading-snug text-gray-900">
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
              <p className="mt-1 truncate text-sm font-medium text-gray-500">
                @{username || 'user'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
