import { useMemo } from 'react';
import type { Event as ApiEvent } from '../../utils/supabase/api';
import type {
  DashboardScope,
  DashboardTier,
  DashboardTicket,
  DashboardTransaction,
  DashboardScan,
  DashboardStats,
} from './types';
import {
  getInitials,
  getRangeStart,
  dateInRange,
  isGiftTransaction,
  mapOrganizerEvent,
  transactionAmount,
} from './utils';

interface DashboardDataInput {
  profile: any;
  stats: DashboardStats;
  events: ApiEvent[];
  tickets: DashboardTicket[];
  transactions: DashboardTransaction[];
  scans: DashboardScan[];
  range: string;
  selectedId: string;
  walletBalance: number;
}

export function useDashboardStats(data: DashboardDataInput) {
  const { profile, events, tickets, transactions, scans, range, selectedId, walletBalance } = data;

  const organizerName = profile?.full_name || profile?.display_name || profile?.name || profile?.username || 'Dashboard';
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
    location: profile?.location || 'Location not set',
    status: hasLiveScope ? 'live' : 'upcoming',
    statusLabel: hasLiveScope ? 'Live now' : 'All',
    color: hasLiveScope ? '#15803D' : 'var(--primary)',
    softColor: hasLiveScope ? '#DCFCE7' : '#EDE9FE',
    revenue: allRevenue,
    available: walletBalance,
    locked: 0,
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

  const scannerEvents = useMemo(
    () => organizerEvents.filter((event) => event.status !== 'draft' && event.status !== 'cancelled'),
    [organizerEvents]
  );

  const selectedGiftTransactions = useMemo(
    () => (selectedScope.id === 'all' ? giftTransactions : giftTransactions.filter((transaction) => Number(transaction.event_id) === selectedScope.routeId)),
    [giftTransactions, selectedScope.id, selectedScope.routeId]
  );

  return {
    organizerName,
    initials,
    organizerEvents,
    rangeStart,
    rangedTickets,
    rangedTransactions,
    rangedOrganizerEvents,
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
  };
}
