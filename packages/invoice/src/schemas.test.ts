import { describe, expect, it } from 'vitest';
import { invoiceMock } from './mocks';
import { invoiceSchema } from './schemas';

describe('invoiceSchema', () => {
  it('accepts a complete invoice', () => {
    expect(invoiceSchema.parse(invoiceMock)).toEqual(invoiceMock);
  });

  it('defaults the quantity to 1 and the VAT rate to 0', () => {
    const invoice = invoiceSchema.parse({
      ...invoiceMock,
      vatRate: undefined,
      items: [{ description: 'Logo', unitPrice: 500 }],
    });

    expect(invoice.vatRate).toBe(0);
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

  it('rejects an invoice without items', () => {
    expect(invoiceSchema.safeParse({ ...invoiceMock, items: [] }).success).toBe(false);
  });
});
