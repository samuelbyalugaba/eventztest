import { useMemo, useState } from 'react';

interface ProfileBioProps {
  isLoading: boolean;
  isOrganizer: boolean;
  isOwnProfile: boolean;
  organizerCategory?: string;
  bio?: string;
  onSetBio: () => void;
}

const BIO_PREVIEW_LENGTH = 180;

export function ProfileBio({ isLoading, isOrganizer, isOwnProfile, organizerCategory, bio, onSetBio }: ProfileBioProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const trimmedBio = bio?.trim() || '';
  const shouldCollapse = trimmedBio.length > BIO_PREVIEW_LENGTH;
  const visibleBio = useMemo(() => {
    if (!trimmedBio || !shouldCollapse || isExpanded) return trimmedBio;
    const clipped = trimmedBio.slice(0, BIO_PREVIEW_LENGTH).trimEnd();
    const lastSpace = clipped.lastIndexOf(' ');
    return `${(lastSpace > 120 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}...`;
  }, [isExpanded, shouldCollapse, trimmedBio]);

  if (isLoading) {
    return (
      <div className="mb-4">
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex flex-col gap-1.5">
        {isOrganizer && (
          <div className="text-xs font-medium text-gray-500">
            {organizerCategory || 'Event Organizer'}
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <p className={`${(isOrganizer && bio) ? 'text-gray-800 font-medium' : 'text-gray-600'} leading-relaxed text-sm`}>
            {trimmedBio ? (
              <>
                {visibleBio}
                {shouldCollapse && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded((value) => !value)}
                    className="ml-1.5 inline-flex align-baseline text-sm font-semibold text-purple-700 active:text-purple-800"
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </>
            ) : (
              isOwnProfile ? (
                <span className="text-gray-400 italic">No bio yet. Add your bio in Settings.</span>
              ) : null
            )}
          </p>
          {!trimmedBio && isOwnProfile && (
            <button
              onClick={onSetBio}
              className="ml-3 px-2.5 py-1 text-[11px] rounded-full bg-purple-50 text-purple-700 font-semibold hover:bg-purple-100 transition-colors"
            >
              Set Bio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
