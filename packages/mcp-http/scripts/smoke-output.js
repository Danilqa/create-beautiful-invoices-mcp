// Calls the built functions as Vercel does: imports each bundle and passes it a Request.
// Catches what the unit tests can't, such as a font or a file that the bundle left behind.
import assert from 'node:assert/strict';

process.env.INVOICE_LINK_SECRET = 'smoke-secret';

const FUNCTIONS_URL = new URL('../.vercel/output/functions/api/', import.meta.url);
const mcp = await import(new URL('mcp.func/index.mjs', FUNCTIONS_URL).href);
const invoice = await import(new URL('invoice.func/index.mjs', FUNCTIONS_URL).href);

const response = await mcp.POST(
  new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      'mcp-protocol-version': '2025-11-25',
      'x-forwarded-host': 'invoices.example.com',
      'x-forwarded-proto': 'https',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'create_invoice',
        arguments: {
          invoiceNumber: 'SMOKE-1',
          currency: 'EUR',
          taxRate: 20,
          seller: { name: 'Łukasz Studio' },
          client: { name: 'ООО «Ромашка»' },
          items: [{ description: 'Design', quantity: 2, unitPrice: 500 }],
          payment: {
            method: 'iban-transfer',
            accountName: 'Łukasz Studio',
            iban: 'DE89 3704 0044 0532 0130 00',
          },
        },
      },
    }),
  }),
);
assert.equal(response.status, 200);
const body = await response.text();
const message = JSON.parse(body.startsWith('event:') ? body.split('data: ').at(-1) : body);
const { url, total } = message.result.structuredContent;
assert.equal(total, '€1,200.00');
assert.match(url, /^https:\/\/invoices\.example\.com\/api\/invoice\?token=[\w-]+$/);

const pdf = await invoice.GET(new Request(url));
assert.equal(pdf.status, 200);
assert.equal(pdf.headers.get('content-type'), 'application/pdf');
const bytes = Buffer.from(await pdf.arrayBuffer());
assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
console.log(`The built functions made invoice SMOKE-1 for ${total}, a ${bytes.length}-byte PDF.`);
