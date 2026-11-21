import type { CallToolResult } from '@modelcontextprotocol/client';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { invoiceMock } from 'invoice/mocks';
import { match, P } from 'ts-pattern';
import { afterEach, describe, expect, it } from 'vitest';
import type { HttpConfig } from './config';
import { downloadInvoice } from './download-invoice';
import { createInvoiceMcpHandler } from './mcp-handler';

const NOW = new Date('2026-11-05T09:00:00Z');
const CONFIG: HttpConfig = { linkSecret: 'test-secret', now: () => NOW };

const { invoiceNumber, currency, seller, client: billedTo, items, taxRate, payment } = invoiceMock;
const invoice = { invoiceNumber, currency, seller, client: billedTo, items, taxRate, payment };

let client: Client | undefined;

// Talks to the handler as Vercel would call it, behind its proxy.
const connect = async (era: 'legacy' | 'modern', config = CONFIG) => {
  const handler = createInvoiceMcpHandler(config);
  const transport = new StreamableHTTPClientTransport(new URL('http://localhost/api/mcp'), {
    fetch: async (url, init) => {
      const request = new Request(url, init);
      request.headers.set('x-forwarded-host', 'invoices.example.com');
      request.headers.set('x-forwarded-proto', 'https');
      return handler(request);
    },
  });
  const connected = new Client(
    { name: 'test', version: '0.0.0' },
    match(era)
      .with('modern', () => ({ versionNegotiation: { mode: 'auto' as const } }))
      .with('legacy', () => ({}))
      .exhaustive(),
  );
  await connected.connect(transport);
  client = connected;
  return connected;
};

const toText = (result: CallToolResult) =>
  match(result.content)
    .with([{ type: 'text', text: P.select() }, ...P.array()], text => text)
    .otherwise(() => undefined);

const toUrl = (result: CallToolResult) =>
  match(result.structuredContent)
    .with({ url: P.select(P.string) }, url => url)
    .otherwise(() => undefined);

afterEach(async () => {
  await client?.close();
  client = undefined;
});

describe('the hosted create_invoice', () => {
  it('asks for everything but the dates and has no logo', async () => {
    const { tools } = await (await connect('legacy')).listTools();
    const [tool] = tools;

    expect(tool?.name).toBe('create_invoice');
    expect(tool?.inputSchema.required).toEqual([
      'invoiceNumber',
      'currency',
      'seller',
      'client',
      'items',
      'payment',
    ]);
    expect(JSON.stringify(tool?.inputSchema)).not.toContain('logo');
    expect(tool?.annotations).toMatchObject({ readOnlyHint: true });
  });

  it.each(['legacy', 'modern'] as const)(
    'links to the PDF on the public host over the %s protocol',
    async era => {
      const result = await (
        await connect(era)
      ).callTool({ name: 'create_invoice', arguments: invoice });
      const url = toUrl(result);

      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toMatchObject({
        invoiceNumber: 'INV-2026-014',
        currency: 'GBP',
        total: '£3,739.50',
        dueDate: '2026-12-05',
        expiresAt: '2026-12-05T09:00:00.000Z',
      });
      expect(url).toMatch(/^https:\/\/invoices\.example\.com\/api\/invoice\?token=[\w-]+$/);
      expect(toText(result)).toContain(`Download the PDF within 30 days: ${url ?? ''}`);
      expect(result.content).toContainEqual({
        type: 'resource_link',
        uri: url,
        name: 'invoice-INV-2026-014.pdf',
        mimeType: 'application/pdf',
      });

      const response = await downloadInvoice(new Request(url ?? ''), CONFIG);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
    },
  );

  it('returns an error for an invalid invoice', async () => {
    const result = await (
      await connect('legacy')
    ).callTool({
      name: 'create_invoice',
      arguments: { ...invoice, issueDate: '2026-12-01', dueDate: '2026-11-01' },
    });

    expect(result.isError).toBe(true);
    expect(toText(result)).toContain('The due date is before the issue date.');
  });

  it('returns an error without a secret on the server', async () => {
    const result = await (
      await connect('legacy', { linkSecret: undefined, now: () => NOW })
    ).callTool({ name: 'create_invoice', arguments: invoice });

    expect(result.isError).toBe(true);
    expect(toText(result)).toBe('INVOICE_LINK_SECRET is not set on the server.');
  });
});
