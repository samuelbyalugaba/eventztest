import { type ReactNode, type CSSProperties, type ComponentType } from 'react';
import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Eye,
  Filter,
  Gift,
  Globe2,
  Home,
  Info,
  Lock,
  Menu,
  MessageCircle,
  Mic,
  Music,
  PlayCircle,
  Radio,
  Ticket,
  TrendingUp,
  Users,
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
  formatShort,
  formatTransactionTime,
  getInitials,
  statusClass,
  transactionAmount,
} from './utils';
import '../../styles/dashboard.css';

export function IconBubble({ children, color = '#7C3AED', soft = '#EDE9FE' }: { children: ReactNode; color?: string; soft?: string }) {
  return (
    <span className="dash-icon-bubble" style={{ color, background: soft }}>
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
    <header className="dash-topbar">
      <div className="dash-top-id">
        {onBackToProfile ? (
          <BackButton className="dash-top-back" onClick={onBackToProfile} />
        ) : (
          <div className="dash-avatar">{initials}</div>
        )}
        <div className="min-w-0">
          <div className="dash-top-name">{title}</div>
          <div className="dash-top-sub">{subtitle}</div>
        </div>
      </div>
      {action}
    </header>
  );
}

export function BackTopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="dash-backbar">
      <BackButton className="dash-back-btn" onClick={onBack} />
      <div className="dash-page-title">{title}</div>
      {right ? <div className="ml-auto">{right}</div> : null}
    </header>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="dash-section-title">{children}</div>;
}

export function WalletCard({ eventCount, balance, onWithdraw }: { eventCount: number; balance: number; onWithdraw: () => void }) {
  return (
    <section className="dash-wallet-card">
      <div className="dash-wallet-label">
        <CreditCard className="h-3.5 w-3.5" />
        Total wallet balance
      </div>
      <div className="dash-wallet-amount">{formatMoney(balance)}</div>
      <div className="dash-wallet-scope">
        {eventCount ? `${eventCount} organizer event${eventCount === 1 ? '' : 's'} connected` : 'No organizer events yet'}
      </div>
      <button type="button" className="dash-wallet-withdraw" onClick={onWithdraw}>
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
    <section className={`dash-filter-dock ${isOpen ? 'open' : ''}`}>
      <div className="dash-filter-label">
        <Filter className="h-3 w-3" />
        Viewing analytics for
      </div>
      <button type="button" className={`dash-selector ${isOpen ? 'open' : ''}`} onClick={onToggle}>
        <span className="dash-selector-left">
          <span className="dash-selector-dot" style={{ background: selected.color, color: selected.color }} />
          <span className="min-w-0 text-left">
            <span className="dash-selector-name">{selected.name}</span>
            <span className="dash-selector-sub">{selected.subtitle}</span>
          </span>
        </span>
        <span className="dash-selector-right">
          <span className="dash-selector-pill" style={{ color: selected.color, background: selected.softColor }}>
            {selected.id === 'all' ? `${eventCount} events` : selected.statusLabel}
          </span>
          <span className={`dash-chevron ${isOpen ? 'open' : ''}`}>
            <ChevronDown className="h-4 w-4" />
          </span>
        </span>
      </button>
      <div className={`dash-dropdown ${isOpen ? 'open' : ''}`}>
        {options.map((scope) => (
          <button
            key={scope.id}
            type="button"
            className={`dash-dropdown-row ${selected.id === scope.id ? 'on' : ''}`}
            onClick={() => onPick(scope)}
          >
            <IconBubble color={scope.color} soft={scope.softColor}>
              {scope.id === 'all' ? <Home className="h-4 w-4" /> : scope.status === 'live' ? <PlayCircle className="h-4 w-4" /> : <Music className="h-4 w-4" />}
            </IconBubble>
            <span className="min-w-0 flex-1 text-left">
              <span className="dash-dropdown-name">{scope.name}</span>
              <span className="dash-dropdown-meta">{scope.id === 'all' ? `Combined totals - ${eventCount} events` : scope.subtitle}</span>
            </span>
            <span className="dash-dropdown-side">
              <span className="dash-dropdown-money">{formatMoneyShort(scope.revenue)}</span>
              <span className={statusClass(scope.status)}>{scope.id === 'all' ? 'All' : scope.statusLabel}</span>
            </span>
            {selected.id === scope.id ? <Check className="h-4 w-4 text-[#7C3AED]" /> : null}
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
    <button type="button" className={`dash-kcard ${onClick ? '' : 'plain'}`} onClick={onClick}>
      <div className="dash-klabel">
        <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
        {label}
      </div>
      <div className="dash-kvalue">{value}</div>
      <div className="dash-kdelta">
        <TrendingUp className="h-3 w-3" />
        {delta}
      </div>
      {onClick ? <ChevronRight className="dash-kchev h-4 w-4" /> : null}
    </button>
  );
}

export function RangeTabs({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ranges = ['7d', '30d', '90d', 'All time'];
  return (
    <div className="dash-range-row">
      {ranges.map((range) => (
        <button key={range} type="button" className={`dash-range ${value === range ? 'on' : ''}`} onClick={() => onChange(range)}>
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
    <div className="dash-card">
      <div className="dash-card-title">
        <span>
          <TrendingUp className="h-4 w-4 text-gray-500" />
          Revenue summary
        </span>
      </div>
      {visibleRows.length ? (
        visibleRows.map(([label, value, color]) => (
          <div className="dash-summary-row" key={label}>
            <span>{label}</span>
            <b>
              <i style={{ width: `${Math.round((value / max) * 100)}%`, background: color }} />
            </b>
            <strong>{formatMoney(value)}</strong>
          </div>
        ))
      ) : (
        <div className="dash-empty-inline">Revenue history will appear after ticket payments are recorded.</div>
      )}
    </div>
  );
}

export function TierRows({ scope }: { scope: DashboardScope }) {
  return (
    <div className="dash-card">
      <div className="dash-card-title">
        <span>
          <Ticket className="h-4 w-4 text-gray-500" />
          Sales by tier
        </span>
        <small>{formatNumber(scope.tickets)} total</small>
      </div>
      {scope.tiers.length ? (
        scope.tiers.map((tier) => {
          const percent = scope.tickets ? Math.round((tier.tickets / scope.tickets) * 100) : 0;
          return (
            <div className="dash-tier-row" key={tier.name}>
              <span className="dash-tier-dot" style={{ background: tier.color }} />
              <span className="dash-tier-name">{tier.name}</span>
              <span className="dash-tier-track">
                <span style={{ width: `${percent}%`, background: tier.color }} />
              </span>
              <strong>{formatNumber(tier.tickets)}</strong>
              <em>{percent}%</em>
            </div>
          );
        })
      ) : (
        <div className="dash-empty-inline">Ticket tier sales will appear after tickets are sold.</div>
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
    <div className="dash-card">
      <div className="dash-card-title">
        <span>
          <Filter className="h-4 w-4 text-gray-500" />
          Conversion funnel
        </span>
      </div>
      {visibleRows.length ? (
        visibleRows.map(([label, value]) => (
          <div className="dash-funnel-row" key={label}>
            <span>{label}</span>
            <b>
              <i style={{ width: `${Math.round((value / max) * 100)}%` }} />
            </b>
            <strong>{formatNumber(value)}</strong>
          </div>
        ))
      ) : (
        <div className="dash-empty-inline">Conversion data is not available yet.</div>
      )}
    </div>
  );
}

export function CheckInFeed({ scans }: { scans: DashboardScan[] }) {
  const visibleScans = scans.slice(0, 8);
  return (
    <div className="dash-card">
      <div className="dash-card-title">
        <span>
          <Radio className="h-4 w-4 text-gray-500" />
          Recent scan feed
        </span>
      </div>
      {visibleScans.length ? (
        visibleScans.map((scan) => (
          <div className="dash-check-row" key={scan.id}>
            <span>{getInitials(scan.customer_name || 'Guest')}</span>
            <div>
              <strong>{scan.customer_name || 'Guest'}</strong>
              <small>{scan.ticket_type || 'Ticket'}</small>
            </div>
            <em>{scan.scanned_at ? new Date(scan.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</em>
            <Check className="h-4 w-4 text-emerald-600" />
          </div>
        ))
      ) : (
        <div className="dash-empty-inline">Recent scans will appear after QR check-ins.</div>
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
    <nav className="dash-bottom-nav">
      {items.map(([screen, label, Icon]) => (
        <button key={screen} type="button" className={`dash-nav-item ${active === screen ? 'active' : ''}`} onClick={() => onGo(screen)}>
          <Icon className="h-[22px] w-[22px]" />
          <i />
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
      <div className="fixed right-3 top-[70px] z-50 w-56 rounded-2xl bg-white py-2 shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-[#EDE9FE]">
        {items.map(([screenId, label, Icon]) => (
          <button
            key={screenId}
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#1A0533] hover:bg-[#F4F1FF] transition-colors"
            onClick={() => { onClose(); onNav(screenId); }}
          >
            <Icon className="h-[18px] w-[18px] text-[#7C3AED]" />
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

export function StatBox({ label, value, note, muted = false }: { label: string; value: string; note: string; muted?: boolean }) {
  return (
    <div className="dash-stat-box">
      <span>{label}</span>
      <strong>{value}</strong>
      <em className={muted ? 'muted' : ''}>{note}</em>
    </div>
  );
}

export function InfoRow({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  return (
    <div className="dash-info-row">
      <span>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

export function GiftList({ gifts }: { gifts: DashboardTransaction[] }) {
  const total = gifts.reduce((sum, transaction) => sum + transactionAmount(transaction), 0);
  if (!gifts.length) {
    return (
      <div className="dash-card">
        <div className="dash-card-title">
          <span>
            <Gift className="h-4 w-4 text-amber-600" />
            Fan gifts
          </span>
          <span className="dash-green-badge">TZS 0 total</span>
        </div>
        <div className="dash-empty-inline">No gifts received yet.</div>
      </div>
    );
  }
  return (
    <div className="dash-card">
      <div className="dash-card-title">
        <span>
          <Gift className="h-4 w-4 text-amber-600" />
          Fan gifts
        </span>
        <span className="dash-green-badge">{formatMoney(total)} total</span>
      </div>
      {gifts.map((gift) => {
        const senderName = gift.metadata?.senderName || gift.metadata?.sender_name || gift.metadata?.senderUsername || 'Fan';
        return (
        <div className="dash-gift-row" key={gift.id}>
          <span>{getInitials(senderName)}</span>
          <div>
            <strong>{senderName}</strong>
            <small>{formatTransactionTime(gift.created_at) || 'Gift received'}</small>
          </div>
          <em>{formatMoney(transactionAmount(gift))}</em>
        </div>
        );
      })}
    </div>
  );
}

export function EventRow({ scope, onClick }: { scope: DashboardScope; onClick: () => void }) {
  const Icon = scope.status === 'live' ? PlayCircle : scope.status === 'completed' ? Mic : Music;
  return (
    <button type="button" className="dash-event-row" onClick={onClick}>
      <IconBubble color={scope.color} soft={scope.softColor}>
        <Icon className="h-4 w-4" />
      </IconBubble>
      <span className="min-w-0 flex-1 text-left">
        <span className="dash-event-name">{scope.name}</span>
        <span className="dash-event-meta">
          {scope.subtitle} - {formatNumber(scope.tickets)} tickets
        </span>
      </span>
      <span className="dash-event-side">
        <strong>{formatMoneyShort(scope.revenue)}</strong>
        <span className={statusClass(scope.status)}>{scope.statusLabel}</span>
      </span>
    </button>
  );
}

export function EmptyCard({ children }: { children: ReactNode }) {
  return <div className="dash-empty-card">{children}</div>;
}

export function DashboardLoading() {
  return (
    <>
      <header className="dash-topbar">
        <div className="dash-top-id">
          <Skeleton.Circle className="h-[38px] w-[38px] bg-white/30" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-[150px] rounded-full bg-white/40" />
            <Skeleton className="h-3 w-[108px] rounded-full bg-white/25" />
          </div>
        </div>
        <Skeleton className="h-[38px] w-[38px] rounded-full bg-white/25" />
      </header>
      <div className="dash-scroll">
        <div className="dash-pad">
          <Skeleton className="mb-4 h-[154px] rounded-[18px]" />
          <div className="dash-kgrid">
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
