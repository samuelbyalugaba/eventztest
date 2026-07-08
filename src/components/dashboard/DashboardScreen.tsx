import { Menu, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ScreenId, DashboardScope } from './types';
import {
  TopBar,
  DashboardMenu,
  EventSelector,
} from './shared';
import { DashboardHome } from './DashboardHome';
import { EventsScreen } from './EventsScreen';
import { StreamScreen } from './StreamScreen';
import { NotifyScreen } from './NotifyScreen';
import { PayoutsScreen } from './PayoutsScreen';
import { DetailScreen } from './DetailScreen';
import { EventDetailScreen } from './EventDetailScreen';

interface DashboardScreenProps {
  screen: ScreenId;
  organizerName: string;
  initials: string;
  activeEventCount: number;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onNav: (screen: ScreenId) => void;
  selectedScope: DashboardScope;
  allScope: DashboardScope;
  scopes: DashboardScope[];
  eventCount: number;
  selectorOpen: boolean;
  onSelectorToggle: () => void;
  onPickScope: (scope: DashboardScope) => void;
  connectedEventCount: number;
  walletBalance: number;
  rangedScans: any[];
  range: string;
  onRangeChange: (range: string) => void;
  onGo: (screen: ScreenId, detail?: DashboardScope) => void;
  onWithdraw: () => void;
  fetchError: 'partial' | 'full' | null;
  onRetry: () => void;
  detailScope: DashboardScope | null;
  selectedGiftTransactions: any[];
  detailGiftTransactions: any[];
  giftTransactions: any[];
  transactions: any[];
  onOpenScanner: () => void;
  onBack: () => void;
  onNewEvent: () => void;
}

export function DashboardScreenView({
  screen,
  organizerName,
  initials,
  activeEventCount,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  onNav,
  selectedScope,
  allScope,
  scopes,
  eventCount,
  selectorOpen,
  onSelectorToggle,
  onPickScope,
  connectedEventCount,
  walletBalance,
  rangedScans,
  range,
  onRangeChange,
  onGo,
  onWithdraw,
  fetchError,
  onRetry,
  detailScope,
  selectedGiftTransactions,
  detailGiftTransactions,
  giftTransactions,
  transactions,
  onOpenScanner,
  onBack,
  onNewEvent,
}: DashboardScreenProps) {
  const navigate = useNavigate();
  const detail = detailScope || selectedScope;

  if (screen === 'events') return <EventsScreen scopes={scopes} onGo={onGo} onNew={onNewEvent} onScan={onOpenScanner} onBack={onBack} />;
  if (screen === 'stream') return <StreamScreen scope={detail} giftTransactions={detailGiftTransactions} onBack={onBack} onGo={onGo} onScan={onOpenScanner} />;
  if (screen === 'notify') return <NotifyScreen scope={selectedScope} onBack={onBack} onGo={onGo} onScan={onOpenScanner} />;
  if (screen === 'payouts') return <PayoutsScreen eventCount={connectedEventCount} walletBalance={walletBalance} transactions={transactions} onBack={onBack} onWithdraw={onWithdraw} onGo={onGo} onScan={onOpenScanner} />;
  if (screen === 'tickets') return <DetailScreen type="tickets" scope={selectedScope} giftTransactions={selectedGiftTransactions} eventCount={selectedScope.id === 'all' ? eventCount : 1} onBack={onBack} onGo={onGo} />;
  if (screen === 'revenue') return <DetailScreen type="revenue" scope={selectedScope} giftTransactions={selectedGiftTransactions} eventCount={selectedScope.id === 'all' ? eventCount : 1} onBack={onBack} onGo={onGo} />;
  if (screen === 'gifts') return <DetailScreen type="gifts" scope={selectedScope} giftTransactions={selectedGiftTransactions} eventCount={selectedScope.id === 'all' ? eventCount : 1} onBack={onBack} onGo={onGo} />;
  if (screen === 'event-detail') return <EventDetailScreen scope={detail} onBack={onBack} onGo={onGo} />;

  return (
    <>
      <TopBar
        title={organizerName}
        subtitle={`${activeEventCount} active event${activeEventCount === 1 ? '' : 's'}`}
        initials={initials}
        onBackToProfile={() => navigate('/profile')}
        action={
          <div className="flex items-center gap-2">
            <button type="button" className="h-[34px] w-[38px] p-0 rounded-full border border-white/30 bg-white/18 text-white text-xs font-medium inline-flex items-center justify-center flex-shrink-0" onClick={onOpenScanner} aria-label="Scan ticket">
              <QrCode className="h-4 w-4" />
            </button>
            <button type="button" className="h-[34px] w-[38px] p-0 rounded-full border border-white/30 bg-white/18 text-white text-xs font-medium inline-flex items-center justify-center flex-shrink-0" onClick={onOpenMenu} aria-label="Menu">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        }
      />
      {menuOpen && (
        <DashboardMenu onClose={onCloseMenu} onNav={(screen) => { onCloseMenu(); onNav(screen); }} />
      )}
      <EventSelector
        selected={selectedScope}
        allScope={allScope}
        scopes={scopes}
        eventCount={eventCount}
        isOpen={selectorOpen}
        onToggle={onSelectorToggle}
        onPick={onPickScope}
      />
      <DashboardHome selected={selectedScope} eventCount={connectedEventCount} walletBalance={walletBalance} scans={rangedScans} range={range} onRange={onRangeChange} onGo={onGo} onWithdraw={onWithdraw} fetchError={fetchError} onRetry={onRetry} />
    </>
  );
}
