import { useState, useEffect, useMemo } from 'react';
import { Users, MessageCircle, Info, Send, QrCode, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { type DashboardScope, type ScreenId } from './types';
import { formatNumber } from './utils';
import { BackTopBar, SectionTitle, EmptyCard, DashboardMenu } from './shared';

export function NotifyScreen({ scope, onBack, onGo, onScan }: { scope: DashboardScope; onBack: () => void; onGo: (screen: ScreenId) => void; onScan: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const audienceOptions = useMemo(() => {
    const options: Array<[string, number]> = [];
    if (scope.tickets > 0) options.push(['All attendees', scope.tickets]);
    scope.tiers.forEach((tier) => {
      if (tier.tickets > 0) options.push([tier.name, tier.tickets]);
    });
    if (scope.virtualTickets > 0) options.push(['Virtual ticket holders', scope.virtualTickets]);
    if (scope.viewers > 0) options.push(['Live viewers', scope.viewers]);
    if (scope.followers > 0) options.push(['Followers', scope.followers]);
    return options;
  }, [scope]);
  const [audience, setAudience] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!audienceOptions.length) {
      setAudience('');
      return;
    }
    if (!audienceOptions.some(([name]) => name === audience)) {
      setAudience(audienceOptions[0][0]);
    }
  }, [audience, audienceOptions]);

  return (
    <>
      <BackTopBar
        title="Send notification"
        onBack={onBack}
        right={
          <div className="flex items-center gap-2">
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
                <Users className="h-4 w-4 text-gray-500" />
                Choose audience
              </span>
            </div>
            {audienceOptions.length ? (
              <div className="dash-audience-grid">
                {audienceOptions.map(([name, count]) => (
                  <button key={name} type="button" className={`dash-audience ${audience === name ? 'on' : ''}`} onClick={() => setAudience(name)}>
                    <span />
                    <b>{name}</b>
                    <small>{formatNumber(count)} people</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dash-empty-inline">Audiences will appear after tickets, viewers, or followers are recorded.</div>
            )}
          </div>
          <div className="dash-card">
            <div className="dash-card-title">
              <span>
                <MessageCircle className="h-4 w-4 text-gray-500" />
                Write message
              </span>
            </div>
            <textarea
              className="dash-message-box"
              placeholder="Write a short update for the selected audience."
              maxLength={160}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <div className="dash-message-foot">
              <span>{160 - message.length} characters left</span>
              <span className="dash-toggle"><i />Push notification</span>
            </div>
            <div className="dash-preview">
              <Info className="h-4 w-4" />
              <span>{message.trim() || 'Your message preview will appear here as you type.'}</span>
            </div>
            <button
              type="button"
              className="dash-primary-btn"
              disabled={!audience || !message.trim()}
              onClick={() => toast.success(`Notification queued for ${audience}`)}
            >
              <Send className="h-4 w-4" />
              Send to {audience || 'audience'}
            </button>
          </div>
          <SectionTitle>Previously sent</SectionTitle>
          <EmptyCard>Sent broadcast history will appear here when the backend records it.</EmptyCard>
        </div>
      </div>
    </>
  );
}
