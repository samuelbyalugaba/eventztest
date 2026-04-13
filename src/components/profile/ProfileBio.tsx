interface ProfileBioProps {
  isLoading: boolean;
  isOrganizer: boolean;
  isOwnProfile: boolean;
  organizerCategory?: string;
  bio?: string;
  onSetBio: () => void;
}

export function ProfileBio({ isLoading, isOrganizer, isOwnProfile, organizerCategory, bio, onSetBio }: ProfileBioProps) {
  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex flex-col gap-2">
        {isOrganizer && (
          <div className="text-sm font-medium text-gray-500">
            {organizerCategory || 'Event Organizer'}
          </div>
        )}

        <div className="flex items-start justify-between">
          <p className={`${(isOrganizer && bio) ? 'text-gray-800 font-medium' : 'text-gray-600'} leading-relaxed text-[15px]`}>
            {bio ? bio : (
              isOwnProfile ? (
                <span className="text-gray-400 italic">No bio yet. Add your bio in Settings.</span>
              ) : null
            )}
          </p>
          {!bio && isOwnProfile && (
            <button
              onClick={onSetBio}
              className="ml-4 px-3 py-1.5 text-xs rounded-full bg-purple-50 text-purple-700 font-semibold hover:bg-purple-100 transition-colors"
            >
              Set Bio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
