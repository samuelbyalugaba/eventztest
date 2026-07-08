import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { prefetchUserStats } from '../utils/statsPrefetch';
import { useProfileStore } from '../store/profileStore';
import {
  type ScreenId,
  type DashboardScope,
  type DashboardStats,
  defaultStats,
} from './dashboard/types';
import {
  DashboardLoading,
  DashboardModalFallback,
} from './dashboard/shared';
import { useDashboardStats } from './dashboard/useDashboardStats';
import { DashboardScreenView } from './dashboard/DashboardScreen';

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

  const events = dashboardCache?.events ?? [];
  const tickets = dashboardCache?.tickets ?? [];
  const transactions = dashboardCache?.transactions ?? [];
  const scans = dashboardCache?.scans ?? [];

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
        if (!user) { navigate('/events', { replace: true }); return; }
        currentUserId = user.id;

        const { data: profileRow } = await supabase
          .from('profiles').select('*').eq('id', user.id).maybeSingle();
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
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
            () => { if (currentUserId) void runPrefetch(currentUserId, user.email || ''); }
          ).subscribe();

        ticketsChannel = supabase
          .channel(`dashboard-tickets-${user.id}-${mountId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' },
            () => { if (currentUserId) void runPrefetch(currentUserId, user.email || ''); }
          ).subscribe();

        const handleVisibility = () => {
          if (!document.hidden && currentUserId) void runPrefetch(currentUserId, user.email || '');
        };
        document.addEventListener('visibilitychange', handleVisibility);
        (window as any).__dashCleanupVis = () => document.removeEventListener('visibilitychange', handleVisibility);
      } catch (error: any) {
        if (alive) { setFetchError('full'); toast.error(error?.message || 'Failed to load dashboard'); }
      } finally { if (alive) setIsLoading(false); }
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

  const {
    organizerName,
    initials,
    organizerEvents,
    rangedScans,
    giftTransactions,
    scopes,
    connectedEventCount,
    activeEventCount,
    eventCount,
    allScope,
    selectedScope,
    scannerEvents,
    selectedGiftTransactions,
  } = useDashboardStats({
    profile,
    stats,
    events,
    tickets,
    transactions,
    scans,
    range,
    selectedId,
    walletBalance,
  });

  const detail = detailScope || selectedScope;
  const detailGiftTransactions = detail.id === 'all'
    ? giftTransactions
    : giftTransactions.filter((transaction: any) => Number(transaction.event_id) === detail.routeId);
  const scannerEvent = scannerEvents.find((event) => event.id === scannerEventId) || scannerEvents[0] || null;

  const openScanner = () => {
    if (!scannerEvent) { toast.error('Create or publish an event before scanning tickets'); return; }
    setScannerEventId(scannerEvent.id);
    setShowScanner(true);
  };

  const openWithdraw = () => navigate('/wallet');

  const navTo = (next: ScreenId) => {
    setSelectorOpen(false);
    const pathMap: Record<string, string> = { 'dash': '/dashboard', 'events': '/dashboard/events', 'stream': '/dashboard/live', 'notify': '/dashboard/notify', 'payouts': '/dashboard/payouts' };
    navigate(pathMap[next] || '/dashboard');
  };

  const go = (next: ScreenId, nextDetail?: DashboardScope) => {
    if (nextDetail) setDetailScope(nextDetail);
    setSelectorOpen(false);
    if (tabScreens.has(next)) navTo(next);
    else setScreen(next);
  };

  const back = () => {
    setSelectorOpen(false);
    if (tabScreens.has(screen)) navigate(-1);
    else {
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

  return (
    <div className="fixed inset-0 z-70 bg-[#F0F2F5] text-[#111827] antialiased">
      <div className="h-full w-full max-w-[520px] mx-auto bg-[#F0F2F5] overflow-hidden flex flex-col relative">
        {isLoading ? <DashboardLoading /> : (
          <DashboardScreenView
            screen={screen}
            organizerName={organizerName}
            initials={initials}
            activeEventCount={activeEventCount}
            menuOpen={menuOpen}
            onOpenMenu={() => setMenuOpen(true)}
            onCloseMenu={() => setMenuOpen(false)}
            onNav={navTo}
            selectedScope={selectedScope}
            allScope={allScope}
            scopes={scopes}
            eventCount={eventCount}
            selectorOpen={selectorOpen}
            onSelectorToggle={() => setSelectorOpen((v) => !v)}
            onPickScope={pickScope}
            connectedEventCount={connectedEventCount}
            walletBalance={walletBalance}
            rangedScans={rangedScans}
            range={range}
            onRangeChange={setRange}
            onGo={go}
            onWithdraw={openWithdraw}
            fetchError={fetchError}
            onRetry={retryFetch}
            detailScope={detailScope}
            selectedGiftTransactions={selectedGiftTransactions}
            detailGiftTransactions={detailGiftTransactions}
            giftTransactions={giftTransactions}
            transactions={transactions}
            onOpenScanner={openScanner}
            onBack={back}
            onNewEvent={() => navigate('/create')}
          />
        )}
      </div>
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
