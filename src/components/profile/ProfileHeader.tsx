import { ChevronLeft, Radio } from 'lucide-react';
import { UserAvatar } from '../UserAvatar';
import { Skeleton } from '../ui/skeleton';
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

function CreatorBadge({ className = '' }: { className?: string }) {
  return (
    <img
      src={creatorBadge}
      alt="Creator badge"
      className={`inline-block h-4 w-4 shrink-0 object-contain drop-shadow-sm pointer-events-none select-none ${className}`}
      style={{ visibility: 'visible', opacity: 1 }}
      loading="eager"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

function ProfileTitle({
  displayName,
  showCreatorBadge,
}: {
  displayName: string;
  showCreatorBadge: boolean;
}) {
  const name = (displayName || 'User').trim() || 'User';

  if (!showCreatorBadge) {
    return <>{name}</>;
  }

  const lastWordMatch = name.match(/^(.*\s)(\S+)$/);
  const leadingText = lastWordMatch?.[1] ?? '';
  const lastWord = lastWordMatch?.[2] ?? name;

  return (
    <>
      {leadingText}
      <span className="inline-flex items-center whitespace-nowrap align-baseline">
        {lastWord}
        <CreatorBadge className="ml-1.5 translate-y-px" />
      </span>
    </>
  );
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
          <div className="w-16 h-16 rounded-full overflow-hidden bg-white ring-1 ring-gray-200">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-none" />
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
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ) : (
              <>
                <div className="min-w-0">
                  <h1 className="whitespace-normal break-words text-lg font-semibold leading-snug text-gray-900 sm:text-xl">
                    <ProfileTitle displayName={displayName} showCreatorBadge={showCreatorBadge} />
                  </h1>
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
            <Skeleton className="h-full w-full rounded-none" />
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
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ) : (
            <>
              <div className="min-w-0">
                <h1 className="whitespace-normal break-words text-lg font-semibold leading-snug text-gray-900 sm:text-xl">
                  <ProfileTitle displayName={displayName} showCreatorBadge={showCreatorBadge} />
                </h1>
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
