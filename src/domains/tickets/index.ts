// Tickets Domain Index
// Manages: Tickets, ticket tiers, scanning, check-in

// API
export { getUserTickets, hasActiveVirtualTicket, createTicket, scanTicket } from './api/tickets';

// Types
export type { Ticket } from './types';

// Constants
export const DOMAIN_NAME = 'tickets';
