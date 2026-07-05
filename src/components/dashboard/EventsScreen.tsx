import { useState } from 'react';
import { Plus, QrCode, Menu } from 'lucide-react';
import { type DashboardScope, type ScreenId } from './types';
import { BackTopBar, SectionTitle, DashboardMenu, EmptyCard, EventRow } from './shared';

export function EventsScreen({ scopes, onGo, onNew, onScan, onBack }: { scopes: DashboardScope[]; onGo: (screen: ScreenId, detail?: DashboardScope) => void; onNew: () => void; onScan: () => void; onBack: () => void }) {
  const active = scopes.filter((scope) => scope.status !== 'completed');
  const completed = scopes.filter((scope) => scope.status === 'completed');
  const [eventsMenuOpen, setEventsMenuOpen] = useState(false);

  return (
    <>
      <BackTopBar
        title="My Events"
        onBack={onBack}
        right={
          <div className="flex items-center gap-2">
            <button type="button" className="dash-header-action" onClick={onNew}>
              <Plus className="h-3.5 w-3.5" />
              New event
            </button>
            <button type="button" className="dash-header-action dash-header-icon-only" onClick={onScan} aria-label="Scan ticket">
              <QrCode className="h-4 w-4" />
            </button>
            <button type="button" className="dash-header-action dash-header-icon-only" onClick={() => setEventsMenuOpen(true)} aria-label="Menu">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        }
      />
      {eventsMenuOpen && (
        <DashboardMenu onClose={() => setEventsMenuOpen(false)} onNav={(screen) => { setEventsMenuOpen(false); onGo(screen); }} />
      )}
      <div className="dash-scroll">
        <div className="dash-pad">
          <SectionTitle>Active & upcoming</SectionTitle>
          {active.map((scope) => <EventRow key={scope.id} scope={scope} onClick={() => onGo('event-detail', scope)} />)}
          <SectionTitle>Completed</SectionTitle>
          {completed.length ? completed.map((scope) => <EventRow key={scope.id} scope={scope} onClick={() => onGo('event-detail', scope)} />) : <EmptyCard>No completed events yet</EmptyCard>}
        </div>
      </div>
    </>
  );
}
