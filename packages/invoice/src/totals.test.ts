import { describe, expect, it } from 'vitest';
import { invoiceMock } from './mocks';
import { calculateTotals } from './totals';

describe('calculateTotals', () => {
  it('prices each line and adds tax to the subtotal', () => {
    const totals = calculateTotals(invoiceMock);

    expect(totals.lines.map(line => line.amountMinor)).toEqual([240_000, 71_625]);
    expect(totals.subtotalMinor).toBe(311_625);
    expect(totals.discountMinor).toBe(0);
    expect(totals.taxMinor).toBe(62_325);
    expect(totals.totalMinor).toBe(373_950);
  });

  it('takes the discount off before tax', () => {
    const totals = calculateTotals({ ...invoiceMock, discountRate: 10 });

    expect(totals.discountMinor).toBe(31_163);
    expect(totals.taxMinor).toBe(56_092);
    expect(totals.totalMinor).toBe(311_625 - 31_163 + 56_092);
  });

  it('rounds half a penny up on lines and tax', () => {
    const totals = calculateTotals({
      ...invoiceMock,
      items: [{ description: 'Hosting', quantity: 1.5, unitPrice: 0.15 }],
      taxRate: 12.5,
    });

    expect(totals.subtotalMinor).toBe(23);
    expect(totals.taxMinor).toBe(3);
    expect(totals.totalMinor).toBe(26);
  });

  it('adds no tax without a rate', () => {
    const totals = calculateTotals({ ...invoiceMock, taxRate: undefined });

    expect(totals.taxMinor).toBe(0);
    expect(totals.totalMinor).toBe(totals.subtotalMinor);
  });

  it('counts whole yen', () => {
    const totals = calculateTotals({
      ...invoiceMock,
      currency: 'JPY',
      items: [{ description: 'Consulting', quantity: 3, unitPrice: 15_000 }],
      taxRate: 10,
    });

    expect(totals.subtotalMinor).toBe(45_000);
    expect(totals.taxMinor).toBe(4_500);
    expect(totals.totalMinor).toBe(49_500);
  });
});
