import type { Event as ApiEvent } from '../utils/supabase/api';
import { normalizePlaceName } from '../utils/nominatim';
import type { TimeFilterId, LocationOption } from './eventFilterConstants';
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY_CODE } from './eventFilterConstants';

export const eventMatchesLocation = (event: ApiEvent, selectedLocation: string) => {
  if (selectedLocation === 'all') return true;

  const selected = normalizePlaceName(selectedLocation);
  const eventCity = normalizePlaceName(String((event as any)?.city || ''));
  const eventLocation = normalizePlaceName(String((event as any)?.location || ''));
  const eventLocationParts = eventLocation
    .split(',')
    .map((part) => normalizePlaceName(part))
    .filter(Boolean);

  return (
    eventCity === selected ||
    eventCity.includes(selected) ||
    eventLocationParts.some((part) => part === selected || part.includes(selected)) ||
    eventLocation.includes(selected)
  );
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getEventDateTime = (event: ApiEvent) => {
  try {
    const dateStr = event.date;
    const timeStr = event.time ? String(event.time).replace(/\s+/g, '') : '00:00';
    return new Date(`${dateStr} ${timeStr}`);
  } catch (e) {
    return new Date(event.date);
  }
};

export const matchesTimeFilter = (eventDate: Date, filterId: TimeFilterId, now: Date) => {
  if (filterId === 'all') return true;

  const todayStart = startOfDay(now);
  let start = todayStart;
  let end = addDays(todayStart, 1);

  if (filterId === 'tomorrow') {
    start = addDays(todayStart, 1);
    end = addDays(todayStart, 2);
  } else if (filterId === 'weekend') {
    const day = now.getDay();
    const daysUntilSaturday = day === 0 ? -1 : 6 - day;
    start = addDays(todayStart, daysUntilSaturday);
    end = addDays(start, 2);
  } else if (filterId === 'month') {
    start = todayStart;
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  return eventDate >= start && eventDate < end;
};

export const getCountryOption = (code: string) =>
  COUNTRY_OPTIONS.find((country) => country.code === code) || COUNTRY_OPTIONS[0];

export const inferDeviceCountryCode = () => {
  if (typeof Intl !== 'undefined') {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const match = COUNTRY_OPTIONS.find((country) => country.timeZones?.includes(timeZone));
    if (match) return match.code;
  }

  if (typeof navigator !== 'undefined') {
    const locales = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
    for (const locale of locales) {
      const region = locale.split('-').pop()?.toUpperCase();
      if (region && COUNTRY_OPTIONS.some((country) => country.code === region)) {
        return region;
      }
    }
  }

  return DEFAULT_COUNTRY_CODE;
};

const extractReverseCity = (address: Record<string, string | undefined> = {}) =>
  String(
    address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.state ||
      ''
  ).trim();

export const mergeUniqueById = (items: LocationOption[]) => {
  const seen = new Set<string>();
  const out: LocationOption[] = [];
  for (const item of items) {
    const key = normalizePlaceName(item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

export function getFilteredEvents(events: ApiEvent[], selectedLocation: string, selectedCategory: string, selectedSubcategory: string) {
  return events.filter(event => {
    const locationMatch = eventMatchesLocation(event, selectedLocation);
    const categoryMatch =
      selectedCategory === 'all' ||
      String((event as any).category || '').toLowerCase() === selectedCategory.toLowerCase();
    const subcategoryMatch =
      selectedSubcategory === '' ||
      String((event as any).subcategory || '').toLowerCase() === selectedSubcategory.toLowerCase();
    return locationMatch && categoryMatch && subcategoryMatch;
  });
}

export function getUpcomingEvents(filteredEvents: ApiEvent[], selectedTimeFilter: TimeFilterId) {
  const now = new Date();
  return filteredEvents
    .filter(e => {
      const eventDate = getEventDateTime(e);
      return eventDate >= now && matchesTimeFilter(eventDate, selectedTimeFilter, now);
    })
    .sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime());
}

export { getEventDateTime };
