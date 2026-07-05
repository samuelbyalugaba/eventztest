import { type DashboardTransaction, type DashboardScope, type DashboardTier, type ScopeStatus, tierColors } from './types';
import { type Event as ApiEvent } from '../../utils/supabase/api';
import type { DashboardTicket } from './types';

export const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(value || 0)));

export const formatShort = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return formatNumber(value);
};

export const formatMoney = (value: number) => `TZS ${formatNumber(value)}`;
export const formatMoneyShort = (value: number) => `TZS ${formatShort(value)}`;

export const getRangeStart = (range: string) => {
  if (range === 'All time') return null;
  const days = Number.parseInt(range, 10);
  if (!Number.isFinite(days)) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - Math.max(0, days - 1));
  return start;
};

export const dateInRange = (value: string | number | Date | null | undefined, rangeStart: Date | null) => {
  if (!rangeStart) return true;
  if (!value) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date >= rangeStart;
};

export const transactionAmount = (transaction: DashboardTransaction) => parseMoneyValue(transaction.amount);

export const transactionType = (transaction: DashboardTransaction) => {
  const type = transaction.metadata?.type;
  return typeof type === 'string' ? type.trim() : '';
};

export const isCompletedTransaction = (transaction: DashboardTransaction) => {
  const status = String(transaction.status || '').toLowerCase();
  return status === 'completed' || status === 'success';
};

export const isGiftTransaction = (transaction: DashboardTransaction) => transactionType(transaction) === 'gift-received' && isCompletedTransaction(transaction);
export const isWithdrawalTransaction = (transaction: DashboardTransaction) => transactionType(transaction) === 'withdrawal';

export const formatTransactionTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getInitials = (name?: string | null) => {
  const words = (name || 'Eventz').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'EV';
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
};

export const statusClass = (status: ScopeStatus) => {
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

export function mapOrganizerEvent(event: ApiEvent, index: number, tickets: DashboardTicket[] = []): DashboardScope {
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
