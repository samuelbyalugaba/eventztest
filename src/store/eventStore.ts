import type { Event as ApiEvent } from '../utils/supabase/api';

const STORAGE_KEY = 'eventz-events-cache-v2';
const STORAGE_TIMESTAMP_KEY = 'eventz-events-cache-timestamp-v2';
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes — discovery feed rarely changes

// Simple store implementation with persistence
let cachedEvents: ApiEvent[] = [];
let lastFetchTime = 0;

// Initialize from storage immediately
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  const storedTime = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
  if (stored) {
    cachedEvents = JSON.parse(stored);
  }
  if (storedTime) {
    lastFetchTime = parseInt(storedTime, 10);
  }
} catch (e) {
  // Fallback to empty
  cachedEvents = [];
}

const listeners: Set<() => void> = new Set();

export const eventsStore = {
  getEvents: () => cachedEvents,
  
  setEvents: (events: ApiEvent[]) => {
    cachedEvents = events;
    lastFetchTime = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, lastFetchTime.toString());
    } catch (e) {
    }
    listeners.forEach(listener => listener());
  },

  invalidate: () => {
    lastFetchTime = 0;
    try {
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
    } catch (e) {
    }
  },
  
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  
  // Helper to update a single event (e.g. toggle save)
  updateEvent: (updatedEvent: ApiEvent) => {
    cachedEvents = cachedEvents.map(e => e.id === updatedEvent.id ? updatedEvent : e);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedEvents));
    } catch (e) {
    }
    listeners.forEach(listener => listener());
  },

  shouldFetch: () => {
    return cachedEvents.length === 0 || Date.now() - lastFetchTime > CACHE_DURATION;
  }
};
