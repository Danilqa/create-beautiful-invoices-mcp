import { invoiceMock } from 'invoice/mocks';
import { describe, expect, it } from 'vitest';
import { downloadInvoice } from './download-invoice';
import { sealInvoice } from './invoice-link';

const NOW = new Date('2026-11-21T12:00:00Z');
const config = { linkSecret: 'test-secret', publicUrl: undefined, now: () => NOW };

const download = (query: string) =>
  downloadInvoice(new Request(`https://invoices.test/api/invoice${query}`), config);

describe('downloadInvoice', () => {
  it('renders the PDF in the link', async () => {
    const { token } = sealInvoice(invoiceMock, config.linkSecret, NOW);
    const response = await download(`?token=${token}`);

    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toMatchObject({
      'content-type': 'application/pdf',
      'content-disposition': 'inline; filename="invoice-INV-2026-014.pdf"',
      'cache-control': 'private, no-store',
    });
    expect(
      Buffer.from(await response.arrayBuffer())
        .subarray(0, 5)
        .toString(),
    ).toBe('%PDF-');
  });

  it('answers 400 without a token', async () => {
    const response = await download('');

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('The link has no invoice in it.');
  });

  it('answers 404 for a broken or expired link', async () => {
    const { token } = sealInvoice(invoiceMock, config.linkSecret, new Date('2026-01-01T00:00:00Z'));

    expect(await (await download('?token=broken')).text()).toBe('The link is broken.');
    const expired = await download(`?token=${token}`);
    expect(expired.status).toBe(404);
    expect(await expired.text()).toBe('The link has expired.');
  });

  it('fails without a secret on the server', async () => {
    await expect(
      downloadInvoice(new Request('https://invoices.test/api/invoice?token=x'), {
        linkSecret: undefined,
        publicUrl: undefined,
        now: () => NOW,
      }),
    ).rejects.toThrow('INVOICE_LINK_SECRET is not set on the server.');
  });
});
