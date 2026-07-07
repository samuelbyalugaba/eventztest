import { Lock, PlayCircle, Bell } from 'lucide-react';
import { type DashboardScope, type ScreenId } from './types';
import { formatMoneyShort, formatNumber, statusClass } from './utils';
import { BackTopBar, SectionTitle, StatBox, TierRows } from './shared';

export function EventDetailScreen({ scope, onBack, onGo }: { scope: DashboardScope; onBack: () => void; onGo: (screen: ScreenId) => void }) {
  return (
    <>
      <BackTopBar title={scope.name} onBack={onBack} right={<span className={statusClass(scope.status)}>{scope.statusLabel}</span>} />
      <div className="flex-1 overflow-y-auto [scrollbar-width:none]">
        <div className="px-4 pt-[14px] pb-[calc(86px+var(--eventz-safe-area-bottom))]">
          <div className="grid grid-cols-2 gap-[10px] mb-4 mt-1">
            <StatBox label={scope.status === 'upcoming' ? 'Revenue' : scope.status === 'completed' ? 'Final revenue' : 'Revenue'} value={formatMoneyShort(scope.revenue)} note="From ticket rows" />
            <StatBox label="Tickets sold" value={formatNumber(scope.tickets)} note="Physical + virtual" />
            <StatBox label="Live viewers" value={formatNumber(scope.viewers)} note={`Peak: ${formatNumber(scope.peakViewers)}`} />
            <StatBox label="Gifts earned" value={formatMoneyShort(scope.gifts)} note="From gift transactions" />
          </div>
          {scope.locked > 0 ? (
            <div className="flex gap-[10px] items-start my-1 mb-[14px] rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] px-[14px] py-3 text-[#5B21B6] text-xs font-medium leading-[1.55]">
              <Lock className="h-4 w-4" />
              <span>Revenue is locked until the event settles. You can withdraw available funds from other settled events now.</span>
            </div>
          ) : null}
          <SectionTitle>Ticket tiers</SectionTitle>
          <TierRows scope={scope} />
          <button type="button" className="w-full rounded-[14px] py-[14px] px-3 mt-[11px] flex items-center justify-center gap-[9px] text-sm font-semibold tracking-[.02em] bg-gradient-to-br from-primary to-[#5B21B6] text-white disabled:opacity-50 disabled:grayscale-[.25] disabled:cursor-not-allowed" onClick={() => onGo('stream')}>
            <PlayCircle className="h-4 w-4" />
            View live stream
          </button>
          <button type="button" className="w-full rounded-[14px] py-[14px] px-3 mt-[11px] flex items-center justify-center gap-[9px] text-sm font-semibold tracking-[.02em] bg-white text-primary border-2 border-primary" onClick={() => onGo('notify')}>
            <Bell className="h-4 w-4" />
            Message attendees
          </button>
        </div>
      </div>
    </>
  );
}
