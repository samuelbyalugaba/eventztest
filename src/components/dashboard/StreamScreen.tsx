import { useState } from 'react';
import { PlayCircle, TrendingUp, Ticket, Eye, Bell, QrCode, Menu } from 'lucide-react';
import { type DashboardScope, type DashboardTransaction, type ScreenId } from './types';
import { formatNumber } from './utils';
import { BackTopBar, SectionTitle, InfoRow, GiftList, DashboardMenu } from './shared';

export function StreamScreen({ scope, giftTransactions, onBack, onGo, onScan }: { scope: DashboardScope; giftTransactions: DashboardTransaction[]; onBack: () => void; onGo: (screen: ScreenId) => void; onScan: () => void }) {
  const isLiveNow = scope.status === 'live';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <BackTopBar
        title="Live stream"
        onBack={onBack}
        right={
          <div className="flex items-center gap-2">
            {isLiveNow ? (
              <span className="inline-flex items-center gap-[6px] text-xs font-medium text-[#EF4444] text-white">
                <i />
                LIVE
              </span>
            ) : null}
            <button type="button" className="h-[34px] px-3 rounded-full border border-white/30 bg-white/18 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 w-[38px] h-[38px] p-0" onClick={onScan} aria-label="Scan ticket">
              <QrCode className="h-4 w-4" />
            </button>
            <button type="button" className="h-[34px] px-3 rounded-full border border-white/30 bg-white/18 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 w-[38px] h-[38px] p-0" onClick={() => setMenuOpen(true)} aria-label="Menu">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        }
      />
      {menuOpen && (
        <DashboardMenu onClose={() => setMenuOpen(false)} onNav={(screen) => { setMenuOpen(false); onGo(screen); }} />
      )}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none]">
        <div className="px-4 pt-[14px] pb-[calc(86px+var(--eventz-safe-area-bottom))]">
          <div className="bg-white border border-[#E9EBF0] rounded-[18px] p-[17px] mb-[13px] mt-1">
            <div className="text-sm font-medium text-[#111827] flex items-center justify-between gap-[10px] mb-[15px]">
              <span>
                <PlayCircle className="h-4 w-4 text-blue-600" />
                {scope.name} - {isLiveNow ? 'live data' : 'stream data'}
              </span>
            </div>
            {isLiveNow ? (
              <InfoRow icon={Eye} label="Current viewers" value={formatNumber(scope.viewers)} />
            ) : (
              <div className="border border-dashed border-[#E5E7EB] bg-[#FAFAFA] rounded-xl py-[18px] px-[18px] text-center text-[#6B7280] text-xs font-medium">No live stream is running right now.</div>
            )}
            <InfoRow icon={TrendingUp} label="Peak viewers" value={formatNumber(scope.peakViewers)} />
            <InfoRow icon={Ticket} label="Virtual tickets sold" value={formatNumber(scope.virtualTickets)} />
          </div>

          <SectionTitle>Live gifts</SectionTitle>
          <GiftList gifts={giftTransactions} />

          <button type="button" className="w-full rounded-[14px] py-[14px] px-3 mt-[11px] flex items-center justify-center gap-[9px] text-sm font-semibold tracking-[.02em] bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white disabled:opacity-50 disabled:grayscale-[.25] disabled:cursor-not-allowed" onClick={() => onGo('notify')} disabled={!isLiveNow}>
            <Bell className="h-4 w-4" />
            {isLiveNow ? 'Message viewers now' : 'No live viewers right now'}
          </button>
        </div>
      </div>
    </>
  );
}
