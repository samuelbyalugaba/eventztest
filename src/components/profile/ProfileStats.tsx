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

function StatValue({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center flex-1 min-h-[2.15rem] cursor-pointer active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded-lg py-1">
      <div className="text-[0.95rem] font-bold text-gray-900 leading-none mb-0.5">
        {value}
      </div>
      <div className="text-[0.61rem] leading-[0.78rem] text-gray-500 font-medium uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function formatStat(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
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
  if (!dataReady) {
    return (
      <div className="flex items-center justify-between px-3.5 mb-3.5">
        <StatValue value="-" label={isOrganizer ? 'Hosted' : 'Attended'} />
        <StatValue value="-" label="Followers" />
        <StatValue value="-" label="Following" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3.5 mb-3.5">
      <button
        type="button"
        className="text-center flex-1 min-h-[2.15rem] cursor-pointer active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded-lg py-1"
        onClick={onHostedClick}
      >
        <div className="text-[0.95rem] font-bold text-gray-900 leading-none mb-0.5">
          {formatStat(isOrganizer ? (hostedCount ?? 0) : attendedCount)}
        </div>
        <div className="text-[0.61rem] leading-[0.78rem] text-gray-500 font-medium uppercase tracking-wider">
          {isOrganizer ? 'Hosted' : 'Attended'}
        </div>
      </button>
      <button
        type="button"
        className="text-center flex-1 min-h-[2.15rem] cursor-pointer active:scale-95 transition-transform border-l border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded-lg py-1"
        onClick={onFollowersClick}
      >
        <div className="text-[0.95rem] font-bold text-gray-900 leading-none mb-0.5">
          {formatStat(followers)}
        </div>
        <div className="text-[0.61rem] leading-[0.78rem] text-gray-500 font-medium uppercase tracking-wider">
          Followers
        </div>
      </button>
      <button
        type="button"
        className="text-center flex-1 min-h-[2.15rem] cursor-pointer active:scale-95 transition-transform border-l border-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded-lg py-1"
        onClick={onFollowingClick}
      >
        <div className="text-[0.95rem] font-bold text-gray-900 leading-none mb-0.5">
          {formatStat(following)}
        </div>
        <div className="text-[0.61rem] leading-[0.78rem] text-gray-500 font-medium uppercase tracking-wider">
          Following
        </div>
      </button>
    </div>
  );
}
