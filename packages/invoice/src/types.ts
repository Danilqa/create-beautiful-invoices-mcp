import type { z } from 'zod';
import type { currencySchema, invoiceSchema, lineItemSchema, paymentSchema } from './schemas';

export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceInput = z.input<typeof invoiceSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type LineItem = z.infer<typeof lineItemSchema>;

export interface PricedLine extends LineItem {
  amountMinor: number;
  unitPriceMinor: number;
}

export interface Totals {
  lines: PricedLine[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
}
