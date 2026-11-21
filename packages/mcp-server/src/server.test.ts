import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CallToolResult } from '@modelcontextprotocol/client';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { invoiceMock } from 'invoice/mocks';
import { match, P } from 'ts-pattern';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { InvoiceDefaults } from './defaults';
import { EMPTY_DEFAULTS } from './defaults';
import { createServer } from './server';

const NOW = new Date(2026, 10, 5, 12, 0);

const { invoiceNumber, currency, seller, client: billedTo, items, taxRate, payment } = invoiceMock;

let invoicesDir: string;
let client: Client | undefined;

const connect = async (defaults: InvoiceDefaults = EMPTY_DEFAULTS) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer({ invoicesDir, defaults }, () => NOW).connect(serverTransport);
  const connected = new Client({ name: 'test', version: '0.0.0' });
  await connected.connect(clientTransport);
  client = connected;
  return connected;
};

const toErrorMessage = (result: CallToolResult) =>
  match(result.content)
    .with([{ type: 'text', text: P.select() }], text => text)
    .otherwise(() => undefined);

beforeEach(async () => {
  invoicesDir = await mkdtemp(join(tmpdir(), 'invoices-'));
});

afterEach(async () => {
  await client?.close();
  client = undefined;
  await rm(invoicesDir, { recursive: true, force: true });
});

describe('create_invoice', () => {
  it('describes its input and output', async () => {
    const { tools } = await (await connect()).listTools();

    expect(tools.map(tool => tool.name)).toEqual(['create_invoice']);
    const [tool] = tools;
    expect(tool?.inputSchema.required).toEqual([
      'invoiceNumber',
      'currency',
      'seller',
      'client',
      'items',
      'payment',
    ]);
    expect(tool?.outputSchema?.['required']).toEqual([
      'filePath',
      'invoiceNumber',
      'currency',
      'total',
      'dueDate',
    ]);
    expect(tool?.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    });
    expect(tool?.description).not.toContain('saved defaults');
  });

  it('saves the invoice as a PDF and links to it', async () => {
    const result = await (
      await connect()
    ).callTool({ name: 'create_invoice', arguments: invoiceMock });
    const filePath = join(invoicesDir, 'invoice-INV-2026-014.pdf');

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      filePath,
      invoiceNumber: 'INV-2026-014',
      currency: 'GBP',
      total: '£3,739.50',
      dueDate: '2026-12-21',
    });
    expect(result.content).toEqual([
      {
        type: 'text',
        text: `Created invoice INV-2026-014 for £3,739.50, due 21 December 2026: ${filePath}`,
      },
      {
        type: 'resource_link',
        uri: pathToFileURL(filePath).href,
        name: 'invoice-INV-2026-014.pdf',
        mimeType: 'application/pdf',
      },
    ]);
    const pdf = await readFile(filePath);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('issues the invoice today and makes it due 30 days later by default', async () => {
    const result = await (
      await connect()
    ).callTool({
      name: 'create_invoice',
      arguments: { invoiceNumber, currency, seller, client: billedTo, items, payment },
    });

    expect(result.structuredContent).toMatchObject({ dueDate: '2026-12-05' });
  });

  it('takes the due date from the issue date it is given', async () => {
    const result = await (
      await connect({ dueInDays: 14 })
    ).callTool({
      name: 'create_invoice',
      arguments: {
        invoiceNumber,
        currency,
        seller,
        client: billedTo,
        items,
        payment,
        issueDate: '2026-12-25',
      },
    });

    expect(result.structuredContent).toMatchObject({ dueDate: '2027-01-08' });
  });

  it('saves a numbered copy instead of replacing an invoice', async () => {
    const connected = await connect();
    await connected.callTool({ name: 'create_invoice', arguments: invoiceMock });
    const result = await connected.callTool({ name: 'create_invoice', arguments: invoiceMock });

    expect(result.structuredContent).toMatchObject({
      filePath: join(invoicesDir, 'invoice-INV-2026-014 (2).pdf'),
    });
  });

  it('keeps the file inside the invoices folder whatever the invoice number', async () => {
    const result = await (
      await connect()
    ).callTool({
      name: 'create_invoice',
      arguments: { ...invoiceMock, invoiceNumber: '../../etc/passwd' },
    });

    expect(result.structuredContent).toMatchObject({
      filePath: join(invoicesDir, 'invoice-..-..-etc-passwd.pdf'),
    });
  });

  it('returns an error for an invalid invoice', async () => {
    const result = await (
      await connect()
    ).callTool({
      name: 'create_invoice',
      arguments: { ...invoiceMock, dueDate: '2026-11-01' },
    });

    expect(result.isError).toBe(true);
    expect(toErrorMessage(result)).toContain('The due date is before the issue date.');
  });
});

describe('create_invoice with saved defaults', () => {
  const defaults: InvoiceDefaults = { seller, payment, currency, taxRate, dueInDays: 30 };

  it('asks only for the fields the defaults leave out', async () => {
    const { tools } = await (await connect(defaults)).listTools();
    const [tool] = tools;

    expect(tool?.inputSchema.required).toEqual(['invoiceNumber', 'client', 'items']);
    expect(tool?.description).toContain(
      'Leave out seller, payment, currency, taxRate to use the saved defaults.',
    );
  });

  it('fills an invoice in from the defaults', async () => {
    const result = await (
      await connect(defaults)
    ).callTool({ name: 'create_invoice', arguments: { invoiceNumber, client: billedTo, items } });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({ currency: 'GBP', total: '£3,739.50' });
  });

  it('takes a field given in the call over its default', async () => {
    const result = await (
      await connect(defaults)
    ).callTool({ name: 'create_invoice', arguments: { ...invoiceMock, taxRate: 0 } });

    expect(result.structuredContent).toMatchObject({ total: '£3,116.25' });
  });

  it('returns an error when neither the call nor the defaults name the seller', async () => {
    const result = await (
      await connect({ payment, currency, dueInDays: 30 })
    ).callTool({ name: 'create_invoice', arguments: { invoiceNumber, client: billedTo, items } });

    expect(result.isError).toBe(true);
    expect(toErrorMessage(result)).toContain('seller');
  });
});
