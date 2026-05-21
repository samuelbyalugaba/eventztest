import type { Event as ApiEvent } from '../utils/supabase/api';

const STORAGE_PREFIX = 'eventz-event-detail-cache-v1:';
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedEventPayload = {
  event: ApiEvent;
  ts: number;
};

const memoryCache = new Map<number, CachedEventPayload>();

const isFresh = (payload?: CachedEventPayload | null) =>
  !!payload && Date.now() - payload.ts < CACHE_TTL_MS;

const storageKey = (eventId: number) => `${STORAGE_PREFIX}${eventId}`;

export const getCachedEventDetail = (eventId: number): ApiEvent | null => {
  const fromMemory = memoryCache.get(eventId);
  if (isFresh(fromMemory)) {
    return fromMemory.event;
  }

  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(storageKey(eventId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedEventPayload;
    if (!isFresh(parsed)) {
      sessionStorage.removeItem(storageKey(eventId));
      return null;
    }

    memoryCache.set(eventId, parsed);
    return parsed.event;
  } catch {
    return null;
  }
};

export const setCachedEventDetail = (event: ApiEvent) => {
  if (!event?.id) return;

  const payload: CachedEventPayload = { event, ts: Date.now() };
  memoryCache.set(event.id, payload);

  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(storageKey(event.id), JSON.stringify(payload));
  } catch {
    // The in-memory copy still keeps same-session navigation instant.
  }
};
