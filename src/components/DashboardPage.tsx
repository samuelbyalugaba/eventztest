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
import { type Event as ApiEvent } from '../utils/supabase/api';
import { getLocalWalletBalance, ntzsApi } from '../utils/ntzs-api';
import { prefetchUserStats } from '../utils/statsPrefetch';
import { useProfileStore } from '../store/profileStore';
import { Skeleton } from './ui/skeleton';
import '../styles/dashboard.css';

const TicketScannerModal = lazy(() => import('./TicketScannerModal').then((module) => ({ default: module.TicketScannerModal })));

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

function DashboardModalFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const cachedProfile = useProfileStore((s) => s.profile);
  const cachedStats = useProfileStore((s) => s.organizerStats);
  const cachedWalletBalance = useProfileStore((s) => s.walletBalance);
  const dashboardCache = useProfileStore((s) => s.dashboardCache);

  const [profile, setProfile] = useState<any>(cachedProfile);
  const [stats, setStats] = useState<DashboardStats>({ ...defaultStats, ...(cachedStats || {}) });
  const [screen, setScreen] = useState<ScreenId>('dash');
  const [, setHistory] = useState<ScreenId[]>(['dash']);
  const [selectedId, setSelectedId] = useState('all');
  const [detailScope, setDetailScope] = useState<DashboardScope | null>(null);
  const [range, setRange] = useState('30d');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerEventId, setScannerEventId] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(cachedWalletBalance ?? 0);
  const hasCache = !!dashboardCache && (dashboardCache.tickets.length > 0 || dashboardCache.transactions.length > 0 || dashboardCache.events.length > 0);
  const [isLoading, setIsLoading] = useState<boolean>(!hasCache);
  const [fetchError, setFetchError] = useState<null | 'partial' | 'full'>(null);

  const events = (dashboardCache?.events ?? []) as ApiEvent[];
  const tickets = (dashboardCache?.tickets ?? []) as DashboardTicket[];
  const transactions = (dashboardCache?.transactions ?? []) as DashboardTransaction[];
  const scans = (dashboardCache?.scans ?? []) as DashboardScan[];

  // Sync cached stats/balance -> local state so the UI reacts to background updates
  useEffect(() => {
    if (cachedStats) setStats((prev) => ({ ...prev, ...cachedStats }));
  }, [cachedStats]);
  useEffect(() => {
    if (typeof cachedWalletBalance === 'number') setWalletBalance(cachedWalletBalance);
  }, [cachedWalletBalance]);

  useEffect(() => {
    let alive = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let ticketsChannel: ReturnType<typeof supabase.channel> | null = null;
    let transactionsChannel: ReturnType<typeof supabase.channel> | null = null;
    let currentUserId: string | null = null;

    const runPrefetch = async (userId: string, email: string) => {
      const result = await prefetchUserStats(userId, email);
      if (!alive) return;
      const errCount = Object.keys(result.errors).length;
      if (errCount === 0) setFetchError(null);
      else if (errCount >= 4) setFetchError('full');
      else setFetchError('partial');
    };

    const loadDashboard = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/events', { replace: true });
          return;
        }
        currentUserId = user.id;

        const { data: profileRow } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (!alive) return;
        if (profileRow) setProfile(profileRow);

        await runPrefetch(user.id, user.email || '');

        // Background polling every 30s to keep balance/tickets/transactions fresh
        pollTimer = setInterval(() => {
          if (!currentUserId) return;
          if (typeof document !== 'undefined' && document.hidden) return;
          void runPrefetch(currentUserId, user.email || '');
        }, 30_000);

        // Realtime: refresh on ticket sales & wallet transactions
        transactionsChannel = supabase
          .channel(`dashboard-tx-${user.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
            () => {
              if (currentUserId) void runPrefetch(currentUserId, user.email || '');
            }
          )
          .subscribe();

        ticketsChannel = supabase
          .channel(`dashboard-tickets-${user.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tickets' },
            () => {
              if (currentUserId) void runPrefetch(currentUserId, user.email || '');
            }
          )
          .subscribe();

        // Refresh when the tab regains focus
        const handleVisibility = () => {
          if (!document.hidden && currentUserId) {
            void runPrefetch(currentUserId, user.email || '');
          }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        (window as any).__dashCleanupVis = () => document.removeEventListener('visibilitychange', handleVisibility);
      } catch (error: any) {
        if (alive) {
          setFetchError('full');
          toast.error(error?.message || 'Failed to load dashboard');
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    void loadDashboard();
    return () => {
      alive = false;
      if (pollTimer) clearInterval(pollTimer);
      if (ticketsChannel) supabase.removeChannel(ticketsChannel);
      if (transactionsChannel) supabase.removeChannel(transactionsChannel);
      const cleanupVis = (window as any).__dashCleanupVis;
      if (typeof cleanupVis === 'function') cleanupVis();
    };
  }, [navigate]);

  const retryFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setFetchError(null);
    const result = await prefetchUserStats(user.id, user.email || '');
    const errCount = Object.keys(result.errors).length;
    if (errCount === 0) setFetchError(null);
    else if (errCount >= 4) setFetchError('full');
    else setFetchError('partial');
  };



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
    navigate('/wallet');
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
    </div>
  );
}
