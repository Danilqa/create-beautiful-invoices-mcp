import { describe, expect, it } from 'vitest';
import { invoiceMock } from './mocks';
import { calculateTotals } from './totals';

describe('calculateTotals', () => {
  it('prices each line and adds VAT to the subtotal', () => {
    const totals = calculateTotals(invoiceMock);

    expect(totals.lines.map(line => line.amountMinor)).toEqual([240_000, 71_625]);
    expect(totals.subtotalMinor).toBe(311_625);
    expect(totals.vatMinor).toBe(62_325);
    expect(totals.totalMinor).toBe(373_950);
  });

  it('rounds half a penny up on lines and VAT', () => {
    const totals = calculateTotals({
      ...invoiceMock,
      items: [{ description: 'Hosting', quantity: 1.5, unitPrice: 0.15 }],
      vatRate: 12.5,
    });

    expect(totals.subtotalMinor).toBe(23);
    expect(totals.vatMinor).toBe(3);
    expect(totals.totalMinor).toBe(26);
  });

  it('adds no VAT when the rate is 0', () => {
    const totals = calculateTotals({ ...invoiceMock, vatRate: 0 });

    expect(totals.vatMinor).toBe(0);
    expect(totals.totalMinor).toBe(totals.subtotalMinor);
  });
});
