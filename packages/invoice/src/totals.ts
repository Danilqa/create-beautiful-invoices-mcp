import type { Invoice, Totals } from './types';

const MINOR_UNITS = 100;

// The schema allows two decimals at most, so rounding only drops float noise.
const toMinor = (value: number) => Math.round(value * MINOR_UNITS);

export const calculateTotals = (invoice: Invoice): Totals => {
  const lines = invoice.items.map(item => {
    const unitPriceMinor = toMinor(item.unitPrice);
    return { ...item, unitPriceMinor, amountMinor: Math.round(item.quantity * unitPriceMinor) };
  });
  const subtotalMinor = lines.reduce((sum, line) => sum + line.amountMinor, 0);
  const vatMinor = Math.round((subtotalMinor * invoice.vatRate) / 100);
  return { lines, subtotalMinor, vatMinor, totalMinor: subtotalMinor + vatMinor };
};
