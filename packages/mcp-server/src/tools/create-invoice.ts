import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/server';
import { formatLongDate, formatMoney } from 'invoice/format';
import { renderInvoicePdf } from 'invoice/render';
import { currencySchema, invoiceSchema } from 'invoice/schemas';
import { calculateTotals } from 'invoice/totals';
import { z } from 'zod';
import type { ServerConfig } from '../config';
import { saveInvoicePdf } from '../files';

const createdInvoiceSchema = z.object({
  filePath: z.string().describe('Absolute path of the saved PDF'),
  invoiceNumber: z.string(),
  currency: currencySchema,
  total: z.string().describe('Amount due with VAT, formatted, such as £3,588.71'),
  dueDate: z.iso.date(),
});

export const registerCreateInvoice = (server: McpServer, config: ServerConfig) => {
  server.registerTool(
    'create_invoice',
    {
      title: 'Create invoice',
      description:
        'Creates a PDF invoice with line items, VAT and bank transfer details, and saves it to the invoices folder. Returns the path of the PDF. An invoice number that already has a PDF gets a numbered copy, so no invoice is ever replaced.',
      inputSchema: invoiceSchema,
      outputSchema: createdInvoiceSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async invoice => {
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
