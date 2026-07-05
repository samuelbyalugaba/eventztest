import { CreditCard } from 'lucide-react';
import { type DashboardScope, type DashboardTransaction, type ScreenId } from './types';
import { formatMoneyShort, formatNumber, transactionAmount } from './utils';
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
    const totalGifts = giftTransactions.reduce((sum, transaction) => sum + transactionAmount(transaction), 0);
    const averageGift = giftTransactions.length ? Math.round(totalGifts / giftTransactions.length) : 0;
    return (
      <>
        <BackTopBar title="Gifts received" onBack={onBack} />
        <div className="dash-scroll">
          <div className="dash-pad">
            <div className="dash-stat-grid mt-1">
              <StatBox label="Total gifts" value={formatMoneyShort(totalGifts)} note={giftTransactions.length ? 'From gift transactions' : 'No gifts yet'} />
              <StatBox label="Gift count" value={formatNumber(giftTransactions.length)} note="Completed gift rows" />
              <StatBox label="Avg. gift" value={formatMoneyShort(averageGift)} note="Total divided by gifts" />
              <StatBox label="Top gift" value={formatMoneyShort(Math.max(0, ...giftTransactions.map(transactionAmount)))} note="Highest gift row" muted />
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
        <div className="dash-scroll">
          <div className="dash-pad">
            <div className="dash-stat-grid mt-1">
              <StatBox label="Total revenue" value={formatMoneyShort(scope.revenue)} note="From tickets table" />
              <StatBox label="Gifts income" value={formatMoneyShort(scope.gifts)} note="From gift transactions" />
              <StatBox label="Available now" value={formatMoneyShort(scope.available)} note="Ready to withdraw" />
              <StatBox label="Locked funds" value={formatMoneyShort(scope.locked)} note="Unlocks after events" muted />
            </div>
            <SectionTitle>Revenue by event</SectionTitle>
            <TierRows scope={scope} />
            <button type="button" className="dash-primary-btn" onClick={() => onGo('payouts')}>
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
      <div className="dash-scroll">
        <div className="dash-pad">
          <div className="dash-stat-grid mt-1">
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
