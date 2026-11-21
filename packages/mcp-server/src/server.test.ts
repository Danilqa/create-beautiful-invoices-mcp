import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { invoiceMock } from 'invoice/mocks';
import { match, P } from 'ts-pattern';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer } from './server';

let invoicesDir: string;
let client: Client;

beforeEach(async () => {
  invoicesDir = await mkdtemp(join(tmpdir(), 'invoices-'));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer({ invoicesDir }).connect(serverTransport);
  client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientTransport);
});

afterEach(async () => {
  await client.close();
  await rm(invoicesDir, { recursive: true, force: true });
});

describe('create_invoice', () => {
  it('describes its input and output', async () => {
    const { tools } = await client.listTools();

    expect(tools.map(tool => tool.name)).toEqual(['create_invoice']);
    const [tool] = tools;
    expect(tool?.inputSchema.required).toEqual([
      'invoiceNumber',
      'issueDate',
      'dueDate',
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
  });

  it('saves the invoice as a PDF and links to it', async () => {
    const result = await client.callTool({ name: 'create_invoice', arguments: invoiceMock });
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

  it('saves a numbered copy instead of replacing an invoice', async () => {
    await client.callTool({ name: 'create_invoice', arguments: invoiceMock });
    const result = await client.callTool({ name: 'create_invoice', arguments: invoiceMock });

    expect(result.structuredContent).toMatchObject({
      filePath: join(invoicesDir, 'invoice-INV-2026-014 (2).pdf'),
    });
  });

  it('keeps the file inside the invoices folder whatever the invoice number', async () => {
    const result = await client.callTool({
      name: 'create_invoice',
      arguments: { ...invoiceMock, invoiceNumber: '../../etc/passwd' },
    });

    expect(result.structuredContent).toMatchObject({
      filePath: join(invoicesDir, 'invoice-..-..-etc-passwd.pdf'),
    });
  });

  it('returns an error for an invalid invoice', async () => {
    const result = await client.callTool({
      name: 'create_invoice',
      arguments: { ...invoiceMock, dueDate: '2026-11-01' },
    });

    expect(result.isError).toBe(true);
    const message = match(result.content)
      .with([{ type: 'text', text: P.select() }], text => text)
      .otherwise(() => undefined);
    expect(message).toContain('The due date is before the issue date.');
  });
});
