import { describe, expect, it } from 'vitest';
import { invoiceMock } from './mocks';
import { invoiceSchema } from './schemas';

describe('invoiceSchema', () => {
  it('accepts a complete invoice', () => {
    expect(invoiceSchema.parse(invoiceMock)).toEqual(invoiceMock);
  });

  it('defaults the quantity to 1', () => {
    const invoice = invoiceSchema.parse({
      ...invoiceMock,
      items: [{ description: 'Logo', unitPrice: 500 }],
    });

    expect(invoice.items).toEqual([{ description: 'Logo', quantity: 1, unitPrice: 500 }]);
  });

  it('rejects a due date before the issue date', () => {
    const result = invoiceSchema.safeParse({ ...invoiceMock, dueDate: '2026-11-20' });

    expect(result.error?.issues).toMatchObject([
      { path: ['dueDate'], message: 'The due date is before the issue date.' },
    ]);
  });

  it('rejects prices with fractions of a penny', () => {
    const result = invoiceSchema.safeParse({
      ...invoiceMock,
      items: [{ description: 'Logo', quantity: 1, unitPrice: 10.005 }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects decimals in a currency without them', () => {
    const result = invoiceSchema.safeParse({
      ...invoiceMock,
      currency: 'JPY',
      items: [
        { description: 'Logo', quantity: 1, unitPrice: 5000 },
        { description: 'Icons', quantity: 1, unitPrice: 99.5 },
      ],
    });

    expect(result.error?.issues).toMatchObject([
      {
        path: ['items', 1, 'unitPrice'],
        message: 'JPY has no decimals, so the price is a whole number.',
      },
    ]);
  });

  it('rejects a logo by relative path', () => {
    const result = invoiceSchema.safeParse({
      ...invoiceMock,
      seller: { ...invoiceMock.seller, logo: 'logo.png' },
    });

    expect(result.error?.issues).toMatchObject([
      { path: ['seller', 'logo'], message: 'Use an absolute path to the logo.' },
    ]);
  });

  it('rejects an invoice without items', () => {
    expect(invoiceSchema.safeParse({ ...invoiceMock, items: [] }).success).toBe(false);
  });
});
