import { database } from '../../../shared/database';
import { v4 as uuidv4 } from 'uuid';

export interface Ticket {
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
}

export const ticketsService = {
  async getUserTickets(userId: string): Promise<Ticket[]> {
    return database('tickets')
      .where('user_id', userId)
      .orderBy('purchase_date', 'desc');
  },
  
  async hasActiveVirtualTicket(userId: string, eventId: number): Promise<boolean> {
    const ticket = await database('tickets')
      .where('user_id', userId)
      .andWhere('event_id', eventId)
      .andWhere('ticket_type', 'Virtual')
      .andWhere('status', 'active')
      .first();
    
    return !!ticket;
  },
  
  async createTicket(input: {
    user_id: string;
    event_id: number;
    ticket_type: string;
    price: string;
    customer_name: string;
    customer_email: string;
    transaction_id?: number;
  }): Promise<Ticket> {
    // Verify transaction if paid
    if (input.price && input.price !== '0' && input.transaction_id) {
      const transaction = await database('transactions')
        .where('id', input.transaction_id)
        .first();
      
      if (!transaction || transaction.status !== 'completed') {
        throw new Error('Payment verification failed');
      }
    }
    
    // Use RPC for atomic ticket creation
    const result = await database.raw(`
      SELECT purchase_ticket(
        ?::uuid,
        ?::integer,
        ?::text,
        ?::text,
        ?::text,
        ?::numeric
      ) as id
    `, [
      input.user_id,
      input.event_id,
      input.ticket_type,
      input.customer_name,
      input.customer_email,
      parseFloat(input.price) || 0,
    ]);
    
    const ticketId = result.rows[0]?.id;
    
    if (!ticketId) {
      throw new Error('Failed to create ticket');
    }
    
    return database('tickets').where('id', ticketId).first();
  },
  
  async scanTicket(ticketCode: string, eventId: number): Promise<any> {
    const result = await database.raw(`
      SELECT scan_ticket(?, ?) as result
    `, [ticketCode, eventId]);
    
    return result.rows[0]?.result;
  },
};
