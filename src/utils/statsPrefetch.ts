import { supabase } from './supabase/client';
import { ntzsApi, getLocalWalletBalance } from './ntzs-api';
import { getOrganizerStats, getOrganizerEvents, getFollowersCount, getFollowingCount } from './supabase/api';
import { useProfileStore } from '../store/profileStore';

export interface StatsFetchResult {
  ok: boolean;
  errors: {
    profile?: boolean;
    stats?: boolean;
    follows?: boolean;
    events?: boolean;
    wallet?: boolean;
    tickets?: boolean;
    transactions?: boolean;
  };
}

const parseAmount = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const numeric = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

async function fetchWalletBalance(userId: string, email: string) {
  try {
    const nUser = await ntzsApi.getUser(userId, email);
    if (nUser?.id) {
      const { balanceTzs } = await ntzsApi.getBalance(nUser.id);
      return balanceTzs || 0;
    }
  } catch (error) {
    console.warn('Failed to fetch wallet balance:', error);
  }
  return getLocalWalletBalance(userId);
}

/**
 * Unified prefetch: pulls wallet balance, organizer stats, follows counts,
 * hosted events, tickets & transactions and persists everything to profileStore.
 * Safe to call repeatedly (polling / realtime refresh).
 */
export async function prefetchUserStats(userId: string, email: string): Promise<StatsFetchResult> {
  const store = useProfileStore.getState();
  const errors: StatsFetchResult['errors'] = {};

  const [statsRes, followersRes, followingRes, eventsRes, balanceRes] = await Promise.allSettled([
    getOrganizerStats(userId),
    getFollowersCount(userId),
    getFollowingCount(userId),
    getOrganizerEvents(userId, { includeInstant: true }),
    fetchWalletBalance(userId, email),
  ]);

  if (statsRes.status === 'fulfilled' && statsRes.value) {
    store.setOrganizerStats(statsRes.value);
  } else if (statsRes.status === 'rejected') {
    errors.stats = true;
  }

  const followers =
    followersRes.status === 'fulfilled' ? followersRes.value : store.followStats?.followers ?? 0;
  const following =
    followingRes.status === 'fulfilled' ? followingRes.value : store.followStats?.following ?? 0;
  if (followersRes.status === 'rejected' || followingRes.status === 'rejected') errors.follows = true;
  store.setFollowStats({ followers, following });

  let events: any[] = store.dashboardCache?.events ?? [];
  if (eventsRes.status === 'fulfilled') {
    events = (eventsRes.value || []) as any[];
    store.setDashboardCache({ events });
    store.setHostedCount(events.length);
  } else {
    errors.events = true;
  }

  if (balanceRes.status === 'fulfilled') {
    store.setWalletBalance(balanceRes.value || 0);
  } else {
    errors.wallet = true;
  }

  const eventIds = events.map((event) => event.id).filter(Boolean);
  const [ticketsRes, transactionsRes] = await Promise.allSettled([
    eventIds.length
      ? supabase
          .from('tickets')
          .select('id,event_id,price,purchase_date,ticket_type,status,customer_name,scanned_at')
          .in('event_id', eventIds)
          .order('purchase_date', { ascending: false })
          .limit(1000)
      : Promise.resolve({ data: [] as any[], error: null } as any),
    supabase
      .from('transactions')
      .select('id,event_id,amount,currency,provider,status,created_at,metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (ticketsRes.status === 'fulfilled' && !(ticketsRes.value as any)?.error) {
    const rows = ((ticketsRes.value as any).data || []) as any[];
    const tickets = rows.map((ticket) => ({ ...ticket, event_id: Number(ticket.event_id) }));
    const scans = tickets
      .filter((ticket) => ticket.scanned_at)
      .sort((a, b) => new Date(b.scanned_at || 0).getTime() - new Date(a.scanned_at || 0).getTime())
      .map((ticket) => ({
        id: ticket.id,
        event_id: ticket.event_id,
        customer_name: ticket.customer_name,
        ticket_type: ticket.ticket_type,
        scanned_at: ticket.scanned_at,
      }));
    store.setDashboardCache({ tickets, scans });
  } else {
    errors.tickets = true;
  }

  if (transactionsRes.status === 'fulfilled' && !(transactionsRes.value as any)?.error) {
    const rows = ((transactionsRes.value as any).data || []) as any[];
    const transactions = rows.map((transaction) => ({
      ...transaction,
      amount: parseAmount(transaction.amount),
      event_id: transaction.event_id == null ? null : Number(transaction.event_id),
    }));
    store.setDashboardCache({ transactions });
  } else {
    errors.transactions = true;
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
