import { database } from '../../../shared/database';
import { v4 as uuidv4 } from 'uuid';

export interface Event {
  id: number;
  organizer_id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  city?: string;
  category: string;
  subcategory: string;
  price?: string;
  price_range: string;
  image_url: string;
  attendees?: number;
  views?: number;
  status: 'published' | 'draft' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface CreateEventInput {
  organizer_id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  city?: string;
  category: string;
  subcategory: string;
  price?: string;
  price_range: string;
  image_url: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  city?: string;
  category?: string;
  subcategory?: string;
  price?: string;
  price_range?: string;
  image_url?: string;
  status?: 'published' | 'draft' | 'cancelled';
}

export const eventsService = {
  async getEvents(options?: { limit?: number; includePast?: boolean }): Promise<Event[]> {
    const limit = options?.limit ?? 100;
    const today = new Date().toISOString().split('T')[0];
    
    let query = database('events')
      .select('*')
      .orderBy('date', 'asc')
      .limit(limit);
    
    if (!options?.includePast) {
      query = query.where('date', '>=', today);
    }
    
    return query;
  },
  
  async getEventById(id: number): Promise<Event | null> {
    const event = await database('events').where('id', id).first();
    return event || null;
  },
  
  async createEvent(input: CreateEventInput): Promise<Event> {
    const [event] = await database('events')
      .insert({
        ...input,
        status: 'published',
        attendees: 0,
        views: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    
    return event;
  },
  
  async updateEvent(id: number, input: UpdateEventInput): Promise<Event> {
    const [event] = await database('events')
      .where('id', id)
      .update({
        ...input,
        updated_at: new Date(),
      })
      .returning('*');
    
    return event;
  },
  
  async deleteEvent(id: number): Promise<void> {
    await database('events').where('id', id).delete();
  },
  
  async getOrganizerEvents(organizerId: string): Promise<Event[]> {
    return database('events')
      .where('organizer_id', organizerId)
      .orderBy('date', 'asc');
  },
  
  async incrementEventView(id: number): Promise<void> {
    await database('events')
      .where('id', id)
      .increment('views', 1);
  },
  
  async toggleLikeEvent(eventId: number, userId: string): Promise<boolean> {
    const existing = await database('event_likes')
      .where('event_id', eventId)
      .andWhere('user_id', userId)
      .first();
    
    if (existing) {
      await database('event_likes')
        .where('event_id', eventId)
        .andWhere('user_id', userId)
        .delete();
      return false;
    } else {
      await database('event_likes').insert({
        event_id: eventId,
        user_id: userId,
        created_at: new Date(),
      });
      return true;
    }
  },
  
  async getEventLikes(eventId: number): Promise<number> {
    const result = await database('event_likes')
      .where('event_id', eventId)
      .count('id as count')
      .first();
    
    return Number(result?.count) || 0;
  },
  
  async hasUserLikedEvent(eventId: number, userId: string): Promise<boolean> {
    const existing = await database('event_likes')
      .where('event_id', eventId)
      .andWhere('user_id', userId)
      .first();
    
    return !!existing;
  },
  
  async getEventAttendees(eventId: number): Promise<any[]> {
    return database('tickets')
      .where('event_id', eventId)
      .andWhere('status', 'active')
      .select('user_id', 'customer_name', 'customer_email');
  },
  
  async getEventAnalytics(eventId: number) {
    const event = await database('events').where('id', eventId).first();
    const attendeeCount = await database('tickets')
      .where('event_id', eventId)
      .andWhere('status', 'active')
      .count('id as count')
      .first();
    
    return {
      views: event?.views || 0,
      attendees: Number(attendeeCount?.count) || 0,
    };
  },
};
