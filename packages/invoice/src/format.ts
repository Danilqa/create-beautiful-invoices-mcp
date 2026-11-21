import type { Currency } from './types';

// These share a narrow symbol with another currency, such as $ or ¥, so they print theirs in full: A$, JP¥.
const SHARED_SYMBOL_CURRENCIES = new Set<Currency>(['AUD', 'CAD', 'NZD', 'SGD', 'CNY', 'JPY']);

const toMoneyFormat = (currency: Currency) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    currencyDisplay: SHARED_SYMBOL_CURRENCIES.has(currency) ? 'symbol' : 'narrowSymbol',
  });

// 2 for pounds and pence, 0 for yen.
export const toCurrencyDigits = (currency: Currency) =>
  toMoneyFormat(currency).resolvedOptions().maximumFractionDigits ?? 2;

// en-GB digits with the symbol, as the web generator prints them: £3,588.71
export const formatMoney = (amountMinor: number, currency: Currency) =>
  toMoneyFormat(currency).format(amountMinor / 10 ** toCurrencyDigits(currency));

// 2026-11-30 → 30 November 2026
export const formatLongDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
