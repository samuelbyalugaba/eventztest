import type { Event as ApiEvent } from '../utils/supabase/api';

const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes — discovery feed rarely changes

// Simple in-memory store; TanStack Query owns data caching between route visits.
let cachedEvents: ApiEvent[] = [];
let lastFetchTime = 0;

const listeners: Set<() => void> = new Set();

export const eventsStore = {
  getEvents: () => cachedEvents,
  
  setEvents: (events: ApiEvent[]) => {
    cachedEvents = events;
    lastFetchTime = Date.now();
    listeners.forEach(listener => listener());
  },

  invalidate: () => {
    lastFetchTime = 0;
  },
  
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  
  // Helper to update a single event (e.g. toggle save)
  updateEvent: (updatedEvent: ApiEvent) => {
    cachedEvents = cachedEvents.map(e => e.id === updatedEvent.id ? updatedEvent : e);
    listeners.forEach(listener => listener());
  },

  shouldFetch: () => {
    return cachedEvents.length === 0 || Date.now() - lastFetchTime > CACHE_DURATION;
  }
};
