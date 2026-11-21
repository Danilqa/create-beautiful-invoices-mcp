import { renderToBuffer } from '@react-pdf/renderer';
import { registerFonts } from './fonts';
import { InvoiceDocument } from './invoice-document';
import type { Invoice } from './types';

registerFonts();

export const renderInvoicePdf = (invoice: Invoice) =>
  renderToBuffer(<InvoiceDocument invoice={invoice} />);
