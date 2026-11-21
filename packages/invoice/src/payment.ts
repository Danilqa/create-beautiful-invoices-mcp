import { match } from 'ts-pattern';
import type { Invoice } from './types';

export interface PaymentField {
  label: string;
  value: string;
}

// The account fields each method is paid by, as on a UK bill.
export const toPaymentFields = ({ payment, invoiceNumber }: Invoice): PaymentField[] => {
  const accountFields = match(payment)
    .with({ method: 'uk-bank-transfer' }, ({ sortCode, accountNumber }) => [
      { label: 'Sort code', value: sortCode },
      { label: 'Account number', value: accountNumber },
    ])
    .with({ method: 'iban-transfer' }, ({ iban, swiftBic }) => [
      { label: 'IBAN', value: iban },
      ...(swiftBic === undefined ? [] : [{ label: 'SWIFT/BIC', value: swiftBic }]),
    ])
    .exhaustive();
  return [
    { label: 'Account name', value: payment.accountName },
    ...accountFields,
    { label: 'Reference', value: invoiceNumber },
  ];
};
