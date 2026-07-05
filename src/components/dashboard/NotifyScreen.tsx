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
                <Users className="h-4 w-4 text-gray-500" />
                Choose audience
              </span>
            </div>
            {audienceOptions.length ? (
              <div className="grid grid-cols-2 gap-[9px]">
                {audienceOptions.map(([name, count]) => (
                  <button key={name} type="button" className={`relative text-left p-3 pl-[38px] rounded-xl ${
                    audience === name 
                      ? 'bg-[#F5F3FF] border-[1.5px] border-[#7C3AED]' 
                      : 'bg-[#FAFAFA] border-[1.5px] border-[#E9EBF0]'
                  }`} onClick={() => setAudience(name)}>
                    <span className={`w-[17px] h-[17px] border-2 rounded-full absolute left-3 top-[13px] ${
                      audience === name
                        ? 'bg-[#7C3AED] border-[#7C3AED] shadow-[inset_0_0_0_4px_#fff]'
                        : 'border-[#D1D5DB]'
                    }`} />
                    <b className="block text-xs font-medium text-[#111827]">{name}</b>
                    <small className="block mt-0.5 text-2xs text-[#6B7280]">{formatNumber(count)} people</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-[#E5E7EB] bg-[#FAFAFA] rounded-xl py-[18px] px-[18px] text-center text-[#6B7280] text-xs font-medium">Audiences will appear after tickets, viewers, or followers are recorded.</div>
            )}
          </div>
          <div className="bg-white border border-[#E9EBF0] rounded-[18px] p-[17px] mb-[13px]">
            <div className="text-sm font-medium text-[#111827] flex items-center justify-between gap-[10px] mb-[15px]">
              <span>
                <MessageCircle className="h-4 w-4 text-gray-500" />
                Write message
              </span>
            </div>
            <textarea
              className="w-full min-h-[82px] resize-none border-[1.5px] border-[#E9EBF0] bg-[#FAFAFA] rounded-xl p-[13px] font-inherit text-xs text-[#111827] leading-[1.6] outline-none focus:bg-white focus:border-[#A78BFA]"
              placeholder="Write a short update for the selected audience."
              maxLength={160}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <div className="flex items-center justify-between mt-[9px] gap-[10px]">
              <span className="text-2xs text-[#9CA3AF] font-medium">{160 - message.length} characters left</span>
              <span className="flex items-center gap-[7px] text-[#6B7280] text-xs"><i className="w-[34px] h-[19px] rounded-full bg-[#7C3AED] relative inline-block after:content-[''] after:absolute after:right-[2px] after:top-[2px] after:w-[15px] after:h-[15px] after:rounded-full after:bg-white" />Push notification</span>
            </div>
            <div className="mt-[11px] rounded-xl bg-[#EDE9FE] border border-[#DDD6FE] px-[14px] py-3 flex items-start gap-[10px] text-[#5B21B6] text-xs font-medium leading-[1.6]">
              <Info className="h-4 w-4" />
              <span>{message.trim() || 'Your message preview will appear here as you type.'}</span>
            </div>
            <button
              type="button"
              className="w-full rounded-[14px] py-[14px] px-3 mt-[11px] flex items-center justify-center gap-[9px] text-sm font-semibold tracking-[.02em] bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white disabled:opacity-50 disabled:grayscale-[.25] disabled:cursor-not-allowed"
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
