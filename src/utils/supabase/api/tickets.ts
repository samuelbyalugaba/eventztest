import { supabase } from './client';
import type { Event } from './events';

export type Ticket = {
  id: number;
  user_id: string;
  event_id: number;
  ticket_number: string;
  barcode: string;
  price: string;
  purchase_date: string;
  customer_name: string;
  customer_email: string;
  ticket_type: string;
  status: string;
  qr_code?: string;
  event?: Event;
};

export const getUserTickets = async (userId: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      event:events (
        *,
        organizer:profiles(*)
      )
    `)
    .eq('user_id', userId)
    .order('purchase_date', { ascending: false });

  if (error) throw error;
  return data as unknown as Ticket[];
};

export const hasActiveVirtualTicket = async (userId: string, eventId: number) => {
  const { count, error } = await supabase
    .from('tickets')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('ticket_type', 'Virtual')
    .eq('status', 'active');

  if (error) throw error;
  return (count || 0) > 0;
};

export const createTicket = async (ticket: Omit<Ticket, 'id' | 'created_at' | 'event'> & { transaction_id?: number }) => {
  const price = ticket.price ? parseFloat(ticket.price.replace(/[^0-9.]/g, '')) : 0;
  if (price > 0 && !ticket.transaction_id) {
    throw new Error('Payment verification required: transaction_id is missing for a paid ticket.');
  }

  if (ticket.transaction_id) {
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('id', ticket.transaction_id)
      .single();

    if (txnError || !txn) {
      throw new Error('Payment verification failed: transaction not found.');
    }

    if (txn.status !== 'completed' && txn.status !== 'success') {
      throw new Error(`Payment verification failed: transaction status is "${txn.status}".`);
    }
  }

  const { data, error } = await supabase.rpc('purchase_ticket', {
    p_event_id: ticket.event_id,
    p_ticket_type: ticket.ticket_type,
    p_customer_name: ticket.customer_name,
    p_customer_email: ticket.customer_email,
    p_ticket_number: ticket.ticket_number,
    p_qr_code: ticket.qr_code ?? null,
    p_user_id: (ticket as any).user_id ?? null,
    p_price: ticket.price ?? null,
    p_transaction_id: (ticket as any).transaction_id
  });

  if (error) {
    throw error;
  }

  const result = data as unknown as { id: number } | null

  if (result?.id) {
    const { data: fullTicket, error: fetchError } = await supabase
      .from('tickets')
      .select()
      .eq('id', result.id)
      .single();
      
    if (fetchError) throw fetchError;
    return fullTicket as unknown as Ticket;
  }

  return data as unknown as Ticket;
};

export const scanTicket = async (ticketCode: string, eventId: number) => {
  const { data, error } = await supabase.rpc('scan_ticket', {
    p_ticket_code: ticketCode,
    p_event_id: eventId
  });

  if (error) {
    throw error;
  }

  return data;
};
