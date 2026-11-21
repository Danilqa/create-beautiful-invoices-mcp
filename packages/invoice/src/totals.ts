import { toCurrencyDigits } from './format';
import type { Invoice, Totals } from './types';

const takePercent = (amountMinor: number, percent: number | undefined) =>
  Math.round((amountMinor * (percent ?? 0)) / 100);

export const calculateTotals = (invoice: Invoice): Totals => {
  const minorUnits = 10 ** toCurrencyDigits(invoice.currency);
  const lines = invoice.items.map(item => {
    // The schema allows the currency's decimals at most, so rounding only drops float noise.
    const unitPriceMinor = Math.round(item.unitPrice * minorUnits);
    return { ...item, unitPriceMinor, amountMinor: Math.round(item.quantity * unitPriceMinor) };
  });
  const subtotalMinor = lines.reduce((sum, line) => sum + line.amountMinor, 0);
  const discountMinor = takePercent(subtotalMinor, invoice.discountRate);
  const taxMinor = takePercent(subtotalMinor - discountMinor, invoice.taxRate);
  return {
    lines,
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor: subtotalMinor - discountMinor + taxMinor,
  };
};
