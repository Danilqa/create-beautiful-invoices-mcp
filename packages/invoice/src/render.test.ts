import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractText, getDocumentProxy } from 'unpdf';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { invoiceMock } from './mocks';
import { renderInvoicePdf } from './render';

// A 1×1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const readPdf = async (pdf: Buffer) => {
  const document = await getDocumentProxy(new Uint8Array(pdf));
  const { totalPages, text } = await extractText(document, { mergePages: true });
  const { info } = await document.getMetadata();
  const { view } = await document.getPage(1);
  return { totalPages, text, info, view };
};

let folder: string;

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), 'invoice-render-'));
  await writeFile(join(folder, 'logo.png'), PNG);
  await writeFile(join(folder, 'logo.gif'), 'GIF89a');
});

afterAll(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe('renderInvoicePdf', () => {
  it('renders the invoice on one A4 page', async () => {
    const { totalPages, text, view } = await readPdf(await renderInvoicePdf(invoiceMock));

    expect(totalPages).toBe(1);
    expect(view.map(Math.round)).toEqual([0, 0, 595, 842]);
    for (const expected of [
      'Northwind Studio Ltd',
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
    expect(text).not.toContain('Discount');
    expect(text).not.toContain('Notes');
  });

  it('names the document after the invoice', async () => {
    const { info } = await readPdf(await renderInvoicePdf(invoiceMock));

    expect(info).toMatchObject({ Title: 'Invoice INV-2026-014', Author: 'Northwind Studio Ltd' });
  });

  it('leaves the tax row out without a rate', async () => {
    const { text } = await readPdf(await renderInvoicePdf({ ...invoiceMock, taxRate: undefined }));

    expect(text).not.toContain('VAT (');
    expect(text).toContain('£3,116.25');
  });

  it('prints the discount, the tax by its name and the notes', async () => {
    const { text } = await readPdf(
      await renderInvoicePdf({
        ...invoiceMock,
        discountRate: 10,
        taxRate: 10,
        taxLabel: 'GST',
        notes: 'PO 4471\nThank you for your business.',
      }),
    );

    for (const expected of [
      'Discount (10%)',
      '−£311.63',
      'GST (10%)',
      '£280.46',
      'GST GB123456789',
      '£3,085.08',
      'Notes',
      'PO 4471',
      'Thank you for your business.',
    ]) {
      expect(text).toContain(expected);
    }
  });

  it('prints letters and symbols outside latin', async () => {
    const { text } = await readPdf(
      await renderInvoicePdf({
        ...invoiceMock,
        currency: 'INR',
        client: { name: 'Łukasz Żółć', address: 'ООО «Ромашка»\nΕλλάδα\nNguyễn Văn' },
      }),
    );

    for (const expected of ['Łukasz Żółć', 'ООО «Ромашка»', 'Ελλάδα', 'Nguyễn Văn']) {
      expect(text).toContain(expected);
    }
    expect(text).toContain('₹3,739.50');
  });

  it('draws the logo instead of the name at the top', async () => {
    const countNames = (text: string) => text.split('Northwind Studio Ltd').length - 1;
    const withoutLogo = await renderInvoicePdf(invoiceMock);
    const withLogo = await renderInvoicePdf({
      ...invoiceMock,
      seller: { ...invoiceMock.seller, logo: join(folder, 'logo.png') },
    });

    expect(withoutLogo.includes('/Subtype /Image')).toBe(false);
    expect(withLogo.includes('/Subtype /Image')).toBe(true);
    // The name stays under From and as the account name.
    expect(countNames((await readPdf(withLogo)).text)).toBe(
      countNames((await readPdf(withoutLogo)).text) - 1,
    );
  });

  it('fails on a logo that is not a PNG or JPEG', async () => {
    const logo = join(folder, 'logo.gif');

    await expect(
      renderInvoicePdf({ ...invoiceMock, seller: { ...invoiceMock.seller, logo } }),
    ).rejects.toThrow(`The logo at ${logo} is not a PNG or JPEG image.`);
  });

  it('fails on a logo that does not exist', async () => {
    const logo = join(folder, 'missing.png');

    await expect(
      renderInvoicePdf({ ...invoiceMock, seller: { ...invoiceMock.seller, logo } }),
    ).rejects.toThrow(`Can't read the logo at ${logo}.`);
  });
});
