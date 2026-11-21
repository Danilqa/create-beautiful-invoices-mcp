import type { Invoice } from './types';

export const invoiceMock: Invoice = {
  invoiceNumber: 'INV-2026-014',
  issueDate: '2026-11-21',
  dueDate: '2026-12-21',
  currency: 'GBP',
  seller: {
    name: 'Northwind Studio Ltd',
    address: '12 Hoxton Square\nLondon N1 6NU',
    email: 'billing@northwind.studio',
    phone: '+44 20 7946 0958',
    vatNumber: 'GB123456789',
  },
  client: {
    name: 'Fabrikam Ltd',
    address: '1 Canada Square\nLondon E14 5AB',
    email: 'accounts@fabrikam.co.uk',
  },
  items: [
    { description: 'Brand identity design', quantity: 1, unitPrice: 2400 },
    { description: 'Design review, hours', quantity: 7.5, unitPrice: 95.5 },
  ],
  vatRate: 20,
  payment: {
    method: 'uk-bank-transfer',
    accountName: 'Northwind Studio Ltd',
    sortCode: '20-00-00',
    accountNumber: '55779911',
  },
};
