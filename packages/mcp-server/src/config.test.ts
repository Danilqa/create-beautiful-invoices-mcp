import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readConfig } from './config';

describe('readConfig', () => {
  it('saves invoices to ~/Invoices by default', () => {
    expect(readConfig({})).toEqual({ invoicesDir: join(homedir(), 'Invoices') });
    expect(readConfig({ INVOICES_DIR: '' })).toEqual({ invoicesDir: join(homedir(), 'Invoices') });
  });

  it('takes the folder from INVOICES_DIR', () => {
    expect(readConfig({ INVOICES_DIR: '/tmp/invoices' })).toEqual({ invoicesDir: '/tmp/invoices' });
  });
});
