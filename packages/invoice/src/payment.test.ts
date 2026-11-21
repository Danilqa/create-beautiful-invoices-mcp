import { describe, expect, it } from 'vitest';
import { invoiceMock } from './mocks';
import { toPaymentFields } from './payment';

describe('toPaymentFields', () => {
  it('lists the sort code and account number of a UK transfer', () => {
    expect(toPaymentFields(invoiceMock)).toEqual([
      { label: 'Account name', value: 'Northwind Studio Ltd' },
      { label: 'Sort code', value: '20-00-00' },
      { label: 'Account number', value: '55779911' },
      { label: 'Reference', value: 'INV-2026-014' },
    ]);
  });

  it('lists the IBAN and SWIFT/BIC of an international transfer', () => {
    const fields = toPaymentFields({
      ...invoiceMock,
      payment: {
        method: 'iban-transfer',
        accountName: 'Northwind Studio Ltd',
        iban: 'GB33 BUKB 2020 1555 5555 55',
        swiftBic: 'BUKBGB22',
      },
    });

    expect(fields).toEqual([
      { label: 'Account name', value: 'Northwind Studio Ltd' },
      { label: 'IBAN', value: 'GB33 BUKB 2020 1555 5555 55' },
      { label: 'SWIFT/BIC', value: 'BUKBGB22' },
      { label: 'Reference', value: 'INV-2026-014' },
    ]);
  });

  it('leaves SWIFT/BIC out when there is none', () => {
    const fields = toPaymentFields({
      ...invoiceMock,
      payment: {
        method: 'iban-transfer',
        accountName: 'Northwind',
        iban: 'DE89370400440532013000',
      },
    });

    expect(fields.map(field => field.label)).toEqual(['Account name', 'IBAN', 'Reference']);
  });
});
