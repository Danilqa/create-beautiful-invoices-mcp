import { toInvoiceFileStem } from 'invoice/format';
import { renderInvoicePdf } from 'invoice/render';
import type { HttpConfig } from './config';
import { requireLinkSecret } from './config';
import { InvoiceLinkError, openInvoice } from './invoice-link';

const toTextResponse = (status: number, text: string) =>
  new Response(text, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

export const downloadInvoice = async (request: Request, config: HttpConfig) => {
  const token = new URL(request.url).searchParams.get('token');
  if (token === null) return toTextResponse(400, 'The link has no invoice in it.');
  try {
    const invoice = openInvoice(token, requireLinkSecret(config), config.now());
    const pdf = await renderInvoicePdf(invoice);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="${toInvoiceFileStem(invoice.invoiceNumber)}.pdf"`,
        // The link holds bank details, so no shared cache or search engine keeps a copy.
        'cache-control': 'private, no-store',
        'x-robots-tag': 'noindex',
      },
    });
  } catch (error) {
    if (error instanceof InvoiceLinkError) return toTextResponse(404, error.message);
    throw error;
  }
};
