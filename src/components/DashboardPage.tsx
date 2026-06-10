import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
  MessageCircle,
  Mic,
  Music,
  PlayCircle,
  Plus,
  QrCode,
  Radio,
  Send,
  Ticket,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { getOrganizerEvents, getOrganizerStats, type Event as ApiEvent } from '../utils/supabase/api';
import { getLocalWalletBalance } from '../utils/ntzs-api';

const TicketScannerModal = lazy(() => import('./TicketScannerModal').then((module) => ({ default: module.TicketScannerModal })));
const WalletModal = lazy(() => import('./WalletModal').then((module) => ({ default: module.WalletModal })));

type ScreenId =
  | 'dash'
  | 'events'
  | 'stream'
  | 'notify'
  | 'payouts'
  | 'tickets'
  | 'revenue'
  | 'gifts'
  | 'event-detail';

type DashboardStats = {
  totalEvents: number;
  followers: number;
  totalViews: number;
  revenue: number;
  liveStreams: number;
  ticketsSold: number;
};

type ScopeStatus = 'live' | 'upcoming' | 'completed';

type DashboardTier = {
  name: string;
  tickets: number;
  revenue: number;
  color: string;
};

type DashboardScan = {
  id: string | number;
  event_id: number;
  customer_name?: string | null;
  ticket_type?: string | null;
  scanned_at?: string | null;
};

type DashboardTicket = {
  id: string | number;
  event_id: number;
  price?: string | number | null;
  purchase_date?: string | null;
  ticket_type?: string | null;
  status?: string | null;
  customer_name?: string | null;
  scanned_at?: string | null;
};

type DashboardTransaction = {
  id: string | number;
  event_id?: number | null;
  amount: number;
  currency?: string | null;
  provider?: string | null;
  status?: string | null;
  created_at?: string | null;
  metadata?: any;
};

type DashboardScope = {
  id: string;
  routeId?: number;
  name: string;
  subtitle: string;
  location: string;
  status: ScopeStatus;
  statusLabel: string;
  color: string;
  softColor: string;
  revenue: number;
  available: number;
  locked: number;
  tickets: number;
  virtualTickets: number;
  viewers: number;
  peakViewers: number;
  gifts: number;
  followers: number;
  pageViews: number;
  checkoutStarts: number;
  tiers: DashboardTier[];
};

type IconType = ComponentType<{ className?: string; style?: CSSProperties }>;

const defaultStats: DashboardStats = {
  totalEvents: 0,
  followers: 0,
  totalViews: 0,
  revenue: 0,
  liveStreams: 0,
  ticketsSold: 0,
};

const ranges = ['7d', '30d', '90d', 'All time'];
const tierColors = ['#7C3AED', '#D97706', '#059669', '#0891B2', '#DB2777', '#2563EB'];

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(value || 0)));

const formatShort = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return formatNumber(value);
};

const formatMoney = (value: number) => `TZS ${formatNumber(value)}`;
const formatMoneyShort = (value: number) => `TZS ${formatShort(value)}`;

const getRangeStart = (range: string) => {
  if (range === 'All time') return null;
  const days = Number.parseInt(range, 10);
  if (!Number.isFinite(days)) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - Math.max(0, days - 1));
  return start;
};

const dateInRange = (value: string | number | Date | null | undefined, rangeStart: Date | null) => {
  if (!rangeStart) return true;
  if (!value) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date >= rangeStart;
};

const transactionAmount = (transaction: DashboardTransaction) => parseMoneyValue(transaction.amount);

const transactionType = (transaction: DashboardTransaction) => {
  const type = transaction.metadata?.type;
  return typeof type === 'string' ? type.trim() : '';
};

const isCompletedTransaction = (transaction: DashboardTransaction) => {
  const status = String(transaction.status || '').toLowerCase();
  return status === 'completed' || status === 'success';
};

const isGiftTransaction = (transaction: DashboardTransaction) => transactionType(transaction) === 'gift-received' && isCompletedTransaction(transaction);
const isWithdrawalTransaction = (transaction: DashboardTransaction) => transactionType(transaction) === 'withdrawal';

const formatTransactionTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const getInitials = (name?: string | null) => {
  const words = (name || 'Eventz').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'EV';
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
};

const statusClass = (status: ScopeStatus) => {
  if (status === 'live') return 'dash-pill dash-pill-live';
  if (status === 'upcoming') return 'dash-pill dash-pill-soon';
  return 'dash-pill dash-pill-done';
};

const parseMoneyValue = (value?: string | number | null) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const numeric = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

function mapOrganizerEvent(event: ApiEvent, index: number, tickets: DashboardTicket[] = []): DashboardScope {
  const eventDate = event.date ? new Date(event.date) : null;
  const isPast = !!eventDate && !Number.isNaN(eventDate.getTime()) && eventDate < new Date();
  const isLive = !!event.streaming?.isLive;
  const groupedTickets = new Map<string, DashboardTier>();
  tickets.forEach((ticket) => {
    const name = ticket.ticket_type || 'Ticket';
    const current = groupedTickets.get(name);
    const revenue = parseMoneyValue(ticket.price);
    if (current) {
      current.tickets += 1;
      current.revenue += revenue;
      return;
    }
    groupedTickets.set(name, {
      name,
      tickets: 1,
      revenue,
      color: tierColors[groupedTickets.size % tierColors.length],
    });
  });
  const tierRows = Array.from(groupedTickets.values());
  const ticketCount = tickets.length;
  const ticketRevenue = tierRows.reduce((sum, tier) => sum + tier.revenue, 0);
  const liveViewers = isLive ? Math.max(0, Number(event.streaming?.liveViewers || 0)) : 0;
  const peakViewers = isLive
    ? Math.max(liveViewers, Number((event.streaming as any)?.peakViewers || (event.streaming as any)?.peak_viewers || 0))
    : 0;
  const pageViews = Math.max(0, Number(event.views || 0));
  const checkoutStarts = Number((event as any).checkout_starts ?? (event as any).checkoutStarts ?? 0);
  const scopeTiers = tierRows.length
    ? tierRows
    : (event.ticket_tiers || []).map((tier, tierIndex) => ({
      name: tier.name || `Tier ${tierIndex + 1}`,
      tickets: 0,
      revenue: 0,
      color: tier.color || tierColors[tierIndex % tierColors.length],
    }));

  return {
    id: `event-${event.id}`,
    routeId: event.id,
    name: event.title || `Event ${index + 1}`,
    subtitle: `${event.date || 'Upcoming'} - ${event.location || event.city || 'Location pending'}`,
    location: event.location || event.city || 'Location pending',
    status: isLive ? 'live' : isPast ? 'completed' : 'upcoming',
    statusLabel: isLive ? 'Live now' : isPast ? 'Completed' : 'Upcoming',
    color: isLive ? '#15803D' : isPast ? '#6B7280' : '#7C3AED',
    softColor: isLive ? '#DCFCE7' : isPast ? '#F3F4F6' : '#EDE9FE',
    revenue: ticketRevenue,
    available: 0,
    locked: 0,
    tickets: ticketCount,
    virtualTickets: tickets.filter((ticket) => String(ticket.ticket_type || '').toLowerCase().includes('virtual')).length,
    viewers: liveViewers,
    peakViewers,
    gifts: 0,
    followers: 0,
    pageViews,
    checkoutStarts: Number.isFinite(checkoutStarts) ? Math.max(0, checkoutStarts) : 0,
    tiers: scopeTiers,
  };
}

function IconBubble({ children, color = '#7C3AED', soft = '#EDE9FE' }: { children: ReactNode; color?: string; soft?: string }) {
  return (
    <span className="dash-icon-bubble" style={{ color, background: soft }}>
      {children}
    </span>
  );
}

function TopBar({
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
          <button type="button" className="dash-top-back" onClick={onBackToProfile} aria-label="Back to profile">
            <ArrowLeft className="h-5 w-5" />
          </button>
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

function BackTopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="dash-backbar">
      <button type="button" className="dash-back-btn" onClick={onBack} aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="dash-page-title">{title}</div>
      {right ? <div className="ml-auto">{right}</div> : null}
    </header>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="dash-section-title">{children}</div>;
}

function WalletCard({ eventCount, balance, onWithdraw }: { eventCount: number; balance: number; onWithdraw: () => void }) {
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

function EventSelector({
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

function MetricCard({
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

function RangeTabs({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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

function RevenueChart({ scope }: { scope: DashboardScope }) {
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

function TierRows({ scope }: { scope: DashboardScope }) {
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

function FunnelCard({ scope }: { scope: DashboardScope }) {
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

function CheckInFeed({ scans }: { scans: DashboardScan[] }) {
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

function BottomNav({ active, onGo }: { active: ScreenId; onGo: (screen: ScreenId) => void }) {
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

function DashboardHome({
  selected,
  eventCount,
  walletBalance,
  scans,
  range,
  onRange,
  onGo,
  onWithdraw,
}: {
  selected: DashboardScope;
  eventCount: number;
  walletBalance: number;
  scans: DashboardScan[];
  range: string;
  onRange: (value: string) => void;
  onGo: (screen: ScreenId) => void;
  onWithdraw: () => void;
}) {
  return (
    <div className="dash-scroll">
      <div className="dash-pad">
        <WalletCard eventCount={eventCount} balance={walletBalance} onWithdraw={onWithdraw} />
        <RangeTabs value={range} onChange={onRange} />

        <SectionTitle>Overview - {selected.id === 'all' ? 'all events' : selected.name}</SectionTitle>
        <div className="dash-kgrid">
          <MetricCard icon={Ticket} iconColor="#7C3AED" label="Tickets sold" value={formatNumber(selected.tickets)} delta="From tickets table" onClick={() => onGo('tickets')} />
          <MetricCard icon={CreditCard} iconColor="#059669" label="Revenue" value={formatMoneyShort(selected.revenue)} delta="From tickets table" onClick={() => onGo('revenue')} />
          <MetricCard icon={PlayCircle} iconColor="#2563EB" label="Live viewers" value={formatNumber(selected.viewers)} delta={selected.status === 'live' ? 'Live now' : 'No live stream now'} onClick={() => onGo('stream')} />
          <MetricCard icon={Gift} iconColor="#D97706" label="Gifts received" value={formatMoneyShort(selected.gifts)} delta={selected.gifts ? 'From transactions' : 'No gifts yet'} onClick={() => onGo('gifts')} />
          <MetricCard icon={Users} iconColor="#7C3AED" label="Followers" value={formatNumber(selected.followers)} delta="From followers table" />
          <MetricCard icon={Globe2} iconColor="#0891B2" label="Virtual tickets" value={formatNumber(selected.virtualTickets)} delta="From event stream settings" />
        </div>

        <SectionTitle>Revenue chart</SectionTitle>
        <RevenueChart scope={selected} />

        <SectionTitle>Ticket tiers</SectionTitle>
        <TierRows scope={selected} />

        <SectionTitle>Audience</SectionTitle>
        <div className="dash-stat-grid">
          <StatBox label="Total followers" value={formatNumber(selected.followers)} note="From follows table" />
          <StatBox label="Event page views" value={formatNumber(selected.pageViews)} note="From events table" />
          <StatBox label="Avg. ticket value" value={formatMoneyShort(selected.tickets ? Math.round(selected.revenue / selected.tickets) : 0)} note="Revenue divided by tickets" />
          <StatBox label="Conversion rate" value={`${selected.pageViews ? Math.round((selected.tickets / selected.pageViews) * 100) : 0}%`} note="Tickets divided by views" muted />
        </div>

        <SectionTitle>Sales funnel</SectionTitle>
        <FunnelCard scope={selected} />

        <SectionTitle>Recent check-ins</SectionTitle>
        <CheckInFeed scans={scans} />
      </div>
    </div>
  );
}

function StatBox({ label, value, note, muted = false }: { label: string; value: string; note: string; muted?: boolean }) {
  return (
    <div className="dash-stat-box">
      <span>{label}</span>
      <strong>{value}</strong>
      <em className={muted ? 'muted' : ''}>{note}</em>
    </div>
  );
}

function EventsScreen({ scopes, onGo, onNew }: { scopes: DashboardScope[]; onGo: (screen: ScreenId, detail?: DashboardScope) => void; onNew: () => void }) {
  const active = scopes.filter((scope) => scope.status !== 'completed');
  const completed = scopes.filter((scope) => scope.status === 'completed');

  return (
    <>
      <TopBar
        title="My Events"
        subtitle={`${scopes.length} total - ${scopes.filter((scope) => scope.status === 'live').length} live now`}
        initials="JM"
        action={
          <button type="button" className="dash-header-action" onClick={onNew}>
            <Plus className="h-3.5 w-3.5" />
            New event
          </button>
        }
      />
      <div className="dash-scroll">
        <div className="dash-pad">
          <SectionTitle>Active & upcoming</SectionTitle>
          {active.map((scope) => <EventRow key={scope.id} scope={scope} onClick={() => onGo('event-detail', scope)} />)}
          <SectionTitle>Completed</SectionTitle>
          {completed.length ? completed.map((scope) => <EventRow key={scope.id} scope={scope} onClick={() => onGo('event-detail', scope)} />) : <EmptyCard>No completed events yet</EmptyCard>}
        </div>
      </div>
      <BottomNav active="events" onGo={(screen) => onGo(screen)} />
    </>
  );
}

function EventRow({ scope, onClick }: { scope: DashboardScope; onClick: () => void }) {
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

function StreamScreen({ scope, giftTransactions, onBack, onNotify }: { scope: DashboardScope; giftTransactions: DashboardTransaction[]; onBack: () => void; onNotify: () => void }) {
  const isLiveNow = scope.status === 'live';

  return (
    <>
      <BackTopBar
        title="Live stream"
        onBack={onBack}
        right={isLiveNow ? (
          <span className="dash-live-chip text-white">
            <i />
            LIVE
          </span>
        ) : null}
      />
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

          <button type="button" className="dash-primary-btn" onClick={onNotify} disabled={!isLiveNow}>
            <Bell className="h-4 w-4" />
            {isLiveNow ? 'Message viewers now' : 'No live viewers right now'}
          </button>
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
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

function GiftList({ gifts }: { gifts: DashboardTransaction[] }) {
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

function NotifyScreen({ scope, onBack }: { scope: DashboardScope; onBack: () => void }) {
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
      <BackTopBar title="Send notification" onBack={onBack} />
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

function PayoutsScreen({
  eventCount,
  walletBalance,
  transactions,
  onBack,
  onWithdraw,
}: {
  eventCount: number;
  walletBalance: number;
  transactions: DashboardTransaction[];
  onBack: () => void;
  onWithdraw: () => void;
}) {
  const withdrawals = transactions.filter(isWithdrawalTransaction);

  return (
    <>
      <BackTopBar title="Payouts" onBack={onBack} />
      <div className="dash-scroll">
        <div className="dash-pad">
          <div className="dash-info-banner">
            <Info className="h-4 w-4" />
            <span>Withdraw your available balance. Completed withdrawals will appear here.</span>
          </div>
          <WalletCard eventCount={eventCount} balance={walletBalance} onWithdraw={onWithdraw} />
          <SectionTitle>Payout methods</SectionTitle>
          <div className="dash-card">
            <div className="dash-card-title">
              <span>
                <WalletCards className="h-4 w-4 text-gray-500" />
                Withdraw funds
              </span>
            </div>
            <div className="dash-payout-summary">
              <span>
                <WalletCards className="h-3.5 w-3.5" />
                Available wallet balance
              </span>
              <strong>{formatMoney(walletBalance)}</strong>
            </div>
            <button type="button" className="dash-primary-btn" onClick={onWithdraw}>
              <CreditCard className="h-4 w-4" />
              Open withdrawal
            </button>
          </div>
          <SectionTitle>Payout history</SectionTitle>
          {withdrawals.length ? (
            <div className="dash-card">
              {withdrawals.map((transaction) => (
                <InfoRow
                  key={transaction.id}
                  icon={Check}
                  label={`${transaction.provider || transaction.metadata?.provider || 'Withdrawal'}${formatTransactionTime(transaction.created_at) ? ` - ${formatTransactionTime(transaction.created_at)}` : ''}`}
                  value={formatMoney(transactionAmount(transaction))}
                />
              ))}
            </div>
          ) : (
            <EmptyCard>No completed withdrawals yet.</EmptyCard>
          )}
        </div>
      </div>
    </>
  );
}

function DetailScreen({
  type,
  scope,
  giftTransactions,
  eventCount,
  onBack,
  onGo,
}: {
  type: 'tickets' | 'revenue' | 'gifts';
  scope: DashboardScope;
  giftTransactions: DashboardTransaction[];
  eventCount: number;
  onBack: () => void;
  onGo: (screen: ScreenId) => void;
}) {
  if (type === 'gifts') {
    const totalGifts = giftTransactions.reduce((sum, transaction) => sum + transactionAmount(transaction), 0);
    const averageGift = giftTransactions.length ? Math.round(totalGifts / giftTransactions.length) : 0;
    return (
      <>
        <BackTopBar title="Gifts received" onBack={onBack} />
        <div className="dash-scroll">
          <div className="dash-pad">
            <div className="dash-stat-grid mt-1">
              <StatBox label="Total gifts" value={formatMoneyShort(totalGifts)} note={giftTransactions.length ? 'From gift transactions' : 'No gifts yet'} />
              <StatBox label="Gift count" value={formatNumber(giftTransactions.length)} note="Completed gift rows" />
              <StatBox label="Avg. gift" value={formatMoneyShort(averageGift)} note="Total divided by gifts" />
              <StatBox label="Top gift" value={formatMoneyShort(Math.max(0, ...giftTransactions.map(transactionAmount)))} note="Highest gift row" muted />
            </div>
            <SectionTitle>Gift transactions</SectionTitle>
            <GiftList gifts={giftTransactions} />
          </div>
        </div>
      </>
    );
  }

  if (type === 'revenue') {
    return (
      <>
        <BackTopBar title="Revenue breakdown" onBack={onBack} />
        <div className="dash-scroll">
          <div className="dash-pad">
            <div className="dash-stat-grid mt-1">
              <StatBox label="Total revenue" value={formatMoneyShort(scope.revenue)} note="From tickets table" />
              <StatBox label="Gifts income" value={formatMoneyShort(scope.gifts)} note="From gift transactions" />
              <StatBox label="Available now" value={formatMoneyShort(scope.available)} note="Ready to withdraw" />
              <StatBox label="Locked funds" value={formatMoneyShort(scope.locked)} note="Unlocks after events" muted />
            </div>
            <SectionTitle>Revenue by event</SectionTitle>
            <TierRows scope={scope} />
            <button type="button" className="dash-primary-btn" onClick={() => onGo('payouts')}>
              <CreditCard className="h-4 w-4" />
              Go to payouts
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <BackTopBar title="Tickets sold" onBack={onBack} />
      <div className="dash-scroll">
        <div className="dash-pad">
          <div className="dash-stat-grid mt-1">
            <StatBox label="Total sold" value={formatNumber(scope.tickets)} note="From ticket rows" />
            <StatBox label="Physical" value={formatNumber(Math.max(0, scope.tickets - scope.virtualTickets))} note="Total minus virtual" />
            <StatBox label="Virtual" value={formatNumber(scope.virtualTickets)} note="From stream settings" />
            <StatBox label="Avg. per event" value={formatNumber(eventCount ? Math.round(scope.tickets / eventCount) : 0)} note={`${eventCount} event${eventCount === 1 ? '' : 's'}`} muted />
          </div>
          <SectionTitle>Breakdown by tier</SectionTitle>
          <TierRows scope={scope} />
        </div>
      </div>
    </>
  );
}

function EventDetailScreen({ scope, onBack, onGo }: { scope: DashboardScope; onBack: () => void; onGo: (screen: ScreenId) => void }) {
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

function EmptyCard({ children }: { children: ReactNode }) {
  return <div className="dash-empty-card">{children}</div>;
}

function DashboardLoading() {
  return (
    <>
      <header className="dash-topbar">
        <div className="dash-top-id">
          <div className="dash-skeleton dash-skeleton-circle" />
          <div className="min-w-0 flex-1">
            <div className="dash-skeleton dash-skeleton-line wide" />
            <div className="dash-skeleton dash-skeleton-line narrow" />
          </div>
        </div>
        <div className="dash-skeleton dash-skeleton-action" />
      </header>
      <div className="dash-scroll">
        <div className="dash-pad">
          <div className="dash-skeleton dash-skeleton-card" />
          <div className="dash-kgrid">
            <div className="dash-skeleton dash-skeleton-tile" />
            <div className="dash-skeleton dash-skeleton-tile" />
            <div className="dash-skeleton dash-skeleton-tile" />
            <div className="dash-skeleton dash-skeleton-tile" />
          </div>
        </div>
      </div>
    </>
  );
}

function DashboardModalFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    </div>
  );
}

const dashboardCss = `
.eventz-dashboard{position:fixed;inset:0;z-index:70;background:#F0F2F5;color:#111827;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.eventz-dashboard *{box-sizing:border-box}
.dash-shell{height:100%;width:100%;max-width:520px;margin:0 auto;background:#F0F2F5;overflow:hidden;display:flex;flex-direction:column;position:relative}
.dash-topbar{background:linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%);padding:calc(14px + var(--eventz-safe-area-top)) 16px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0}
.dash-backbar{background:linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%);padding:calc(14px + var(--eventz-safe-area-top)) 16px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0;color:#fff}
.dash-top-id{display:flex;align-items:center;gap:10px;min-width:0}
.dash-avatar{width:38px;height:38px;border-radius:999px;background:rgba(255,255,255,.22);border:2px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;overflow:hidden;flex-shrink:0}
.dash-top-back{width:38px;height:38px;border-radius:999px;border:1px solid rgba(255,255,255,.32);background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
.dash-top-name{font-size:15px;font-weight:800;color:#fff;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dash-top-sub{margin-top:2px;font-size:10px;font-weight:600;color:rgba(255,255,255,.68);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dash-header-action{height:34px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.18);color:#fff;font-size:10.5px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;flex-shrink:0}
.dash-header-icon-only{width:38px;height:38px;padding:0}
.dash-back-btn{width:36px;height:36px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.18);display:inline-flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
.dash-page-title{font-size:16px;font-weight:800;color:#fff;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dash-filter-dock{position:relative;z-index:20;background:#fff;border-bottom:1px solid #E5E7EB;padding:12px 16px;flex-shrink:0}
.dash-filter-dock.open{border-bottom-color:transparent}
.dash-filter-label{font-size:9px;font-weight:800;color:#9CA3AF;letter-spacing:.1em;text-transform:uppercase;margin-bottom:9px;display:flex;align-items:center;gap:5px}
.dash-selector{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:12px;border:1.5px solid #E5E7EB;background:#FAFAFA;transition:border-color .15s,border-radius .15s}
.dash-selector.open{border-color:#7C3AED;border-bottom-color:transparent;border-bottom-left-radius:0;border-bottom-right-radius:0}
.dash-selector-left{display:flex;align-items:center;gap:11px;min-width:0}
.dash-selector-dot{width:10px;height:10px;border-radius:999px;box-shadow:0 0 0 2.5px #fff,0 0 0 4px currentColor;flex-shrink:0}
.dash-selector-name,.dash-dropdown-name{display:block;font-size:13px;font-weight:800;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dash-selector-sub,.dash-dropdown-meta{display:block;margin-top:2px;font-size:10px;font-weight:500;color:#6B7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dash-selector-right{display:flex;align-items:center;gap:9px;flex-shrink:0}
.dash-selector-pill{font-size:9px;font-weight:800;padding:4px 10px;border-radius:999px;white-space:nowrap}
.dash-chevron{width:26px;height:26px;border-radius:999px;background:#F3F4F6;color:#6B7280;display:flex;align-items:center;justify-content:center;transition:transform .2s,background .15s,color .15s}
.dash-chevron.open{transform:rotate(180deg);background:#EDE9FE;color:#7C3AED}
.dash-dropdown{position:absolute;left:16px;right:16px;top:calc(100% - 1px);z-index:3;background:#fff;border:1.5px solid #7C3AED;border-top:none;border-radius:0 0 14px 14px;overflow:hidden;max-height:0;opacity:0;pointer-events:none;box-shadow:0 16px 40px rgba(124,58,237,.18);transition:max-height .25s ease,opacity .2s}
.dash-dropdown.open{max-height:620px;opacity:1;pointer-events:auto}
.dash-dropdown-row{width:100%;display:flex;align-items:center;gap:12px;padding:13px 14px;border-top:1px solid #F9FAFB;background:#fff}
.dash-dropdown-row.on{background:#F5F3FF}
.dash-dropdown-side{display:flex;flex-direction:column;align-items:flex-end;gap:4px;padding-left:4px;flex-shrink:0}
.dash-dropdown-money{font-size:11px;font-weight:800;color:#111827}
.dash-icon-bubble{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.dash-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
.dash-scroll::-webkit-scrollbar{display:none}
.dash-pad{padding:14px 16px calc(86px + var(--eventz-safe-area-bottom))}
.dash-wallet-card{background:linear-gradient(135deg,#7C3AED 0%,#4C1D95 100%);border-radius:18px;padding:20px;margin-bottom:14px;position:relative;overflow:hidden;color:#fff}
.dash-wallet-card:before{content:"";position:absolute;top:-42px;right:-42px;width:150px;height:150px;border-radius:999px;background:rgba(255,255,255,.07)}
.dash-wallet-label{position:relative;z-index:1;font-size:10px;font-weight:800;color:rgba(255,255,255,.72);display:flex;align-items:center;gap:6px;margin-bottom:7px;text-transform:uppercase;letter-spacing:.06em}
.dash-wallet-amount{position:relative;z-index:1;font-size:30px;font-weight:900;letter-spacing:-1.4px;line-height:1;margin-bottom:4px}
.dash-wallet-scope{position:relative;z-index:1;font-size:10px;font-weight:600;color:rgba(255,255,255,.55);margin-bottom:14px}
.dash-wallet-withdraw{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.18);color:#fff;padding:8px 16px;font-size:11px;font-weight:900;box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}
.dash-range-row{display:flex;background:#E5E7EB;border-radius:999px;padding:3px;gap:2px;margin-bottom:16px}
.dash-range{flex:1;border-radius:999px;padding:7px 0;font-size:11px;font-weight:800;color:#6B7280;text-align:center}
.dash-range.on{background:#fff;color:#7C3AED;box-shadow:0 2px 8px rgba(0,0,0,.1)}
.dash-section-title{font-size:10px;font-weight:900;color:#9CA3AF;letter-spacing:.1em;text-transform:uppercase;margin:18px 0 11px}
.dash-kgrid,.dash-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.dash-kcard{position:relative;min-height:104px;text-align:left;background:#fff;border:1.5px solid #E9EBF0;border-radius:16px;padding:15px;transition:transform .12s,border-color .12s}
.dash-kcard:active,.dash-event-row:active{transform:scale(.98);border-color:#A78BFA}
.dash-kcard.plain:active{transform:none;border-color:#E9EBF0}
.dash-klabel{font-size:10px;color:#6B7280;font-weight:700;display:flex;align-items:center;gap:6px;margin-bottom:8px}
.dash-kvalue{font-size:21px;font-weight:900;color:#111827;letter-spacing:-.5px;line-height:1;margin-bottom:6px}
.dash-kdelta{font-size:10px;font-weight:800;color:#059669;display:flex;align-items:center;gap:4px}
.dash-kchev{position:absolute;right:12px;top:13px;color:#D1D5DB}
.dash-card{background:#fff;border:1px solid #E9EBF0;border-radius:18px;padding:17px;margin-bottom:13px}
.dash-card-title{font-size:13px;font-weight:800;color:#111827;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:15px}
.dash-card-title span{display:flex;align-items:center;gap:8px;min-width:0}
.dash-card-title small{font-size:10px;font-weight:800;color:#6B7280}
.dash-summary-row{display:grid;grid-template-columns:minmax(92px,1fr) minmax(84px,1.2fr) auto;align-items:center;gap:10px;margin-bottom:11px}
.dash-summary-row:last-child{margin-bottom:0}
.dash-summary-row span{font-size:11px;color:#6B7280;font-weight:800;min-width:0}
.dash-summary-row b{height:7px;background:#F3F4F6;border-radius:999px;overflow:hidden}
.dash-summary-row i{display:block;height:100%;border-radius:999px}
.dash-summary-row strong{font-size:11px;font-weight:900;color:#111827;white-space:nowrap}
.dash-bars{display:flex;align-items:flex-end;gap:3px;height:84px}
.dash-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px}
.dash-bar-bg{height:74px;width:100%;border-radius:4px 4px 0 0;background:#F3F4F6;position:relative;overflow:hidden}
.dash-bar-fill{position:absolute;left:0;right:0;bottom:0;border-radius:4px 4px 0 0;opacity:.75}
.dash-bar-label{height:9px;font-size:8px;color:#9CA3AF}
.dash-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:12px}
.dash-legend span{display:flex;align-items:center;gap:5px;font-size:10px;color:#6B7280;font-weight:800}
.dash-legend i{width:9px;height:9px;border-radius:3px}
.dash-tier-row{display:flex;align-items:center;gap:10px;margin-bottom:11px}
.dash-tier-row:last-child{margin-bottom:0}
.dash-tier-dot{width:8px;height:8px;border-radius:999px;flex-shrink:0}
.dash-tier-name{font-size:11px;color:#111827;font-weight:800;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dash-tier-track{width:64px;height:5px;background:#F3F4F6;border-radius:999px;overflow:hidden;flex-shrink:0}
.dash-tier-track span{display:block;height:100%;border-radius:999px}
.dash-tier-row strong{font-size:11px;font-weight:900;color:#111827;min-width:30px;text-align:right}
.dash-tier-row em{font-style:normal;font-size:10px;color:#6B7280;min-width:28px;text-align:right}
.dash-stat-box{background:#FAFAFA;border:1px solid #E9EBF0;border-radius:14px;padding:14px}
.dash-stat-box span{display:block;font-size:10px;color:#6B7280;font-weight:800;margin-bottom:6px}
.dash-stat-box strong{display:block;font-size:20px;font-weight:900;color:#111827;letter-spacing:-.3px;line-height:1.1}
.dash-stat-box em{display:block;margin-top:5px;font-size:10px;font-style:normal;font-weight:800;color:#059669}
.dash-stat-box em.muted{color:#9CA3AF}
.dash-funnel-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.dash-funnel-row:last-child{margin-bottom:0}
.dash-funnel-row span{font-size:10px;color:#6B7280;font-weight:800;min-width:98px}
.dash-funnel-row b{height:6px;background:#F3F4F6;border-radius:999px;overflow:hidden;flex:1}
.dash-funnel-row i{display:block;height:100%;border-radius:999px;background:#7C3AED}
.dash-funnel-row strong{font-size:10px;font-weight:900;color:#111827;min-width:38px;text-align:right}
.dash-check-row,.dash-gift-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #F4F5F7}
.dash-check-row:last-child,.dash-gift-row:last-child{border-bottom:none;padding-bottom:0}
.dash-check-row>span,.dash-gift-row>span{width:34px;height:34px;border-radius:999px;background:#F3F4F6;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#374151;flex-shrink:0}
.dash-gift-row>span{background:linear-gradient(135deg,#EDE9FE,#DDD6FE);color:#6D28D9}
.dash-check-row div,.dash-gift-row div{flex:1;min-width:0}
.dash-check-row strong,.dash-gift-row strong{display:block;font-size:12px;font-weight:900;color:#111827}
.dash-check-row small,.dash-gift-row small{display:block;margin-top:2px;font-size:9px;color:#9CA3AF}
.dash-check-row em{font-style:normal;font-size:9px;color:#9CA3AF;margin-left:auto}
.dash-gift-row em{font-style:normal;font-size:13px;font-weight:900;color:#059669}
.dash-live-chip{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:900;color:#EF4444}
.dash-live-chip i{width:8px;height:8px;border-radius:999px;background:#EF4444;animation:dashPulse 1.4s ease-in-out infinite}
@keyframes dashPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.75)}}
.dash-bottom-nav{background:#fff;border-top:1px solid #E5E7EB;display:flex;padding:10px 0 calc(15px + var(--eventz-safe-area-bottom));flex-shrink:0}
.dash-nav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;color:#9CA3AF;font-size:9px;font-weight:900;letter-spacing:.02em}
.dash-nav-item i{width:4px;height:4px;border-radius:999px;background:#7C3AED;opacity:0}
.dash-nav-item.active{color:#7C3AED}
.dash-nav-item.active i{opacity:1}
.dash-event-row{width:100%;display:flex;align-items:center;gap:12px;padding:14px;background:#fff;border:1.5px solid #E9EBF0;border-radius:16px;margin-bottom:10px}
.dash-event-name{display:block;font-size:13px;font-weight:900;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dash-event-meta{display:block;margin-top:3px;font-size:10px;color:#6B7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dash-event-side{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
.dash-event-side strong{font-size:13px;font-weight:900;color:#111827}
.dash-pill{display:inline-block;border-radius:999px;padding:3px 8px;font-size:9px;font-weight:900;white-space:nowrap}
.dash-pill-live{background:#DCFCE7;color:#15803D}
.dash-pill-soon{background:#EDE9FE;color:#5B21B6}
.dash-pill-done{background:#F3F4F6;color:#6B7280;border:1px solid #E5E7EB}
.dash-info-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #F4F5F7}
.dash-info-row:last-child{border-bottom:none;padding-bottom:0}
.dash-info-row span{display:flex;align-items:center;gap:7px;font-size:11px;color:#6B7280;font-weight:800;min-width:0}
.dash-info-row strong{font-size:12px;font-weight:900;color:#111827;white-space:nowrap}
.dash-green-badge{font-size:10px;font-weight:900;color:#059669;background:#D1FAE5;padding:4px 10px;border-radius:999px}
.dash-primary-btn,.dash-outline-btn{width:100%;border-radius:14px;padding:14px 12px;margin-top:11px;display:flex;align-items:center;justify-content:center;gap:9px;font-size:13px;font-weight:900;letter-spacing:.02em}
.dash-primary-btn{background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff}
.dash-primary-btn:disabled{opacity:.5;filter:grayscale(.25);cursor:not-allowed}
.dash-outline-btn{background:#fff;color:#7C3AED;border:2px solid #7C3AED}
.dash-audience-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.dash-audience{position:relative;text-align:left;padding:12px 12px 12px 38px;background:#FAFAFA;border:1.5px solid #E9EBF0;border-radius:12px}
.dash-audience.on{background:#F5F3FF;border-color:#7C3AED}
.dash-audience span{position:absolute;left:12px;top:13px;width:17px;height:17px;border:2px solid #D1D5DB;border-radius:999px}
.dash-audience.on span{background:#7C3AED;border-color:#7C3AED;box-shadow:inset 0 0 0 4px #fff}
.dash-audience b{display:block;font-size:11px;font-weight:900;color:#111827}
.dash-audience small{display:block;margin-top:2px;font-size:10px;color:#6B7280}
.dash-message-box{width:100%;min-height:82px;resize:none;border:1.5px solid #E9EBF0;background:#FAFAFA;border-radius:12px;padding:13px;font:inherit;font-size:12px;color:#111827;line-height:1.6;outline:none}
.dash-message-box:focus{background:#fff;border-color:#A78BFA}
.dash-message-foot{display:flex;align-items:center;justify-content:space-between;margin-top:9px;gap:10px}
.dash-message-foot span{font-size:10px;color:#9CA3AF;font-weight:800}
.dash-toggle{display:flex!important;align-items:center;gap:7px;color:#6B7280!important;font-size:11px!important}
.dash-toggle i{width:34px;height:19px;border-radius:999px;background:#7C3AED;position:relative}
.dash-toggle i:after{content:"";position:absolute;right:2px;top:2px;width:15px;height:15px;border-radius:999px;background:#fff}
.dash-preview{margin-top:11px;border-radius:12px;background:#EDE9FE;border:1px solid #DDD6FE;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;color:#5B21B6;font-size:11px;font-weight:700;line-height:1.6}
.dash-info-banner{display:flex;gap:10px;align-items:flex-start;margin:4px 0 14px;border-radius:12px;background:#F5F3FF;border:1px solid #DDD6FE;padding:12px 14px;color:#5B21B6;font-size:11px;font-weight:700;line-height:1.55}
.dash-payout-method{display:flex;align-items:center;gap:14px;padding:15px;background:#FAFAFA;border:1px solid #E9EBF0;border-radius:14px;margin-bottom:9px}
.dash-payout-icon{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.dash-payout-icon.green{background:#E1F5EE;color:#0F6E56}
.dash-payout-icon.purple{background:#EDE9FE;color:#5B21B6}
.dash-payout-method strong{display:block;font-size:13px;font-weight:900;color:#111827}
.dash-payout-method small{display:block;margin-top:3px;font-size:10px;color:#6B7280}
.dash-payout-method em{display:block;margin-top:2px;font-style:normal;font-size:9px;color:#9CA3AF}
.dash-payout-side{text-align:right;flex-shrink:0}
.dash-payout-side b{display:block;font-size:13px;font-weight:900;color:#111827}
.dash-payout-side button{margin-top:7px;border:1.5px solid #A7F3D0;background:#D1FAE5;color:#065F46;border-radius:999px;padding:7px 14px;font-size:11px;font-weight:900}
.dash-or-divider{display:flex;align-items:center;gap:10px;margin:5px 0 9px}
.dash-or-divider i{height:1px;background:#E9EBF0;flex:1}
.dash-or-divider span{font-size:10px;color:#9CA3AF;font-weight:800}
.dash-payout-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:13px;border-top:1px solid #E9EBF0;margin-top:9px}
.dash-payout-summary span{display:flex;align-items:center;gap:6px;font-size:11px;color:#6B7280;font-weight:800}
.dash-payout-summary strong{font-size:15px;font-weight:900;color:#111827}
.dash-empty-card{border:1px dashed #D1D5DB;background:#fff;border-radius:16px;padding:28px;text-align:center;color:#6B7280;font-size:13px;font-weight:700}
.dash-empty-inline{border:1px dashed #E5E7EB;background:#FAFAFA;border-radius:12px;padding:18px;text-align:center;color:#6B7280;font-size:12px;font-weight:800}
.dash-skeleton{position:relative;overflow:hidden;background:#E5E7EB}
.dash-skeleton:after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:dashShimmer 1.2s infinite}
.dash-skeleton-circle{width:38px;height:38px;border-radius:999px}
.dash-skeleton-line{height:11px;border-radius:999px;margin:5px 0}
.dash-skeleton-line.wide{width:150px}
.dash-skeleton-line.narrow{width:108px}
.dash-skeleton-action{width:38px;height:38px;border-radius:999px;background:rgba(255,255,255,.22)}
.dash-skeleton-card{height:154px;border-radius:18px;margin-bottom:16px}
.dash-skeleton-tile{height:104px;border-radius:16px}
@keyframes dashShimmer{100%{transform:translateX(100%)}}
@media(min-width:700px){.dash-shell{height:min(844px,calc(100dvh - 24px));margin:12px auto;border-radius:36px;box-shadow:0 28px 80px rgba(15,23,42,.2)}}
`;

export function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [screen, setScreen] = useState<ScreenId>('dash');
  const [, setHistory] = useState<ScreenId[]>(['dash']);
  const [selectedId, setSelectedId] = useState('all');
  const [detailScope, setDetailScope] = useState<DashboardScope | null>(null);
  const [range, setRange] = useState('30d');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerEventId, setScannerEventId] = useState<number | null>(null);
  const [showWallet, setShowWallet] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [tickets, setTickets] = useState<DashboardTicket[]>([]);
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
  const [scans, setScans] = useState<DashboardScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadDashboard = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/events', { replace: true });
          return;
        }

        const [profileResult, statsResult, eventsResult, walletResult, transactionsResult] = await Promise.allSettled([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          getOrganizerStats(user.id),
          getOrganizerEvents(user.id, { includeInstant: true }),
          getLocalWalletBalance(user.id),
          supabase
            .from('transactions')
            .select('id,event_id,amount,currency,provider,status,created_at,metadata')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50),
        ]);

        if (!alive) return;
        if (profileResult.status === 'fulfilled') setProfile(profileResult.value.data);
        if (statsResult.status === 'fulfilled') setStats({ ...defaultStats, ...statsResult.value });
        const eventsData = eventsResult.status === 'fulfilled' ? ((eventsResult.value || []) as ApiEvent[]) : [];
        setEvents(eventsData);
        if (walletResult.status === 'fulfilled') setWalletBalance(walletResult.value || 0);
        if (transactionsResult.status === 'fulfilled' && !transactionsResult.value.error) {
          setTransactions(((transactionsResult.value.data || []) as any[]).map((transaction) => ({
            ...transaction,
            amount: parseMoneyValue(transaction.amount),
            event_id: transaction.event_id == null ? null : Number(transaction.event_id),
          })));
        } else {
          setTransactions([]);
        }

        const eventIds = eventsData.map((event) => event.id).filter(Boolean);
        if (eventIds.length) {
          const { data: ticketRows, error: ticketsError } = await supabase
            .from('tickets')
            .select('id,event_id,price,purchase_date,ticket_type,status,customer_name,scanned_at')
            .in('event_id', eventIds)
            .order('purchase_date', { ascending: false })
            .limit(1000);

          if (alive && !ticketsError) {
            const mappedTickets = ((ticketRows || []) as any[]).map((ticket) => ({
              ...ticket,
              event_id: Number(ticket.event_id),
            }));
            setTickets(mappedTickets);
            setScans(mappedTickets
              .filter((ticket) => ticket.scanned_at)
              .sort((a, b) => new Date(b.scanned_at || 0).getTime() - new Date(a.scanned_at || 0).getTime())
              .map((ticket) => ({
                id: ticket.id,
                event_id: ticket.event_id,
                customer_name: ticket.customer_name,
                ticket_type: ticket.ticket_type,
                scanned_at: ticket.scanned_at,
              })));
          } else if (alive) {
            setTickets([]);
            setScans([]);
          }
        } else {
          setTickets([]);
          setScans([]);
        }
      } catch (error: any) {
        toast.error(error?.message || 'Failed to load dashboard');
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    void loadDashboard();
    return () => {
      alive = false;
    };
  }, [navigate]);

  const organizerName = profile?.full_name || profile?.display_name || profile?.name || profile?.username || 'Dashboard';
  const organizerLocation = profile?.location || 'Location not set';
  const initials = getInitials(organizerName);

  const organizerEvents = useMemo(() => events.filter((event) => !(event.streaming as any)?.isInstant), [events]);
  const rangeStart = useMemo(() => getRangeStart(range), [range]);
  const rangedTickets = useMemo(
    () => tickets.filter((ticket) => dateInRange(ticket.purchase_date, rangeStart)),
    [tickets, rangeStart]
  );
  const rangedTransactions = useMemo(
    () => transactions.filter((transaction) => dateInRange(transaction.created_at, rangeStart)),
    [transactions, rangeStart]
  );
  const rangedOrganizerEvents = useMemo(() => {
    if (!rangeStart) return organizerEvents;
    const activeEventIds = new Set<number>();
    rangedTickets.forEach((ticket) => activeEventIds.add(Number(ticket.event_id)));
    rangedTransactions.forEach((transaction) => {
      if (transaction.event_id != null) activeEventIds.add(Number(transaction.event_id));
    });
    return organizerEvents.filter((event) => {
      if (event.streaming?.isLive) return true;
      if (activeEventIds.has(event.id)) return true;
      return dateInRange(event.date, rangeStart);
    });
  }, [organizerEvents, rangeStart, rangedTickets, rangedTransactions]);
  const rangedScans = useMemo(
    () => scans.filter((scan) => dateInRange(scan.scanned_at, rangeStart)),
    [scans, rangeStart]
  );
  const giftTransactions = useMemo(() => rangedTransactions.filter(isGiftTransaction), [rangedTransactions]);
  const scopes = useMemo(() => {
    const visibleEvents = rangedOrganizerEvents.slice(0, 6);
    return visibleEvents.map((event, index) => {
      const eventTickets = rangedTickets.filter((ticket) => Number(ticket.event_id) === event.id);
      const scope = mapOrganizerEvent(event, index, eventTickets);
      const gifts = giftTransactions
        .filter((transaction) => Number(transaction.event_id) === event.id)
        .reduce((sum, transaction) => sum + transactionAmount(transaction), 0);
      return { ...scope, gifts };
    });
  }, [rangedOrganizerEvents, rangedTickets, giftTransactions]);

  const connectedEventCount = Math.max(stats.totalEvents || organizerEvents.length, 0);
  const activeEventCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return organizerEvents.filter((event) => {
      if (event.streaming?.isLive) return true;
      if (!event.date) return true;
      const date = new Date(event.date);
      return Number.isFinite(date.getTime()) && date >= today;
    }).length;
  }, [organizerEvents]);
  const eventCount = Math.max(rangedOrganizerEvents.length, 0);
  const allRevenue = scopes.reduce((sum, scope) => sum + scope.revenue, 0);
  const allTickets = scopes.reduce((sum, scope) => sum + scope.tickets, 0);
  const allLiveViewers = scopes.reduce((sum, scope) => sum + scope.viewers, 0);
  const allPeakViewers = scopes.reduce((sum, scope) => sum + scope.peakViewers, 0);
  const allPageViews = scopes.reduce((sum, scope) => sum + scope.pageViews, 0);
  const allFollowers = stats.followers || 0;
  const allVirtual = scopes.reduce((sum, scope) => sum + scope.virtualTickets, 0);
  const allGifts = giftTransactions.reduce((sum, transaction) => sum + transactionAmount(transaction), 0);
  const allAvailable = walletBalance;
  const allLocked = 0;
  const allCheckoutStarts = scopes.reduce((sum, scope) => sum + scope.checkoutStarts, 0);
  const hasLiveScope = scopes.some((scope) => scope.status === 'live');
  const allTiers = useMemo(() => {
    const tiers = new Map<string, DashboardTier>();
    scopes.forEach((scope) => {
      scope.tiers.forEach((tier) => {
        const current = tiers.get(tier.name);
        if (current) {
          current.tickets += tier.tickets;
          current.revenue += tier.revenue;
        } else {
          tiers.set(tier.name, { ...tier });
        }
      });
    });
    return Array.from(tiers.values());
  }, [scopes]);

  const allScope: DashboardScope = {
    id: 'all',
    name: 'All events',
    subtitle: `${eventCount} events - combined totals`,
    location: organizerLocation,
    status: hasLiveScope ? 'live' : 'upcoming',
    statusLabel: hasLiveScope ? 'Live now' : 'All',
    color: hasLiveScope ? '#15803D' : '#7C3AED',
    softColor: hasLiveScope ? '#DCFCE7' : '#EDE9FE',
    revenue: allRevenue,
    available: allAvailable,
    locked: allLocked,
    tickets: allTickets,
    virtualTickets: allVirtual,
    viewers: allLiveViewers,
    peakViewers: allPeakViewers,
    gifts: allGifts,
    followers: allFollowers,
    pageViews: allPageViews,
    checkoutStarts: allCheckoutStarts,
    tiers: allTiers,
  };

  const selectedScope = selectedId === 'all' ? allScope : scopes.find((scope) => scope.id === selectedId) || allScope;
  const detail = detailScope || selectedScope;
  const selectedGiftTransactions = useMemo(
    () => (selectedScope.id === 'all' ? giftTransactions : giftTransactions.filter((transaction) => Number(transaction.event_id) === selectedScope.routeId)),
    [giftTransactions, selectedScope.id, selectedScope.routeId]
  );
  const detailGiftTransactions = useMemo(
    () => (detail.id === 'all' ? giftTransactions : giftTransactions.filter((transaction) => Number(transaction.event_id) === detail.routeId)),
    [detail.id, detail.routeId, giftTransactions]
  );
  const scannerEvents = useMemo(
    () => organizerEvents.filter((event) => event.status !== 'draft' && event.status !== 'cancelled'),
    [organizerEvents]
  );
  const scannerEvent = scannerEvents.find((event) => event.id === scannerEventId) || scannerEvents[0] || null;

  const openScanner = () => {
    if (!scannerEvent) {
      toast.error('Create or publish an event before scanning tickets');
      return;
    }
    setScannerEventId(scannerEvent.id);
    setShowScanner(true);
  };

  const openWithdraw = () => {
    setShowWallet(true);
  };

  const go = (next: ScreenId, nextDetail?: DashboardScope) => {
    if (nextDetail) setDetailScope(nextDetail);
    setSelectorOpen(false);
    setScreen(next);
    setHistory((current) => (current[current.length - 1] === next ? current : [...current, next]));
  };

  const navTo = (next: ScreenId) => {
    setSelectorOpen(false);
    setScreen(next);
    setHistory(next === 'dash' ? ['dash'] : ['dash', next]);
  };

  const back = () => {
    setSelectorOpen(false);
    setHistory((current) => {
      const nextHistory = current.slice(0, -1);
      const previous = nextHistory[nextHistory.length - 1] || 'dash';
      setScreen(previous);
      return nextHistory.length ? nextHistory : ['dash'];
    });
  };

  const pickScope = (scope: DashboardScope) => {
    setSelectedId(scope.id);
    setDetailScope(scope.id === 'all' ? null : scope);
    window.setTimeout(() => setSelectorOpen(false), 120);
  };

  const currentScreen = () => {
    if (screen === 'events') return <EventsScreen scopes={scopes} onGo={go} onNew={() => navigate('/create')} />;
    if (screen === 'stream') return <StreamScreen scope={detail} giftTransactions={detailGiftTransactions} onBack={back} onNotify={() => go('notify')} />;
    if (screen === 'notify') return <NotifyScreen scope={selectedScope} onBack={back} />;
    if (screen === 'payouts') return <PayoutsScreen eventCount={connectedEventCount} walletBalance={walletBalance} transactions={transactions} onBack={back} onWithdraw={openWithdraw} />;
    if (screen === 'tickets') return <DetailScreen type="tickets" scope={selectedScope} giftTransactions={selectedGiftTransactions} eventCount={selectedScope.id === 'all' ? eventCount : 1} onBack={back} onGo={go} />;
    if (screen === 'revenue') return <DetailScreen type="revenue" scope={selectedScope} giftTransactions={selectedGiftTransactions} eventCount={selectedScope.id === 'all' ? eventCount : 1} onBack={back} onGo={go} />;
    if (screen === 'gifts') return <DetailScreen type="gifts" scope={selectedScope} giftTransactions={selectedGiftTransactions} eventCount={selectedScope.id === 'all' ? eventCount : 1} onBack={back} onGo={go} />;
    if (screen === 'event-detail') return <EventDetailScreen scope={detail} onBack={back} onGo={go} />;

    return (
      <>
        <TopBar
          title={organizerName}
          subtitle={`${organizerLocation} - ${activeEventCount} active event${activeEventCount === 1 ? '' : 's'}`}
          initials={initials}
          onBackToProfile={() => navigate('/profile')}
          action={
            <button type="button" className="dash-header-action dash-header-icon-only" onClick={openScanner} aria-label="QR Code Scanner">
              <QrCode className="h-4 w-4" />
            </button>
          }
        />
        <EventSelector
          selected={selectedScope}
          allScope={allScope}
          scopes={scopes}
          eventCount={eventCount}
          isOpen={selectorOpen}
          onToggle={() => setSelectorOpen((value) => !value)}
          onPick={pickScope}
        />
        <DashboardHome selected={selectedScope} eventCount={connectedEventCount} walletBalance={walletBalance} scans={rangedScans} range={range} onRange={setRange} onGo={go} onWithdraw={openWithdraw} />
        <BottomNav active="dash" onGo={navTo} />
      </>
    );
  };

  return (
    <div className="eventz-dashboard">
      <style>{dashboardCss}</style>
      <div className="dash-shell">{isLoading ? <DashboardLoading /> : currentScreen()}</div>
      {showScanner && scannerEvent ? (
        <Suspense fallback={<DashboardModalFallback />}>
          <TicketScannerModal
            key={scannerEvent.id}
            eventId={scannerEvent.id}
            eventTitle={scannerEvent.title || 'Event'}
            events={scannerEvents}
            onEventChange={(event) => setScannerEventId(event.id)}
            onClose={() => setShowScanner(false)}
          />
        </Suspense>
      ) : null}
      {showWallet ? (
        <Suspense fallback={<DashboardModalFallback />}>
          <WalletModal isOpen={showWallet} onClose={() => setShowWallet(false)} />
        </Suspense>
      ) : null}
    </div>
  );
}
