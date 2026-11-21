import { isAbsolute } from 'node:path';
import { z } from 'zod';
import { toCurrencyDigits } from './format';

// Inter has the symbols of these, so the PDF never prints a missing glyph.
export const currencySchema = z.enum([
  'GBP',
  'EUR',
  'USD',
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'INR',
  'JPY',
  'KRW',
  'NZD',
  'RUB',
  'SGD',
  'ZAR',
]);

const accountNameSchema = z.string().trim().min(1).describe('Name on the bank account');

export const paymentSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('uk-bank-transfer'),
    accountName: accountNameSchema,
    sortCode: z
      .string()
      .regex(/^\d{2}-?\d{2}-?\d{2}$/)
      .describe('UK sort code, such as 20-00-00'),
    accountNumber: z
      .string()
      .regex(/^\d{8}$/)
      .describe('UK account number, 8 digits'),
  }),
  z.object({
    method: z.literal('iban-transfer'),
    accountName: accountNameSchema,
    iban: z.string().trim().min(15).max(42).describe('IBAN, spaces allowed'),
    swiftBic: z
      .string()
      .regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/)
      .optional()
      .describe('SWIFT/BIC code, needed for international transfers'),
  }),
]);

export const sellerSchema = z.object({
  name: z.string().trim().min(1).describe('Business or person that issues the invoice'),
  address: z.string().trim().min(1).optional().describe('Postal address, one line per row'),
  email: z.email().optional(),
  phone: z.string().trim().min(1).optional(),
  taxNumber: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Tax registration number, such as a VAT or GST number. Printed after the tax label'),
  logo: z
    .string()
    .refine(isAbsolute, 'Use an absolute path to the logo.')
    .optional()
    .describe('Absolute path to a PNG or JPEG logo, printed at the top instead of the name'),
});

export const clientSchema = z.object({
  name: z.string().trim().min(1).describe('Business or person the invoice is billed to'),
  address: z.string().trim().min(1).optional().describe('Postal address, one line per row'),
  email: z.email().optional(),
});

export const lineItemSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z
    .number()
    .positive()
    .multipleOf(0.01)
    .default(1)
    .describe('Units or hours, such as 1 or 7.5'),
  unitPrice: z
    .number()
    .nonnegative()
    .multipleOf(0.01)
    .describe('Price of one unit before tax, such as 1250.5'),
});

const percentSchema = z.number().min(0).max(100);

export const invoiceFieldsSchema = z.object({
  invoiceNumber: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .describe('Unique invoice number, also the payment reference, such as INV-2026-001'),
  issueDate: z.iso.date().describe('Date the invoice is issued, YYYY-MM-DD'),
  dueDate: z.iso.date().describe('Date the payment is due, YYYY-MM-DD'),
  currency: currencySchema,
  seller: sellerSchema,
  client: clientSchema,
  items: z.array(lineItemSchema).min(1),
  discountRate: percentSchema
    .optional()
    .describe('Discount on the subtotal in percent, such as 15. Taken off before tax'),
  taxRate: percentSchema
    .optional()
    .describe('Tax rate in percent, such as 20. Leave it out for no tax'),
  taxLabel: z
    .string()
    .trim()
    .min(1)
    .max(24)
    .optional()
    .describe('Name of the tax, such as VAT, GST or Sales tax. VAT by default'),
  notes: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .optional()
    .describe('Notes printed under the totals, such as a PO number or a thank-you'),
  payment: paymentSchema,
});

export const invoiceSchema = invoiceFieldsSchema.superRefine((invoice, context) => {
  if (invoice.dueDate < invoice.issueDate) {
    context.addIssue({
      code: 'custom',
      message: 'The due date is before the issue date.',
      path: ['dueDate'],
    });
  }
  if (toCurrencyDigits(invoice.currency) === 0) {
    invoice.items.forEach((item, index) => {
      if (!Number.isInteger(item.unitPrice)) {
        context.addIssue({
          code: 'custom',
          message: `${invoice.currency} has no decimals, so the price is a whole number.`,
          path: ['items', index, 'unitPrice'],
        });
      }
    });
  }
});
