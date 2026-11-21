import { invoiceMock } from 'invoice/mocks';
import { describe, expect, it } from 'vitest';
import { openInvoice, sealInvoice } from './invoice-link';

const SECRET = 'test-secret';
const NOW = new Date('2026-11-21T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('sealInvoice', () => {
  it('opens to the same invoice until the link expires 30 days later', () => {
    const { token, expiresAt } = sealInvoice(invoiceMock, SECRET, NOW);

    expect(expiresAt).toBe('2026-12-21T12:00:00.000Z');
    expect(openInvoice(token, SECRET, new Date(NOW.getTime() + 29 * DAY_MS))).toEqual(invoiceMock);
  });

  it('keeps the invoice unreadable in the link', () => {
    const { token } = sealInvoice(invoiceMock, SECRET, NOW);

    expect(token).toMatch(/^[\w-]+$/);
    expect(Buffer.from(token, 'base64url').toString('latin1')).not.toContain('Northwind');
  });
});

describe('openInvoice', () => {
  it('refuses an expired link', () => {
    const { token } = sealInvoice(invoiceMock, SECRET, NOW);

    expect(() => openInvoice(token, SECRET, new Date(NOW.getTime() + 30 * DAY_MS))).toThrow(
      'The link has expired.',
    );
  });

  it('refuses a link sealed with another secret', () => {
    const { token } = sealInvoice(invoiceMock, 'another-secret', NOW);

    expect(() => openInvoice(token, SECRET, NOW)).toThrow('The link is broken.');
  });

  it('refuses a changed link', () => {
    const { token } = sealInvoice(invoiceMock, SECRET, NOW);
    const sealed = Buffer.from(token, 'base64url');
    sealed[sealed.length - 1] = (sealed.at(-1) ?? 0) ^ 1;

    expect(() => openInvoice(sealed.toString('base64url'), SECRET, NOW)).toThrow(
      'The link is broken.',
    );
  });

  it('refuses a link that is not a sealed invoice', () => {
    expect(() => openInvoice('', SECRET, NOW)).toThrow('The link is broken.');
    expect(() => openInvoice('not-a-token-at-all-but-long-enough', SECRET, NOW)).toThrow(
      'The link is broken.',
    );
  });
});
