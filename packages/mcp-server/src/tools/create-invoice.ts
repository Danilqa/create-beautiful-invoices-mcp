import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/server';
import { formatLongDate, formatMoney } from 'invoice/format';
import { renderInvoicePdf } from 'invoice/render';
import { currencySchema, invoiceFieldsSchema, invoiceSchema } from 'invoice/schemas';
import { calculateTotals } from 'invoice/totals';
import { z } from 'zod';
import type { ServerConfig } from '../config';
import { addDays, toLocalIsoDate } from '../dates';
import type { InvoiceDefaults } from '../defaults';
import { saveInvoicePdf } from '../files';

const createdInvoiceSchema = z.object({
  filePath: z.string().describe('Absolute path of the saved PDF'),
  invoiceNumber: z.string(),
  currency: currencySchema,
  total: z.string().describe('Amount due with tax, formatted, such as £3,588.71'),
  dueDate: z.iso.date(),
});

// The fields the defaults file can fill in, so the tool asks for them only when it doesn't.
const toDefaultedFields = ({ seller, payment, currency }: InvoiceDefaults) => ({
  ...(seller === undefined ? {} : { seller: true as const }),
  ...(payment === undefined ? {} : { payment: true as const }),
  ...(currency === undefined ? {} : { currency: true as const }),
});

const toDescription = ({ defaults }: ServerConfig) => {
  const defaultedFields = Object.entries(defaults)
    .filter(([field, value]) => field !== 'dueInDays' && value !== undefined)
    .map(([field]) => field);
  return [
    'Creates a PDF invoice with line items, discount, tax, notes and bank transfer details, and saves it to the invoices folder. Returns the path of the PDF.',
    `The issue date is today by default, and the due date ${defaults.dueInDays} days after it.`,
    defaultedFields.length > 0 &&
      `Leave out ${defaultedFields.join(', ')} to use the saved defaults. A field given here replaces its default as a whole.`,
    'An invoice number that already has a PDF gets a numbered copy, so no invoice is ever replaced.',
  ]
    .filter(sentence => sentence !== false)
    .join(' ');
};

export const registerCreateInvoice = (server: McpServer, config: ServerConfig, now: () => Date) => {
  const { dueInDays, ...fieldDefaults } = config.defaults;
  server.registerTool(
    'create_invoice',
    {
      title: 'Create invoice',
      description: toDescription(config),
      inputSchema: invoiceFieldsSchema.partial({
        issueDate: true,
        dueDate: true,
        ...toDefaultedFields(config.defaults),
      }),
      outputSchema: createdInvoiceSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async input => {
      const issueDate = input.issueDate ?? toLocalIsoDate(now());
      const result = invoiceSchema.safeParse({
        ...fieldDefaults,
        ...input,
        issueDate,
        dueDate: input.dueDate ?? addDays(issueDate, dueInDays),
      });
      if (!result.success) throw new Error(z.prettifyError(result.error));
      const invoice = result.data;

      const pdf = await renderInvoicePdf(invoice);
      const filePath = await saveInvoicePdf(config.invoicesDir, invoice.invoiceNumber, pdf);
      const total = formatMoney(calculateTotals(invoice).totalMinor, invoice.currency);
      return {
        content: [
          {
            type: 'text',
            text: `Created invoice ${invoice.invoiceNumber} for ${total}, due ${formatLongDate(invoice.dueDate)}: ${filePath}`,
          },
          {
            type: 'resource_link',
            uri: pathToFileURL(filePath).href,
            name: basename(filePath),
            mimeType: 'application/pdf',
          },
        ],
        structuredContent: {
          filePath,
          invoiceNumber: invoice.invoiceNumber,
          currency: invoice.currency,
          total,
          dueDate: invoice.dueDate,
        },
      };
    },
  );
};
