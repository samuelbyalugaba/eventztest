import { describe, expect, it } from 'vitest';
import { formatTimeAgo, formatDateDMY, formatDateWithWeekday } from '../format';

describe('formatTimeAgo', () => {
  it('returns empty string for invalid dates', () => {
    expect(formatTimeAgo('not-a-date')).toBe('');
  });

  it('returns seconds for recent posts', () => {
    const now = new Date();
    const fiveSecondsAgo = new Date(now.getTime() - 5000).toISOString();
    const result = formatTimeAgo(fiveSecondsAgo);
    expect(result).toMatch(/^\d+s$/);
  });

  it('returns minutes for recent posts', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    expect(formatTimeAgo(fiveMinutesAgo)).toMatch(/^\d+m$/);
  });

  it('returns hours for older posts', () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(threeHoursAgo)).toMatch(/^\d+h$/);
  });

  it('returns days for older posts', () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(threeDaysAgo)).toMatch(/^\d+d$/);
  });

  it('returns weeks for very old posts', () => {
    const now = new Date();
    const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(threeWeeksAgo)).toMatch(/^\d+w$/);
  });

  it('returns 0s for future dates', () => {
    const now = new Date();
    const future = new Date(now.getTime() + 10000).toISOString();
    expect(formatTimeAgo(future)).toBe('0s');
  });
});

describe('formatDateDMY', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatDateDMY(null)).toBe('');
    expect(formatDateDMY(undefined)).toBe('');
  });

  it('formats a date string to DD-MM-YYYY', () => {
    expect(formatDateDMY('2026-06-15')).toBe('15-06-2026');
  });

  it('formats a Date object', () => {
    expect(formatDateDMY(new Date(2026, 5, 15))).toBe('15-06-2026');
  });

  it('returns input string for unparseable dates', () => {
    expect(formatDateDMY('not-a-date')).toBe('not-a-date');
  });
});

describe('formatDateWithWeekday', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatDateWithWeekday(null)).toBe('');
    expect(formatDateWithWeekday(undefined)).toBe('');
  });

  it('includes weekday in output', () => {
    const result = formatDateWithWeekday('2026-06-15');
    expect(result).toContain('Monday');
    expect(result).toContain('15-06-2026');
  });
});
