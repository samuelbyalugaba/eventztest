import { type ReactNode } from 'react';
import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Filter,
  Gift,
  Home,
  Mic,
  Music,
  PlayCircle,
  Radio,
  Ticket,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { BackButton } from '../ui/BackButton';
import { Skeleton } from '../ui/skeleton';
import {
  type ScreenId,
  type DashboardScope,
  type DashboardScan,
  type DashboardTransaction,
  type IconType,
} from './types';
import {
  formatNumber,
  formatMoney,
  formatMoneyShort,
  formatTransactionTime,
  getInitials,
  statusClass,
  transactionAmount,
} from './utils';

export function IconBubble({ children, color = '#7C3AED', soft = '#EDE9FE' }: { children: ReactNode; color?: string; soft?: string }) {
  return (
    <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ color, background: soft }}>
      {children}
    </span>
  );
}

export function TopBar({
  title,
  subtitle,
  initials,
  action,
  onBackToProfile,
}: {
  title: string;
  subtitle: string;
  initials: string;
  action?: ReactNode;
  onBackToProfile?: () => void;
}) {
  return (
    <header className="bg-gradient-to-br from-primary to-[#5B21B6] pt-[calc(14px+var(--eventz-safe-area-top))] px-4 pb-[18px] flex items-center justify-between gap-3 flex-shrink-0">
      <div className="flex items-center gap-[10px] min-w-0">
        {onBackToProfile ? (
          <BackButton className="w-[38px] h-[38px] rounded-full border border-white/32 bg-white/18 flex items-center justify-center text-white flex-shrink-0" onClick={onBackToProfile} />
        ) : (
          <div className="w-[38px] h-[38px] rounded-full bg-white/22 border-2 border-white/35 flex items-center justify-center text-[13px] font-semibold text-white overflow-hidden flex-shrink-0">{initials}</div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white leading-[1.1] truncate">{title}</div>
          <div className="mt-0.5 text-2xs font-medium text-white/68 truncate">{subtitle}</div>
        </div>
      </div>
      {action}
    </header>
  );
}

export function BackTopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="bg-gradient-to-br from-primary to-[#5B21B6] pt-[calc(14px+var(--eventz-safe-area-top))] px-4 pb-[18px] flex items-center gap-3 flex-shrink-0 text-white">
      <BackButton className="w-9 h-9 rounded-full border border-white/25 bg-white/18 inline-flex items-center justify-center text-white flex-shrink-0" onClick={onBack} />
      <div className="text-base font-semibold text-white truncate">{title}</div>
      {right ? <div className="ml-auto">{right}</div> : null}
    </header>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="text-2xs font-semibold text-[#9CA3AF] tracking-[.1em] uppercase my-[18px] mb-[11px]">{children}</div>;
}

export function WalletCard({ eventCount, balance, onWithdraw }: { eventCount: number; balance: number; onWithdraw: () => void }) {
  return (
    <section className="bg-gradient-to-br from-primary to-[#9333EA] rounded-[18px] p-5 mb-[14px] relative overflow-hidden text-white">
      <div className="relative z-[1] text-2xs font-medium text-white/72 flex items-center gap-[6px] mb-[7px] uppercase tracking-[.06em]">
        <CreditCard className="h-3.5 w-3.5" />
        Total wallet balance
      </div>
      <div className="relative z-[1] text-[30px] font-bold tracking-[-1.4px] leading-[1] mb-1">{formatMoney(balance)}</div>
      <div className="relative z-[1] text-2xs font-medium text-white/55 mb-[14px]">
        {eventCount ? `${eventCount} event${eventCount === 1 ? '' : 's'} connected` : 'No events yet'}
      </div>
      <button type="button" className="relative z-[1] inline-flex items-center justify-center gap-[7px] rounded-full border border-white/35 bg-white/18 text-white px-4 py-2 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,.18)]" onClick={onWithdraw}>
        <WalletCards className="h-3.5 w-3.5" />
        Withdraw
      </button>
    </section>
  );
}

export function EventSelector({
  selected,
  allScope,
  scopes,
  eventCount,
  isOpen,
  onToggle,
  onPick,
}: {
  selected: DashboardScope;
  allScope: DashboardScope;
  scopes: DashboardScope[];
  eventCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onPick: (scope: DashboardScope) => void;
}) {
  const options = [allScope, ...scopes];
  return (
    <section className={`relative z-20 bg-white border-b border-[#E5E7EB] px-4 py-3 flex-shrink-0 ${isOpen ? 'border-b-transparent' : ''}`}>
      <div className="text-2xs font-medium text-[#9CA3AF] tracking-[.1em] uppercase mb-[9px] flex items-center gap-[5px]">
        <Filter className="h-3 w-3" />
        Viewing analytics for
      </div>
      <button type="button" className={`w-full flex items-center justify-between gap-[10px] p-3 rounded-xl border-[1.5px] border-[#E5E7EB] bg-input-background ${isOpen ? 'border-primary border-b-transparent rounded-b-none' : ''}`} onClick={onToggle}>
        <span className="flex items-center gap-[11px] min-w-0">
          <span className="w-[10px] h-[10px] rounded-full shadow-[0_0_0_2.5px_#fff,0_0_0_4px_currentColor] flex-shrink-0" style={{ background: selected.color, color: selected.color }} />
          <span className="min-w-0 text-left">
            <span className="block text-sm font-medium text-[#111827] truncate">{selected.name}</span>
            <span className="block mt-0.5 text-2xs text-[#6B7280] truncate">{selected.subtitle}</span>
          </span>
        </span>
        <span className="flex items-center gap-[9px] flex-shrink-0">
          <span className="text-2xs font-medium px-[10px] py-1 rounded-full whitespace-nowrap" style={{ color: selected.color, background: selected.softColor }}>
            {selected.id === 'all' ? `${eventCount} events` : selected.statusLabel}
          </span>
          <span className={`w-[26px] h-[26px] rounded-full bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center transition-transform duration-200 ${isOpen ? 'rotate-180 bg-border text-primary' : ''}`}>
            <ChevronDown className="h-4 w-4" />
          </span>
        </span>
      </button>
      <div className={`absolute left-4 right-4 top-full z-[3] bg-white border-[1.5px] border-primary border-t-0 rounded-b-[14px] overflow-hidden max-h-0 opacity-0 pointer-events-none shadow-[0_16px_40px_rgba(124,58,237,.18)] transition-all duration-200 ease ${isOpen ? 'max-h-[620px] opacity-100 pointer-events-auto' : ''}`}>
        {options.map((scope) => (
          <button
            key={scope.id}
            type="button"
            className={`w-full flex items-center gap-3 px-[14px] py-[13px] border-t border-[#F9FAFB] bg-white ${selected.id === scope.id ? 'bg-[#F5F3FF]' : ''}`}
            onClick={() => onPick(scope)}
          >
            <IconBubble color={scope.color} soft={scope.softColor}>
              {scope.id === 'all' ? <Home className="h-4 w-4" /> : scope.status === 'live' ? <PlayCircle className="h-4 w-4" /> : <Music className="h-4 w-4" />}
            </IconBubble>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-medium text-[#111827] truncate">{scope.name}</span>
              <span className="block mt-0.5 text-2xs text-[#6B7280] truncate">{scope.id === 'all' ? `Combined totals - ${eventCount} events` : scope.subtitle}</span>
            </span>
            <span className="flex flex-col items-end gap-1 pl-1 flex-shrink-0">
              <span className="text-xs font-medium text-[#111827]">{formatMoneyShort(scope.revenue)}</span>
              <span className={statusClass(scope.status)}>{scope.id === 'all' ? 'All' : scope.statusLabel}</span>
            </span>
            {selected.id === scope.id ? <Check className="h-4 w-4 text-primary" /> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

export function MetricCard({
  icon: Icon,
  iconColor,
  label,
  value,
  delta,
  onClick,
}: {
  icon: IconType;
  iconColor: string;
  label: string;
  value: string;
  delta: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="relative min-h-[104px] text-left bg-white border-[1.5px] border-[#E9EBF0] rounded-[16px] p-[15px] transition-transform duration-100" onClick={onClick}>
      <div className="text-2xs font-semibold text-[#6B7280] flex items-center gap-[6px] mb-2">
        <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
        {label}
      </div>
      <div className="text-xl font-semibold text-[#111827] tracking-[-.5px] leading-[1] mb-[6px]">{value}</div>
      <div className="text-2xs font-medium text-[#059669] flex items-center gap-1">
        <TrendingUp className="h-3 w-3" />
        {delta}
      </div>
      {onClick ? <ChevronRight className="absolute right-3 top-[13px] text-[#D1D5DB] h-4 w-4" /> : null}
    </button>
  );
}

export function RangeTabs({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ranges = ['7d', '30d', '90d', 'All time'];
  return (
    <div className="flex bg-[#E5E7EB] rounded-full p-[3px] gap-0.5 mb-4">
      {ranges.map((range) => (
        <button key={range} type="button" className={`flex-1 rounded-full py-[7px] text-xs font-medium text-[#6B7280] text-center ${value === range ? 'bg-white text-primary shadow-[0_2px_8px_rgba(0,0,0,.1)]' : ''}`} onClick={() => onChange(range)}>
          {range}
        </button>
      ))}
    </div>
  );
}

export function RevenueChart({ scope }: { scope: DashboardScope }) {
  const rows = [
    ['Ticket revenue', scope.revenue, '#7C3AED'],
    ['Wallet balance available', scope.available, '#059669'],
    ['Gifts received', scope.gifts, '#D97706'],
  ] as const;
  const visibleRows = rows.filter(([, value]) => value > 0);
  const max = Math.max(...visibleRows.map(([, value]) => value), 1);
  return (
    <div className="bg-white border border-[#E9EBF0] rounded-[18px] p-[17px] mb-[13px]">
      <div className="text-sm font-medium text-[#111827] flex items-center justify-between gap-[10px] mb-[15px]">
        <span className="flex items-center gap-2 min-w-0">
          <TrendingUp className="h-4 w-4 text-gray-500" />
          Revenue summary
        </span>
      </div>
      {visibleRows.length ? (
        visibleRows.map(([label, value, color]) => (
          <div className="grid grid-cols-[minmax(92px,1fr)_minmax(84px,1.2fr)_auto] items-center gap-[10px] mb-[11px] last:mb-0" key={label}>
            <span className="text-xs font-medium text-[#6B7280] min-w-0">{label}</span>
            <b className="h-[7px] bg-[#F3F4F6] rounded-full overflow-hidden">
              <i style={{ width: `${Math.round((value / max) * 100)}%`, background: color }} className="block h-full rounded-full" />
            </b>
            <strong className="text-xs font-semibold text-[#111827] whitespace-nowrap">{formatMoney(value)}</strong>
          </div>
        ))
      ) : (
        <div className="border border-dashed border-[#E5E7EB] bg-input-background rounded-xl py-[18px] px-[18px] text-center text-[#6B7280] text-xs font-medium">Revenue history will appear after ticket payments are recorded.</div>
      )}
    </div>
  );
}

export function TierRows({ scope }: { scope: DashboardScope }) {
  return (
    <div className="bg-white border border-[#E9EBF0] rounded-[18px] p-[17px] mb-[13px]">
      <div className="text-sm font-medium text-[#111827] flex items-center justify-between gap-[10px] mb-[15px]">
        <span className="flex items-center gap-2 min-w-0">
          <Ticket className="h-4 w-4 text-gray-500" />
          Sales by tier
        </span>
        <small className="text-2xs font-medium text-[#6B7280]">{formatNumber(scope.tickets)} total</small>
      </div>
      {scope.tiers.length ? (
        scope.tiers.map((tier) => {
          const percent = scope.tickets ? Math.round((tier.tickets / scope.tickets) * 100) : 0;
          return (
            <div className="flex items-center gap-[10px] mb-[11px] last:mb-0" key={tier.name}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tier.color }} />
              <span className="text-xs font-medium text-[#111827] flex-1 min-w-0 truncate">{tier.name}</span>
              <span className="w-16 h-[5px] bg-[#F3F4F6] rounded-full overflow-hidden flex-shrink-0">
                <span style={{ width: `${percent}%`, background: tier.color }} className="block h-full rounded-full" />
              </span>
              <strong className="text-xs font-semibold text-[#111827] min-w-[30px] text-right">{formatNumber(tier.tickets)}</strong>
              <em className="text-2xs text-[#6B7280] min-w-[28px] text-right not-italic">{percent}%</em>
            </div>
          );
        })
      ) : (
        <div className="border border-dashed border-[#E5E7EB] bg-input-background rounded-xl py-[18px] px-[18px] text-center text-[#6B7280] text-xs font-medium">Ticket tier sales will appear after tickets are sold.</div>
      )}
    </div>
  );
}

export function FunnelCard({ scope }: { scope: DashboardScope }) {
  const rows = [
    ['Event page views', scope.pageViews],
    ['Checkout started', scope.checkoutStarts],
    ['Tickets sold', scope.tickets],
  ] as const;
  const visibleRows = rows.filter(([, value]) => value > 0);
  const max = Math.max(...visibleRows.map(([, value]) => value), 1);
  return (
    <div className="bg-white border border-[#E9EBF0] rounded-[18px] p-[17px] mb-[13px]">
      <div className="text-sm font-medium text-[#111827] flex items-center justify-between gap-[10px] mb-[15px]">
        <span className="flex items-center gap-2 min-w-0">
          <Filter className="h-4 w-4 text-gray-500" />
          Conversion funnel
        </span>
      </div>
      {visibleRows.length ? (
        visibleRows.map(([label, value]) => (
          <div className="flex items-center gap-[10px] mb-[10px] last:mb-0" key={label}>
            <span className="text-2xs font-medium text-[#6B7280] min-w-[98px]">{label}</span>
            <b className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden flex-1">
              <i style={{ width: `${Math.round((value / max) * 100)}%` }} className="block h-full rounded-full bg-primary" />
            </b>
            <strong className="text-2xs font-semibold text-[#111827] min-w-[38px] text-right">{formatNumber(value)}</strong>
          </div>
        ))
      ) : (
        <div className="border border-dashed border-[#E5E7EB] bg-input-background rounded-xl py-[18px] px-[18px] text-center text-[#6B7280] text-xs font-medium">Conversion data is not available yet.</div>
      )}
    </div>
  );
}

export function CheckInFeed({ scans }: { scans: DashboardScan[] }) {
  const visibleScans = scans.slice(0, 8);
  return (
    <div className="bg-white border border-[#E9EBF0] rounded-[18px] p-[17px] mb-[13px]">
      <div className="text-sm font-medium text-[#111827] flex items-center justify-between gap-[10px] mb-[15px]">
        <span className="flex items-center gap-2 min-w-0">
          <Radio className="h-4 w-4 text-gray-500" />
          Recent scan feed
        </span>
      </div>
      {visibleScans.length ? (
        visibleScans.map((scan) => (
          <div className="flex items-center gap-[10px] py-[10px] border-b border-[#F4F5F7] last:border-b-0 last:pb-0" key={scan.id}>
            <span className="w-[34px] h-[34px] rounded-full bg-[#F3F4F6] flex items-center justify-center text-[10px] font-bold text-[#374151] flex-shrink-0">{getInitials(scan.customer_name || 'Guest')}</span>
            <div className="flex-1 min-w-0">
              <strong className="block text-xs font-semibold text-[#111827]">{scan.customer_name || 'Guest'}</strong>
              <small className="block mt-0.5 text-2xs text-[#9CA3AF]">{scan.ticket_type || 'Ticket'}</small>
            </div>
            <em className="text-2xs text-[#9CA3AF] not-italic ml-auto">{scan.scanned_at ? new Date(scan.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</em>
            <Check className="h-4 w-4 text-emerald-600" />
          </div>
        ))
      ) : (
        <div className="border border-dashed border-[#E5E7EB] bg-input-background rounded-xl py-[18px] px-[18px] text-center text-[#6B7280] text-xs font-medium">Recent scans will appear after QR check-ins.</div>
      )}
    </div>
  );
}

export function BottomNav({ active, onGo }: { active: ScreenId; onGo: (screen: ScreenId) => void }) {
  const items: Array<[ScreenId, string, IconType]> = [
    ['dash', 'Dashboard', Home],
    ['events', 'Events', Calendar],
    ['stream', 'Live', PlayCircle],
    ['notify', 'Notify', Bell],
    ['payouts', 'Payouts', CreditCard],
  ];
  return (
    <nav className="bg-white border-t border-[#E5E7EB] flex pt-[10px] pb-[calc(15px+var(--eventz-safe-area-bottom))] flex-shrink-0">
      {items.map(([screen, label, Icon]) => (
        <button key={screen} type="button" className={`flex-1 flex flex-col items-center gap-[0.125rem] text-[#6B7280] text-xs font-medium ${active === screen ? 'text-primary' : ''}`} onClick={() => onGo(screen)}>
          <Icon className="h-[22px] w-[22px]" />
          <i className={`w-1 h-1 rounded-full bg-primary ${active === screen ? '' : 'opacity-0'}`} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function DashboardMenu({ onClose, onNav }: { onClose: () => void; onNav: (screen: ScreenId) => void }) {
  const items: Array<[ScreenId, string, IconType]> = [
    ['dash', 'Dashboard', Home],
    ['events', 'Events', Calendar],
    ['stream', 'Live', PlayCircle],
    ['notify', 'Notify', Bell],
    ['payouts', 'Payouts', CreditCard],
  ];
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed right-3 top-[70px] z-50 w-56 rounded-2xl bg-white py-2 shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-border">
        {items.map(([screenId, label, Icon]) => (
          <button
            key={screenId}
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
            onClick={() => { onClose(); onNav(screenId); }}
          >
            <Icon className="h-[18px] w-[18px] text-primary" />
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

export function StatBox({ label, value, note, muted = false }: { label: string; value: string; note: string; muted?: boolean }) {
  return (
    <div className="bg-input-background border border-[#E9EBF0] rounded-[14px] p-[14px]">
      <span className="block text-2xs font-medium text-[#6B7280] mb-[6px]">{label}</span>
      <strong className="block text-xl font-semibold text-[#111827] tracking-[-.3px] leading-[1.1]">{value}</strong>
      <em className={`block mt-[5px] text-2xs font-medium text-[#059669] not-italic ${muted ? 'text-[#9CA3AF]' : ''}`}>{note}</em>
    </div>
  );
}

export function InfoRow({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-[10px] py-[10px] border-b border-[#F4F5F7] last:border-b-0 last:pb-0">
      <span className="flex items-center gap-[7px] text-xs font-medium text-[#6B7280] min-w-0">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <strong className="text-xs font-semibold text-[#111827] whitespace-nowrap">{value}</strong>
    </div>
  );
}

export function GiftList({ gifts }: { gifts: DashboardTransaction[] }) {
  const total = gifts.reduce((sum, transaction) => sum + transactionAmount(transaction), 0);
  if (!gifts.length) {
    return (
      <div className="bg-white border border-[#E9EBF0] rounded-[18px] p-[17px] mb-[13px]">
        <div className="text-sm font-medium text-[#111827] flex items-center justify-between gap-[10px] mb-[15px]">
          <span className="flex items-center gap-2 min-w-0">
            <Gift className="h-4 w-4 text-amber-600" />
            Fan gifts
          </span>
          <span className="text-2xs font-semibold text-[#059669] bg-[#D1FAE5] px-[10px] py-1 rounded-full">TZS 0 total</span>
        </div>
        <div className="border border-dashed border-[#E5E7EB] bg-input-background rounded-xl py-[18px] px-[18px] text-center text-[#6B7280] text-xs font-medium">No gifts received yet.</div>
      </div>
    );
  }
  return (
    <div className="bg-white border border-[#E9EBF0] rounded-[18px] p-[17px] mb-[13px]">
      <div className="text-sm font-medium text-[#111827] flex items-center justify-between gap-[10px] mb-[15px]">
        <span className="flex items-center gap-2 min-w-0">
          <Gift className="h-4 w-4 text-amber-600" />
          Fan gifts
        </span>
        <span className="text-2xs font-semibold text-[#059669] bg-[#D1FAE5] px-[10px] py-1 rounded-full">{formatMoney(total)} total</span>
      </div>
      {gifts.map((gift) => {
        const senderName = gift.metadata?.senderName || gift.metadata?.sender_name || gift.metadata?.senderUsername || 'Fan';
        return (
        <div className="flex items-center gap-[10px] py-[10px] border-b border-[#F4F5F7] last:border-b-0 last:pb-0" key={gift.id}>
          <span className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] flex items-center justify-center text-[10px] font-bold text-primary-dark flex-shrink-0">{getInitials(senderName)}</span>
          <div className="flex-1 min-w-0">
            <strong className="block text-xs font-semibold text-[#111827]">{senderName}</strong>
            <small className="block mt-0.5 text-2xs text-[#9CA3AF]">{formatTransactionTime(gift.created_at) || 'Gift received'}</small>
          </div>
          <em className="text-sm font-semibold text-[#059669] not-italic">{formatMoney(transactionAmount(gift))}</em>
        </div>
        );
      })}
    </div>
  );
}

export function EventRow({ scope, onClick }: { scope: DashboardScope; onClick: () => void }) {
  const Icon = scope.status === 'live' ? PlayCircle : scope.status === 'completed' ? Mic : Music;
  return (
    <button type="button" className="w-full flex items-center gap-3 p-[14px] bg-white border-[1.5px] border-[#E9EBF0] rounded-[16px] mb-[10px]" onClick={onClick}>
      <IconBubble color={scope.color} soft={scope.softColor}>
        <Icon className="h-4 w-4" />
      </IconBubble>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold text-[#111827] truncate">{scope.name}</span>
        <span className="block mt-[3px] text-2xs text-[#6B7280] truncate">
          {scope.subtitle} - {formatNumber(scope.tickets)} tickets
        </span>
      </span>
      <span className="flex flex-col items-end gap-1 flex-shrink-0">
        <strong className="text-sm font-semibold text-[#111827]">{formatMoneyShort(scope.revenue)}</strong>
        <span className={statusClass(scope.status)}>{scope.statusLabel}</span>
      </span>
    </button>
  );
}

export function EmptyCard({ children }: { children: ReactNode }) {
  return <div className="border border-dashed border-[#D1D5DB] bg-white rounded-[16px] p-7 text-center text-sm font-medium text-[#6B7280]">{children}</div>;
}

export function DashboardLoading() {
  return (
    <>
      <header className="bg-gradient-to-br from-primary to-[#5B21B6] pt-[calc(14px+var(--eventz-safe-area-top))] px-4 pb-[18px] flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-[10px] min-w-0">
          <Skeleton.Circle className="h-[38px] w-[38px] bg-white/30" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-[150px] rounded-full bg-white/40" />
            <Skeleton className="h-3 w-[108px] rounded-full bg-white/25" />
          </div>
        </div>
        <Skeleton className="h-[38px] w-[38px] rounded-full bg-white/25" />
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-[14px] pb-[calc(86px+var(--eventz-safe-area-bottom))]">
          <Skeleton className="mb-4 h-[154px] rounded-[18px]" />
          <div className="grid grid-cols-2 gap-[10px] mb-4">
            <Skeleton className="h-[104px] rounded-[16px]" />
            <Skeleton className="h-[104px] rounded-[16px]" />
            <Skeleton className="h-[104px] rounded-[16px]" />
            <Skeleton className="h-[104px] rounded-[16px]" />
          </div>
        </div>
      </div>
    </>
  );
}

export function DashboardModalFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    </div>
  );
}
