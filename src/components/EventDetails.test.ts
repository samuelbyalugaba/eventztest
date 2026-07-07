import { describe, expect, it } from 'vitest';
import type { Event as ApiEvent } from '../utils/supabase/api';
import { eventMatchesLocation, matchesTimeFilter } from '../hooks/useEventFilters';

const event = (overrides: Partial<ApiEvent>): ApiEvent => ({
  id: 1,
  title: 'Launch Party',
  date: '2026-06-05',
  time: '20:00',
  location: 'Masaki, Dar es Salaam',
  city: 'Dar es Salaam',
  organizer_id: 'organizer-1',
  ...overrides,
} as ApiEvent);

describe('EventDetails filters', () => {
  it('matches selected cities by city or normalized location segments', () => {
    expect(eventMatchesLocation(event({ city: 'Dar es Salaam' }), 'dar es salaam')).toBe(true);
    expect(eventMatchesLocation(event({ city: '', location: 'Westlands, Nairobi, Kenya' }), 'nairobi')).toBe(true);
    expect(eventMatchesLocation(event({ city: 'Arusha', location: 'Clocktower, Arusha' }), 'zanzibar')).toBe(false);
  });

  it('keeps time filters inside their expected date windows', () => {
    const now = new Date('2026-06-04T12:00:00');

    expect(matchesTimeFilter(new Date('2026-06-04T18:00:00'), 'today', now)).toBe(true);
    expect(matchesTimeFilter(new Date('2026-06-05T10:00:00'), 'tomorrow', now)).toBe(true);
    expect(matchesTimeFilter(new Date('2026-06-08T10:00:00'), 'weekend', now)).toBe(false);
    expect(matchesTimeFilter(new Date('2026-07-01T00:00:00'), 'month', now)).toBe(false);
  });
});
