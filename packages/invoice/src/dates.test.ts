import { describe, expect, it } from 'vitest';
import { addDays, toLocalIsoDate } from './dates';

describe('toLocalIsoDate', () => {
  it('takes the date on the local clock', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toLocalIsoDate(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });
});

describe('addDays', () => {
  it('moves across months, years and leap days', () => {
    expect(addDays('2026-11-21', 30)).toBe('2026-12-21');
    expect(addDays('2026-12-25', 14)).toBe('2027-01-08');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-11-21', 0)).toBe('2026-11-21');
  });
});
