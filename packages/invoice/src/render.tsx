import { renderToBuffer } from '@react-pdf/renderer';
import { registerFonts } from './fonts';
import { InvoiceDocument } from './invoice-document';
import { readLogo } from './logo';
import type { Invoice } from './types';

registerFonts();

export const renderInvoicePdf = async (invoice: Invoice) => {
  const logo = invoice.seller.logo === undefined ? undefined : await readLogo(invoice.seller.logo);
  return renderToBuffer(<InvoiceDocument invoice={invoice} logo={logo} />);
};
