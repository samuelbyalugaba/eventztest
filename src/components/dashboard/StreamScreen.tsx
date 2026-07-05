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
              <span className="dash-live-chip text-white">
                <i />
                LIVE
              </span>
            ) : null}
            <button type="button" className="dash-header-action dash-header-icon-only" onClick={onScan} aria-label="Scan ticket">
              <QrCode className="h-4 w-4" />
            </button>
            <button type="button" className="dash-header-action dash-header-icon-only" onClick={() => setMenuOpen(true)} aria-label="Menu">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        }
      />
      {menuOpen && (
        <DashboardMenu onClose={() => setMenuOpen(false)} onNav={(screen) => { setMenuOpen(false); onGo(screen); }} />
      )}
      <div className="dash-scroll">
        <div className="dash-pad">
          <div className="dash-card mt-1">
            <div className="dash-card-title">
              <span>
                <PlayCircle className="h-4 w-4 text-blue-600" />
                {scope.name} - {isLiveNow ? 'live data' : 'stream data'}
              </span>
            </div>
            {isLiveNow ? (
              <InfoRow icon={Eye} label="Current viewers" value={formatNumber(scope.viewers)} />
            ) : (
              <div className="dash-empty-inline">No live stream is running right now.</div>
            )}
            <InfoRow icon={TrendingUp} label="Peak viewers" value={formatNumber(scope.peakViewers)} />
            <InfoRow icon={Ticket} label="Virtual tickets sold" value={formatNumber(scope.virtualTickets)} />
          </div>

          <SectionTitle>Live gifts</SectionTitle>
          <GiftList gifts={giftTransactions} />

          <button type="button" className="dash-primary-btn" onClick={() => onGo('notify')} disabled={!isLiveNow}>
            <Bell className="h-4 w-4" />
            {isLiveNow ? 'Message viewers now' : 'No live viewers right now'}
          </button>
        </div>
      </div>
    </>
  );
}
