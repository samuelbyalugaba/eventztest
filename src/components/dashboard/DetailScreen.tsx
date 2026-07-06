import { CreditCard } from 'lucide-react';
import { type DashboardScope, type DashboardTransaction, type ScreenId } from './types';
import { formatMoneyShort, formatNumber } from './utils';
import { BackTopBar, SectionTitle, StatBox, GiftList, TierRows } from './shared';

export function DetailScreen({
  type,
  scope,
  giftTransactions,
  eventCount,
  onBack,
  onGo,
}: {
  type: 'tickets' | 'revenue' | 'gifts';
  scope: DashboardScope;
  giftTransactions: DashboardTransaction[];
  eventCount: number;
  onBack: () => void;
  onGo: (screen: ScreenId) => void;
}) {
  if (type === 'gifts') {
    return (
      <>
        <BackTopBar title="Gifts received" onBack={onBack} />
        <div className="flex-1 overflow-y-auto [scrollbar-width:none]">
          <div className="px-4 pt-[14px] pb-[calc(86px+var(--eventz-safe-area-bottom))]">
            <div className="grid grid-cols-2 gap-[10px] mb-4 mt-1">
              <StatBox label="Total sold" value={formatNumber(scope.tickets)} note="From ticket rows" />
              <StatBox label="Physical" value={formatNumber(Math.max(0, scope.tickets - scope.virtualTickets))} note="Total minus virtual" />
              <StatBox label="Virtual" value={formatNumber(scope.virtualTickets)} note="From stream settings" />
              <StatBox label="Avg. per event" value={formatNumber(eventCount ? Math.round(scope.tickets / eventCount) : 0)} note={`${eventCount} event${eventCount === 1 ? '' : 's'}`} muted />
            </div>
            <SectionTitle>Gift transactions</SectionTitle>
            <GiftList gifts={giftTransactions} />
          </div>
        </div>
      </>
    );
  }

  if (type === 'revenue') {
    return (
      <>
        <BackTopBar title="Revenue breakdown" onBack={onBack} />
        <div className="flex-1 overflow-y-auto [scrollbar-width:none]">
          <div className="px-4 pt-[14px] pb-[calc(86px+var(--eventz-safe-area-bottom))]">
            <div className="grid grid-cols-2 gap-[10px] mb-4 mt-1">
              <StatBox label="Total revenue" value={formatMoneyShort(scope.revenue)} note="From tickets table" />
              <StatBox label="Gifts income" value={formatMoneyShort(scope.gifts)} note="From gift transactions" />
              <StatBox label="Available now" value={formatMoneyShort(scope.available)} note="Ready to withdraw" />
              <StatBox label="Locked funds" value={formatMoneyShort(scope.locked)} note="Unlocks after events" muted />
            </div>
            <SectionTitle>Revenue by event</SectionTitle>
            <TierRows scope={scope} />
            <button type="button" className="w-full rounded-[14px] py-[14px] px-3 mt-[11px] flex items-center justify-center gap-[9px] text-sm font-semibold tracking-[.02em] bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white disabled:opacity-50 disabled:grayscale-[.25] disabled:cursor-not-allowed" onClick={() => onGo('payouts')}>
              <CreditCard className="h-4 w-4" />
              Go to payouts
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <BackTopBar title="Tickets sold" onBack={onBack} />
        <div className="flex-1 overflow-y-auto [scrollbar-width:none]">
          <div className="px-4 pt-[14px] pb-[calc(86px+var(--eventz-safe-area-bottom))]">
            <div className="grid grid-cols-2 gap-[10px] mb-4 mt-1">
            <StatBox label="Total sold" value={formatNumber(scope.tickets)} note="From ticket rows" />
            <StatBox label="Physical" value={formatNumber(Math.max(0, scope.tickets - scope.virtualTickets))} note="Total minus virtual" />
            <StatBox label="Virtual" value={formatNumber(scope.virtualTickets)} note="From stream settings" />
            <StatBox label="Avg. per event" value={formatNumber(eventCount ? Math.round(scope.tickets / eventCount) : 0)} note={`${eventCount} event${eventCount === 1 ? '' : 's'}`} muted />
          </div>
          <SectionTitle>Breakdown by tier</SectionTitle>
          <TierRows scope={scope} />
        </div>
      </div>
    </>
  );
}
