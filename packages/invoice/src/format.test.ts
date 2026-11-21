import { describe, expect, it } from 'vitest';
import { formatLongDate, formatMoney } from './format';

describe('formatMoney', () => {
  it.each([
    ['GBP', '£3,588.71'],
    ['EUR', '€3,588.71'],
    ['USD', '$3,588.71'],
  ] as const)('prints %s with its symbol and two decimals', (currency, expected) => {
    expect(formatMoney(358_871, currency)).toBe(expected);
  });

  it('keeps the decimals of a whole amount', () => {
    expect(formatMoney(120_000, 'GBP')).toBe('£1,200.00');
  });
});

describe('formatLongDate', () => {
  it('prints an ISO date in full, whatever the time zone', () => {
    expect(formatLongDate('2026-11-30')).toBe('30 November 2026');
    expect(formatLongDate('2027-01-01')).toBe('1 January 2027');
  });
});
