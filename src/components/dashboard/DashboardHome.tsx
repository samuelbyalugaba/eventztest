import { Ticket, CreditCard, PlayCircle, Gift, Users, Globe2 } from 'lucide-react';
import { type DashboardScope, type DashboardScan, type ScreenId } from './types';
import { formatNumber, formatMoneyShort } from './utils';
import { WalletCard, RangeTabs, SectionTitle, MetricCard, RevenueChart, TierRows, StatBox, FunnelCard, CheckInFeed } from './shared';

export function DashboardHome({
  selected,
  eventCount,
  walletBalance,
  scans,
  range,
  onRange,
  onGo,
  onWithdraw,
  fetchError,
  onRetry,
}: {
  selected: DashboardScope;
  eventCount: number;
  walletBalance: number;
  scans: DashboardScan[];
  range: string;
  onRange: (value: string) => void;
  onGo: (screen: ScreenId) => void;
  onWithdraw: () => void;
  fetchError?: null | 'partial' | 'full';
  onRetry?: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
      <div className="px-4 pt-[14px] pb-[calc(86px+var(--eventz-safe-area-bottom))]">
        <WalletCard eventCount={eventCount} balance={walletBalance} onWithdraw={onWithdraw} />
        <RangeTabs value={range} onChange={onRange} />

        {fetchError ? (
          <div className="flex items-center justify-between gap-3 my-2 mb-3 px-[14px] py-[10px] rounded-xl bg-[#FEF3C7] text-[#92400E] text-[0.8125rem] font-medium" role="alert">
            <span>
              {fetchError === 'full'
                ? 'Could not refresh dashboard data.'
                : 'Some numbers may be out of date.'}
            </span>
            {onRetry ? (
              <button type="button" className="px-3 py-[6px] rounded-lg bg-[#7C3AED] text-white text-[0.75rem] font-semibold hover:bg-[#6D28D9]" onClick={onRetry}>
                Retry
              </button>
            ) : null}
          </div>
        ) : null}

        <SectionTitle>Overview - {selected.id === 'all' ? 'all events' : selected.name}</SectionTitle>
        <div className="grid grid-cols-2 gap-[10px] mb-4">
          <MetricCard icon={Ticket} iconColor="#7C3AED" label="Tickets sold" value={formatNumber(selected.tickets)} delta="From tickets table" onClick={() => onGo('tickets')} />
          <MetricCard icon={CreditCard} iconColor="#059669" label="Revenue" value={formatMoneyShort(selected.revenue)} delta="From tickets table" onClick={() => onGo('revenue')} />
          <MetricCard icon={PlayCircle} iconColor="#2563EB" label="Live viewers" value={formatNumber(selected.viewers)} delta={selected.status === 'live' ? 'Live now' : 'No live stream now'} onClick={() => onGo('stream')} />
          <MetricCard icon={Gift} iconColor="#D97706" label="Gifts received" value={formatMoneyShort(selected.gifts)} delta={selected.gifts ? 'From transactions' : 'No gifts yet'} onClick={() => onGo('gifts')} />
          <MetricCard icon={Users} iconColor="#7C3AED" label="Followers" value={formatNumber(selected.followers)} delta="From followers table" />
          <MetricCard icon={Globe2} iconColor="#0891B2" label="Virtual tickets" value={formatNumber(selected.virtualTickets)} delta="From event stream settings" />
        </div>

        <SectionTitle>Revenue chart</SectionTitle>
        <RevenueChart scope={selected} />

        <SectionTitle>Ticket tiers</SectionTitle>
        <TierRows scope={selected} />

        <SectionTitle>Audience</SectionTitle>
        <div className="grid grid-cols-2 gap-[10px] mb-4">
          <StatBox label="Total followers" value={formatNumber(selected.followers)} note="From follows table" />
          <StatBox label="Event page views" value={formatNumber(selected.pageViews)} note="From events table" />
          <StatBox label="Avg. ticket value" value={formatMoneyShort(selected.tickets ? Math.round(selected.revenue / selected.tickets) : 0)} note="Revenue divided by tickets" />
          <StatBox label="Conversion rate" value={`${selected.pageViews ? Math.round((selected.tickets / selected.pageViews) * 100) : 0}%`} note="Tickets divided by views" muted />
        </div>

        <SectionTitle>Sales funnel</SectionTitle>
        <FunnelCard scope={selected} />

        <SectionTitle>Recent check-ins</SectionTitle>
        <CheckInFeed scans={scans} />
      </div>
    </div>
  );
}
