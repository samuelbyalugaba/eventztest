import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { type Event as ApiEvent } from '../utils/supabase/api';

import { prefetchUserStats } from '../utils/statsPrefetch';
import { useProfileStore } from '../store/profileStore';
import '../styles/dashboard.css';

import {
  type ScreenId,
  type DashboardScope,
  type DashboardTier,
  type DashboardTicket,
  type DashboardScan,
  type DashboardTransaction,
  type DashboardStats,
  defaultStats,
} from './dashboard/types';
import {
  getInitials,
  getRangeStart,
  dateInRange,
  isGiftTransaction,
  mapOrganizerEvent,
  transactionAmount,
} from './dashboard/utils';
import {
  TopBar,
  DashboardMenu,
  EventSelector,
  DashboardLoading,
  DashboardModalFallback,
} from './dashboard/shared';
import { DashboardHome } from './dashboard/DashboardHome';
import { EventsScreen } from './dashboard/EventsScreen';
import { StreamScreen } from './dashboard/StreamScreen';
import { NotifyScreen } from './dashboard/NotifyScreen';
import { PayoutsScreen } from './dashboard/PayoutsScreen';
import { DetailScreen } from './dashboard/DetailScreen';
import { EventDetailScreen } from './dashboard/EventDetailScreen';

const TicketScannerModal = lazy(() => import('./TicketScannerModal').then((module) => ({ default: module.TicketScannerModal })));

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const cachedProfile = useProfileStore((s) => s.profile);
  const cachedStats = useProfileStore((s) => s.organizerStats);
  const cachedWalletBalance = useProfileStore((s) => s.walletBalance);
  const dashboardCache = useProfileStore((s) => s.dashboardCache);

  const subPath = location.pathname.replace(/^\/dashboard\/?/, '');
  const screenFromPath: ScreenId =
    subPath === 'events' ? 'events' :
    subPath === 'live' ? 'stream' :
    subPath === 'notify' ? 'notify' :
    subPath === 'payouts' ? 'payouts' :
    'dash';
  const tabScreens = new Set<ScreenId>(['dash', 'events', 'stream', 'notify', 'payouts']);

  const [profile, setProfile] = useState<any>(cachedProfile);
  const [stats, setStats] = useState<DashboardStats>({ ...defaultStats, ...(cachedStats || {}) });
  const [screen, setScreen] = useState<ScreenId>(screenFromPath);
  const [selectedId, setSelectedId] = useState('all');
  const [detailScope, setDetailScope] = useState<DashboardScope | null>(null);
  const [range, setRange] = useState('30d');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scannerEventId, setScannerEventId] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(cachedWalletBalance ?? 0);
  const hasCache = !!dashboardCache && (dashboardCache.tickets.length > 0 || dashboardCache.transactions.length > 0 || dashboardCache.events.length > 0);
  const [isLoading, setIsLoading] = useState<boolean>(!hasCache);
  const [fetchError, setFetchError] = useState<null | 'partial' | 'full'>(null);

  const events = (dashboardCache?.events ?? []) as ApiEvent[];
  const tickets = (dashboardCache?.tickets ?? []) as DashboardTicket[];
  const transactions = (dashboardCache?.transactions ?? []) as DashboardTransaction[];
  const scans = (dashboardCache?.scans ?? []) as DashboardScan[];

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
    const mountId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);

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

        pollTimer = setInterval(() => {
          if (!currentUserId) return;
          if (typeof document !== 'undefined' && document.hidden) return;
          void runPrefetch(currentUserId, user.email || '');
        }, 30_000);

        transactionsChannel = supabase
          .channel(`dashboard-tx-${user.id}-${mountId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
            () => {
              if (currentUserId) void runPrefetch(currentUserId, user.email || '');
            }
          )
          .subscribe();

        ticketsChannel = supabase
          .channel(`dashboard-tickets-${user.id}-${mountId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tickets' },
            () => {
              if (currentUserId) void runPrefetch(currentUserId, user.email || '');
            }
          )
          .subscribe();

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

  useEffect(() => {
    const newScreen: ScreenId =
      subPath === 'events' ? 'events' :
      subPath === 'live' ? 'stream' :
      subPath === 'notify' ? 'notify' :
      subPath === 'payouts' ? 'payouts' :
      'dash';
    setScreen(newScreen);
  }, [location.pathname]);

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
    if (tabScreens.has(next)) {
      navTo(next);
    } else {
      setScreen(next);
    }
  };

  const navTo = (next: ScreenId) => {
    setSelectorOpen(false);
    const pathMap: Record<string, string> = {
      'dash': '/dashboard',
      'events': '/dashboard/events',
      'stream': '/dashboard/live',
      'notify': '/dashboard/notify',
      'payouts': '/dashboard/payouts',
    };
    navigate(pathMap[next] || '/dashboard');
  };

  const back = () => {
    setSelectorOpen(false);
    if (tabScreens.has(screen)) {
      navigate(-1);
    } else {
      const subPath = location.pathname.replace(/^\/dashboard\/?/, '');
      const parentScreen: ScreenId =
        subPath === 'events' ? 'events' :
        subPath === 'live' ? 'stream' :
        subPath === 'notify' ? 'notify' :
        subPath === 'payouts' ? 'payouts' :
        'dash';
      setScreen(parentScreen);
    }
  };

  const pickScope = (scope: DashboardScope) => {
    setSelectedId(scope.id);
    setDetailScope(scope.id === 'all' ? null : scope);
    window.setTimeout(() => setSelectorOpen(false), 120);
  };

  const currentScreen = () => {
    if (screen === 'events') return <EventsScreen scopes={scopes} onGo={go} onNew={() => navigate('/create')} onScan={openScanner} onBack={back} />;
    if (screen === 'stream') return <StreamScreen scope={detail} giftTransactions={detailGiftTransactions} onBack={back} onGo={go} onScan={openScanner} />;
    if (screen === 'notify') return <NotifyScreen scope={selectedScope} onBack={back} onGo={go} onScan={openScanner} />;
    if (screen === 'payouts') return <PayoutsScreen eventCount={connectedEventCount} walletBalance={walletBalance} transactions={transactions} onBack={back} onWithdraw={openWithdraw} onGo={go} onScan={openScanner} />;
    if (screen === 'tickets') return <DetailScreen type="tickets" scope={selectedScope} giftTransactions={selectedGiftTransactions} eventCount={selectedScope.id === 'all' ? eventCount : 1} onBack={back} onGo={go} />;
    if (screen === 'revenue') return <DetailScreen type="revenue" scope={selectedScope} giftTransactions={selectedGiftTransactions} eventCount={selectedScope.id === 'all' ? eventCount : 1} onBack={back} onGo={go} />;
    if (screen === 'gifts') return <DetailScreen type="gifts" scope={selectedScope} giftTransactions={selectedGiftTransactions} eventCount={selectedScope.id === 'all' ? eventCount : 1} onBack={back} onGo={go} />;
    if (screen === 'event-detail') return <EventDetailScreen scope={detail} onBack={back} onGo={go} />;

    return (
      <>
        <TopBar
          title={organizerName}
          subtitle={`${activeEventCount} active event${activeEventCount === 1 ? '' : 's'}`}
          initials={initials}
          onBackToProfile={() => navigate('/profile')}
          action={
            <div className="flex items-center gap-2">
              <button type="button" className="dash-header-action dash-header-icon-only" onClick={openScanner} aria-label="Scan ticket">
                <QrCode className="h-4 w-4" />
              </button>
              <button type="button" className="dash-header-action dash-header-icon-only" onClick={() => setMenuOpen(true)} aria-label="Menu">
                <Menu className="h-4 w-4" />
              </button>
            </div>
          }
        />
        {menuOpen && (
          <DashboardMenu onClose={() => setMenuOpen(false)} onNav={(screen) => { setMenuOpen(false); navTo(screen); }} />
        )}
        <EventSelector
          selected={selectedScope}
          allScope={allScope}
          scopes={scopes}
          eventCount={eventCount}
          isOpen={selectorOpen}
          onToggle={() => setSelectorOpen((value) => !value)}
          onPick={pickScope}
        />
        <DashboardHome selected={selectedScope} eventCount={connectedEventCount} walletBalance={walletBalance} scans={rangedScans} range={range} onRange={setRange} onGo={go} onWithdraw={openWithdraw} fetchError={fetchError} onRetry={retryFetch} />
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
