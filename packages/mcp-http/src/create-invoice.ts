import type { McpServer } from '@modelcontextprotocol/server';
import { getPublicOrigin } from 'mcp-handler';
import { addDays, toLocalIsoDate } from 'invoice/dates';
import { formatLongDate, formatMoney, toInvoiceFileStem } from 'invoice/format';
import { currencySchema, invoiceFieldsSchema, invoiceSchema, sellerSchema } from 'invoice/schemas';
import { calculateTotals } from 'invoice/totals';
import { z } from 'zod';
import type { HttpConfig } from './config';
import { requireLinkSecret } from './config';
import { LINK_LIFETIME_DAYS, sealInvoice } from './invoice-link';

const DUE_IN_DAYS = 30;

export const INVOICE_PATH = '/api/invoice';

// A logo is a path on the caller's machine, which a hosted server can't read.
const inputSchema = invoiceFieldsSchema
  .extend({ seller: sellerSchema.omit({ logo: true }) })
  .partial({ issueDate: true, dueDate: true });

const createdInvoiceSchema = z.object({
  url: z.url().describe(`Link to the PDF, valid for ${LINK_LIFETIME_DAYS} days`),
  invoiceNumber: z.string(),
  currency: currencySchema,
  total: z.string().describe('Amount due with tax, formatted, such as £3,588.71'),
  dueDate: z.iso.date(),
  expiresAt: z.iso.datetime().describe('When the link stops working'),
});

export const registerCreateInvoice = (server: McpServer, config: HttpConfig) => {
  server.registerTool(
    'create_invoice',
    {
      title: 'Create invoice',
      description: [
        'Creates a PDF invoice with line items, discount, tax, notes and bank transfer details.',
        `Returns a link to the PDF that works for ${LINK_LIFETIME_DAYS} days. Nothing is stored: the link carries the invoice, encrypted.`,
        `The issue date is today in UTC by default, and the due date ${DUE_IN_DAYS} days after it.`,
      ].join(' '),
      inputSchema,
      outputSchema: createdInvoiceSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    (input, context) => {
      const request = context.http?.req;
      if (request === undefined) throw new Error('create_invoice runs over HTTP only.');
      const now = config.now();
      const issueDate = input.issueDate ?? toLocalIsoDate(now);
      const result = invoiceSchema.safeParse({
        ...input,
        issueDate,
        dueDate: input.dueDate ?? addDays(issueDate, DUE_IN_DAYS),
      });
      if (!result.success) throw new Error(z.prettifyError(result.error));
      const invoice = result.data;

      const { token, expiresAt } = sealInvoice(invoice, requireLinkSecret(config), now);
      const url = new URL(`${config.publicUrl ?? getPublicOrigin(request)}${INVOICE_PATH}`);
      url.searchParams.set('token', token);
      const total = formatMoney(calculateTotals(invoice).totalMinor, invoice.currency);
      return {
        content: [
          {
            type: 'text',
            text: `Created invoice ${invoice.invoiceNumber} for ${total}, due ${formatLongDate(invoice.dueDate)}. Download the PDF within ${LINK_LIFETIME_DAYS} days: ${url.href}`,
          },
          {
            type: 'resource_link',
            uri: url.href,
            name: `${toInvoiceFileStem(invoice.invoiceNumber)}.pdf`,
            mimeType: 'application/pdf',
          },
        ],
        structuredContent: {
          url: url.href,
          invoiceNumber: invoice.invoiceNumber,
          currency: invoice.currency,
          total,
          dueDate: invoice.dueDate,
          expiresAt,
        },
      };
    },
  );
};
