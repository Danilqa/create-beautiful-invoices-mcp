import type { Currency } from './types';

// en-GB digits with the narrow symbol, as the web generator prints them: £3,588.71
export const formatMoney = (amountMinor: number, currency: Currency) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(amountMinor / 100);

// 2026-11-30 → 30 November 2026
export const formatLongDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
