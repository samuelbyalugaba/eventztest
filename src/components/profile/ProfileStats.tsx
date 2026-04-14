interface ProfileStatsProps {
  isOrganizer: boolean;
  hostedCount: number | null;
  hostedCount: number | null;
  attendedCount: number;
  followers: number;
  following: number;
  onHostedClick: () => void;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
}

export function ProfileStats({
  isOrganizer,
  hostedCount,
  attendedCount,
  followers,
  following,
  onHostedClick,
  onFollowersClick,
  onFollowingClick,
}: ProfileStatsProps) {
  // No skeleton - show numbers immediately (defaults to 0, updates when data arrives)

  return (
    <div className="flex items-center justify-between px-6 mb-6">
      <div
        className="text-center flex-1 cursor-pointer active:scale-95 transition-transform"
        onClick={onHostedClick}
      >
        <div className="text-lg font-bold text-gray-900 leading-none mb-1">
          {isOrganizer ? (hostedCount ?? 0) : attendedCount}
        </div>
        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
          {isOrganizer ? 'Hosted' : 'Attended'}
        </div>
      </div>
      <div
        className="text-center flex-1 cursor-pointer active:scale-95 transition-transform border-l border-gray-100"
        onClick={onFollowersClick}
      >
        <div className="text-lg font-bold text-gray-900 leading-none mb-1">
          {followers}
        </div>
        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
          Followers
        </div>
      </div>
      <div
        className="text-center flex-1 cursor-pointer active:scale-95 transition-transform border-l border-gray-100"
        onClick={onFollowingClick}
      >
        <div className="text-lg font-bold text-gray-900 leading-none mb-1">
          {following}
        </div>
        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
          Following
        </div>
      </div>
    </div>
  );
}
