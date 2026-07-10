import { useState } from 'react';
import { Plus, QrCode, Menu, Calendar, Loader2 } from 'lucide-react';
import { type DashboardScope, type ScreenId } from './types';
import { BackTopBar, SectionTitle, DashboardMenu, EmptyCard, EventRow } from './shared';
import { EmptyState } from '../ui/EmptyState';

export function EventsScreen({ scopes, onGo, onNew, onScan, onBack }: { scopes: DashboardScope[]; onGo: (screen: ScreenId, detail?: DashboardScope) => void; onNew: () => void; onScan: () => void; onBack: () => void }) {
  const active = scopes.filter((scope) => scope.status !== 'completed');
  const completed = scopes.filter((scope) => scope.status === 'completed');
  const [eventsMenuOpen, setEventsMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNew = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    onNew();
  };

  return (
    <>
      <BackTopBar
        title="My Events"
        onBack={onBack}
        right={
          <div className="flex items-center gap-2">
            <button type="button" disabled={isNavigating} className="h-[34px] px-3 rounded-full border border-white/30 bg-white/18 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 disabled:opacity-70" onClick={handleNew}>
              {isNavigating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {isNavigating ? 'Opening...' : 'New event'}
            </button>
            <button type="button" className="h-[34px] px-3 rounded-full border border-white/30 bg-white/18 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 w-[38px] h-[38px] p-0" onClick={onScan} aria-label="Scan ticket">
              <QrCode className="h-4 w-4" />
            </button>
            <button type="button" className="h-[34px] px-3 rounded-full border border-white/30 bg-white/18 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 w-[38px] h-[38px] p-0" onClick={() => setEventsMenuOpen(true)} aria-label="Menu">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        }
      />
      {eventsMenuOpen && (
        <DashboardMenu onClose={() => setEventsMenuOpen(false)} onNav={(screen) => { setEventsMenuOpen(false); onGo(screen); }} />
      )}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none]">
        <div className="px-4 pt-[14px] pb-[calc(86px+var(--eventz-safe-area-bottom))]">
          <SectionTitle>Active & upcoming</SectionTitle>
          {active.length > 0 ? active.map((scope) => <EventRow key={scope.id} scope={scope} onClick={() => onGo('event-detail', scope)} />) : (
            <EmptyState icon={Calendar} title="No active events" description="Create and publish an event to see it here" />
          )}
          <SectionTitle>Completed</SectionTitle>
          {completed.length ? completed.map((scope) => <EventRow key={scope.id} scope={scope} onClick={() => onGo('event-detail', scope)} />) : <EmptyCard>No completed events yet</EmptyCard>}
        </div>
      </div>
    </>
  );
}
