import { type ComponentType, type CSSProperties } from 'react';

export type ScreenId =
  | 'dash'
  | 'events'
  | 'stream'
  | 'notify'
  | 'payouts'
  | 'tickets'
  | 'revenue'
  | 'gifts'
  | 'event-detail';

export type DashboardStats = {
  totalEvents: number;
  followers: number;
  totalViews: number;
  revenue: number;
  liveStreams: number;
  ticketsSold: number;
};

export type ScopeStatus = 'live' | 'upcoming' | 'completed';

export type DashboardTier = {
  name: string;
  tickets: number;
  revenue: number;
  color: string;
};

export type DashboardScan = {
  id: string | number;
  event_id: number;
  customer_name?: string | null;
  ticket_type?: string | null;
  scanned_at?: string | null;
};

export type DashboardTicket = {
  id: string | number;
  event_id: number;
  price?: string | number | null;
  purchase_date?: string | null;
  ticket_type?: string | null;
  status?: string | null;
  customer_name?: string | null;
  scanned_at?: string | null;
};

export type DashboardTransaction = {
  id: string | number;
  event_id?: number | null;
  amount: number;
  currency?: string | null;
  provider?: string | null;
  status?: string | null;
  created_at?: string | null;
  metadata?: any;
};

export type DashboardScope = {
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

export type IconType = ComponentType<{ className?: string; style?: CSSProperties }>;

export const defaultStats: DashboardStats = {
  totalEvents: 0,
  followers: 0,
  totalViews: 0,
  revenue: 0,
  liveStreams: 0,
  ticketsSold: 0,
};

export const ranges = ['7d', '30d', '90d', 'All time'];
export const tierColors = ['#7C3AED', '#D97706', '#059669', '#0891B2', '#DB2777', '#2563EB'];
