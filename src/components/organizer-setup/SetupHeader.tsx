import { BackButton } from '../ui/BackButton';
import creatorBadge from '../../assets/verified-badge.png';

interface SetupHeaderProps {
  onBack?: () => void;
}

export function SetupHeader({ onBack }: SetupHeaderProps) {
  return (
    <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-5 pb-2.5 pt-[calc(0.625rem+var(--eventz-safe-area-top))] flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onBack && (
          <BackButton
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-900"
          />
        )}
        <div>
          <h1 className="text-base font-semibold text-gray-900">Set up your creator profile</h1>
          <p className="text-[0.7rem] leading-4 text-gray-500 font-medium">Go live, host events & grow your audience</p>
        </div>
      </div>
      <div className="w-10 h-10 flex items-center justify-center">
        <img src={creatorBadge} alt="Creator badge" className="w-8 h-8 object-contain" />
      </div>
    </div>
  );
}
