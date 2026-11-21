import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { invoiceMock } from 'invoice/mocks';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readConfig } from './config';

let folder: string;

const writeDefaults = async (name: string, text: string) => {
  const filePath = join(folder, name);
  await writeFile(filePath, text);
  return filePath;
};

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), 'invoice-config-'));
});

afterAll(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe('readConfig', () => {
  it('saves invoices to ~/Invoices without defaults by default', async () => {
    const config = { invoicesDir: join(homedir(), 'Invoices'), defaults: { dueInDays: 30 } };

    expect(await readConfig({})).toEqual(config);
    expect(await readConfig({ INVOICES_DIR: '', INVOICE_DEFAULTS: '' })).toEqual(config);
  });

  it('takes the folder from INVOICES_DIR', async () => {
    expect(await readConfig({ INVOICES_DIR: '/tmp/invoices' })).toMatchObject({
      invoicesDir: '/tmp/invoices',
    });
  });

  it('reads the defaults from INVOICE_DEFAULTS', async () => {
    const { seller, payment } = invoiceMock;
    const filePath = await writeDefaults(
      'defaults.json',
      JSON.stringify({ seller, payment, currency: 'EUR', taxRate: 21, dueInDays: 14 }),
    );

    expect((await readConfig({ INVOICE_DEFAULTS: filePath })).defaults).toEqual({
      seller,
      payment,
      currency: 'EUR',
      taxRate: 21,
      dueInDays: 14,
    });
  });

  it('fails on a defaults file that is not JSON', async () => {
    const filePath = await writeDefaults('broken.json', '{ seller: ');

    await expect(readConfig({ INVOICE_DEFAULTS: filePath })).rejects.toThrow(
      `${filePath} is not valid JSON.`,
    );
  });

  it('fails on an unknown field, so a typo never goes unnoticed', async () => {
    const filePath = await writeDefaults('typo.json', JSON.stringify({ texRate: 20 }));

    await expect(readConfig({ INVOICE_DEFAULTS: filePath })).rejects.toThrow(
      `${filePath} has invalid invoice defaults:`,
    );
  });

  it('fails on a defaults file that does not exist', async () => {
    const filePath = join(folder, 'missing.json');

    await expect(readConfig({ INVOICE_DEFAULTS: filePath })).rejects.toThrow(
      `Can't read the invoice defaults at ${filePath}.`,
    );
  });
});
