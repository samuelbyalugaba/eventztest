interface ProfileStatsProps {
  isOrganizer: boolean;
  hostedCount: number | null;
  attendedCount: number;
  followers: number;
  following: number;
  dataReady: boolean;
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
  dataReady,
  onHostedClick,
  onFollowersClick,
  onFollowingClick,
}: ProfileStatsProps) {
  return (
    <div
      className="flex items-center justify-between px-4 mb-4 transition-opacity duration-200"
      style={{ opacity: dataReady ? 1 : 0 }}
    >
      <button
        type="button"
        className="text-center flex-1 cursor-pointer active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-lg py-1"
        onClick={onHostedClick}
      >
        <div className="text-base font-bold text-gray-900 leading-none mb-1">
          {isOrganizer ? (hostedCount ?? 0) : attendedCount}
        </div>
        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
          {isOrganizer ? 'Hosted' : 'Attended'}
        </div>
      </button>
      <button
        type="button"
        className="text-center flex-1 cursor-pointer active:scale-95 transition-transform border-l border-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-lg py-1"
        onClick={onFollowersClick}
      >
        <div className="text-base font-bold text-gray-900 leading-none mb-1">
          {followers}
        </div>
        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
          Followers
        </div>
      </button>
      <button
        type="button"
        className="text-center flex-1 cursor-pointer active:scale-95 transition-transform border-l border-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-lg py-1"
        onClick={onFollowingClick}
      >
        <div className="text-base font-bold text-gray-900 leading-none mb-1">
          {following}
        </div>
        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
          Following
        </div>
      </button>
    </div>
  );
}
