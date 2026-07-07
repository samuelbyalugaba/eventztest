export const RECENT_EVENT_IDS_KEY = 'eventz-recent-event-ids-v1';
export const LEGACY_RECENT_SEARCHES_KEY = 'recentSearches';

type RecentEventLike = {
  id?: string | number | null;
  title?: string | null;
};

const readStringList = (key: string) => {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch (error) {
    console.warn('Failed to read recent events:', error);
    return [];
  }
};

export const readRecentEventIds = () => readStringList(RECENT_EVENT_IDS_KEY);
export const readLegacyRecentSearches = () => readStringList(LEGACY_RECENT_SEARCHES_KEY);

export const rememberRecentEvent = (event: RecentEventLike) => {
  const id = event.id == null ? '' : String(event.id);
  const title = String(event.title || '').trim();

  let eventIds = readRecentEventIds();
  let searches = readLegacyRecentSearches();

  if (id) {
    eventIds = [id, ...eventIds.filter((recentId) => recentId !== id)].slice(0, 5);
    window.localStorage.setItem(RECENT_EVENT_IDS_KEY, JSON.stringify(eventIds));
  }

  if (title) {
    const normalizedTitle = title.toLowerCase();
    searches = [
      title,
      ...searches.filter((item) => item.toLowerCase() !== normalizedTitle),
    ].slice(0, 5);
    window.localStorage.setItem(LEGACY_RECENT_SEARCHES_KEY, JSON.stringify(searches));
  }

  return { eventIds, searches };
};

export const clearRecentEvents = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(RECENT_EVENT_IDS_KEY);
  window.localStorage.removeItem(LEGACY_RECENT_SEARCHES_KEY);
};
