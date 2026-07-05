import { Lock, PlayCircle, Bell } from 'lucide-react';
import { type DashboardScope, type ScreenId } from './types';
import { formatMoneyShort, formatNumber, statusClass } from './utils';
import { BackTopBar, SectionTitle, StatBox, TierRows } from './shared';

export function EventDetailScreen({ scope, onBack, onGo }: { scope: DashboardScope; onBack: () => void; onGo: (screen: ScreenId) => void }) {
  return (
    <>
      <BackTopBar title={scope.name} onBack={onBack} right={<span className={statusClass(scope.status)}>{scope.statusLabel}</span>} />
      <div className="dash-scroll">
        <div className="dash-pad">
          <div className="dash-stat-grid mt-1">
            <StatBox label={scope.status === 'upcoming' ? 'Revenue' : scope.status === 'completed' ? 'Final revenue' : 'Revenue'} value={formatMoneyShort(scope.revenue)} note="From ticket rows" />
            <StatBox label="Tickets sold" value={formatNumber(scope.tickets)} note="Physical + virtual" />
            <StatBox label="Live viewers" value={formatNumber(scope.viewers)} note={`Peak: ${formatNumber(scope.peakViewers)}`} />
            <StatBox label="Gifts earned" value={formatMoneyShort(scope.gifts)} note="From gift transactions" />
          </div>
          {scope.locked > 0 ? (
            <div className="dash-info-banner">
              <Lock className="h-4 w-4" />
              <span>Revenue is locked until the event settles. You can withdraw available funds from other settled events now.</span>
            </div>
          ) : null}
          <SectionTitle>Ticket tiers</SectionTitle>
          <TierRows scope={scope} />
          <button type="button" className="dash-primary-btn" onClick={() => onGo('stream')}>
            <PlayCircle className="h-4 w-4" />
            View live stream
          </button>
          <button type="button" className="dash-outline-btn" onClick={() => onGo('notify')}>
            <Bell className="h-4 w-4" />
            Message attendees
          </button>
        </div>
      </div>
    </>
  );
}
