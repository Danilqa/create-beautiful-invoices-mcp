import { z } from 'zod';

// Inter's latin files hold the symbols of these, so the PDF never prints a missing glyph.
export const currencySchema = z.enum(['GBP', 'EUR', 'USD']);

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
  vatNumber: z.string().trim().min(1).optional().describe('VAT registration number'),
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
    .describe('Price of one unit before VAT, such as 1250.5'),
});

export const invoiceSchema = z
  .object({
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
    vatRate: z
      .number()
      .min(0)
      .max(100)
      .default(0)
      .describe('VAT rate in percent, such as 20. 0 leaves VAT off the invoice'),
    payment: paymentSchema,
  })
  .refine(invoice => invoice.dueDate >= invoice.issueDate, {
    message: 'The due date is before the issue date.',
    path: ['dueDate'],
  });
