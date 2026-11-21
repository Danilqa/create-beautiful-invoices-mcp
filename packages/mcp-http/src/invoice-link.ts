import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import type { Invoice } from 'invoice/types';
import { invoiceSchema } from 'invoice/schemas';
import { z } from 'zod';

const IV_BYTES = 12;
const TAG_BYTES = 16;
const DAY_MS = 24 * 60 * 60 * 1000;

export const LINK_LIFETIME_DAYS = 30;

const linkPayloadSchema = z.object({ invoice: invoiceSchema, expiresAt: z.iso.datetime() });

export class InvoiceLinkError extends Error {}

const toKey = (secret: string) => createHash('sha256').update(secret).digest();

// The link carries the invoice itself, encrypted, so nothing is stored and only this server can read it.
export const sealInvoice = (invoice: Invoice, secret: string, now: Date) => {
  const expiresAt = new Date(now.getTime() + LINK_LIFETIME_DAYS * DAY_MS).toISOString();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', toKey(secret), iv);
  const plaintext = deflateRawSync(JSON.stringify({ invoice, expiresAt }));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const token = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
  return { token, expiresAt };
};

const decrypt = (token: string, secret: string): unknown => {
  const sealed = Buffer.from(token, 'base64url');
  if (sealed.length <= IV_BYTES + TAG_BYTES) throw new InvoiceLinkError('The link is broken.');
  const decipher = createDecipheriv('aes-256-gcm', toKey(secret), sealed.subarray(0, IV_BYTES));
  decipher.setAuthTag(sealed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  try {
    const plaintext = Buffer.concat([
      decipher.update(sealed.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]);
    return JSON.parse(inflateRawSync(plaintext).toString('utf8'));
  } catch {
    throw new InvoiceLinkError('The link is broken.');
  }
};

export const openInvoice = (token: string, secret: string, now: Date) => {
  const payload = linkPayloadSchema.safeParse(decrypt(token, secret));
  if (!payload.success) throw new InvoiceLinkError('The link is broken.');
  if (new Date(payload.data.expiresAt) <= now) throw new InvoiceLinkError('The link has expired.');
  return payload.data.invoice;
};
