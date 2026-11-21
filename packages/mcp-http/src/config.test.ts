import { describe, expect, it } from 'vitest';
import { readConfig } from './config';

describe('readConfig', () => {
  it('reads the secret and the public URL without its trailing slash', () => {
    const config = readConfig({
      INVOICE_LINK_SECRET: 'secret',
      PUBLIC_URL: 'https://www.nothing-fancy.space/invoice/',
    });

    expect(config).toMatchObject({
      linkSecret: 'secret',
      publicUrl: 'https://www.nothing-fancy.space/invoice',
    });
  });

  it('treats empty variables as unset', () => {
    expect(readConfig({ INVOICE_LINK_SECRET: '', PUBLIC_URL: '' })).toMatchObject({
      linkSecret: undefined,
      publicUrl: undefined,
    });
  });
});
