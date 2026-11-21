import { readFile } from 'node:fs/promises';
import { invoiceFieldsSchema } from 'invoice/schemas';
import { z } from 'zod';

const DEFAULT_DUE_IN_DAYS = 30;

export const invoiceDefaultsSchema = z.strictObject({
  ...invoiceFieldsSchema
    .pick({
      seller: true,
      payment: true,
      currency: true,
      taxRate: true,
      taxLabel: true,
      notes: true,
    })
    .partial().shape,
  dueInDays: z
    .number()
    .int()
    .min(0)
    .max(365)
    .default(DEFAULT_DUE_IN_DAYS)
    .describe('Days from the issue date to the due date, when an invoice has no due date'),
});

export type InvoiceDefaults = z.infer<typeof invoiceDefaultsSchema>;

export const EMPTY_DEFAULTS: InvoiceDefaults = { dueInDays: DEFAULT_DUE_IN_DAYS };

const parseJson = (filePath: string, text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${filePath} is not valid JSON.`, { cause: error });
  }
};

// Fails the start of the server, so a typo in the file never turns into wrong invoices.
export const readDefaults = async (filePath: string) => {
  const text = await readFile(filePath, 'utf8').catch((error: unknown) => {
    throw new Error(`Can't read the invoice defaults at ${filePath}.`, { cause: error });
  });
  const result = invoiceDefaultsSchema.safeParse(parseJson(filePath, text));
  if (!result.success) {
    throw new Error(`${filePath} has invalid invoice defaults:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
};
