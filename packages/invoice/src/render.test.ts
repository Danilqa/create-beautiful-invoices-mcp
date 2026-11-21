import { extractText, getDocumentProxy } from 'unpdf';
import { describe, expect, it } from 'vitest';
import { invoiceMock } from './mocks';
import { renderInvoicePdf } from './render';

const readPdf = async (pdf: Buffer) => {
  const document = await getDocumentProxy(new Uint8Array(pdf));
  const { totalPages, text } = await extractText(document, { mergePages: true });
  const { info } = await document.getMetadata();
  const { view } = await document.getPage(1);
  return { totalPages, text, info, view };
};

describe('renderInvoicePdf', () => {
  it('renders the invoice on one A4 page', async () => {
    const { totalPages, text, view } = await readPdf(await renderInvoicePdf(invoiceMock));

    expect(totalPages).toBe(1);
    expect(view.map(Math.round)).toEqual([0, 0, 595, 842]);
    for (const expected of [
      'Invoice INV-2026-014',
      'Amount due',
      '£3,739.50',
      'Due 21 December 2026',
      'Billed to',
      'Fabrikam Ltd',
      'VAT GB123456789',
      'Brand identity design',
      '£716.25',
      'VAT (20%)',
      '£623.25',
      'Pay by bank transfer',
      '55779911',
    ]) {
      expect(text).toContain(expected);
    }
  });

  it('names the document after the invoice', async () => {
    const { info } = await readPdf(await renderInvoicePdf(invoiceMock));

    expect(info).toMatchObject({ Title: 'Invoice INV-2026-014', Author: 'Northwind Studio Ltd' });
  });

  it('leaves the VAT row out when the rate is 0', async () => {
    const { text } = await readPdf(await renderInvoicePdf({ ...invoiceMock, vatRate: 0 }));

    expect(text).not.toContain('VAT (');
    expect(text).toContain('£3,116.25');
  });
});
