import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { toInvoiceFileStem } from 'invoice/format';

const MAX_COPIES = 1000;

const checkFileExistsError = (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === 'EEXIST';

// Never replaces a file on disk: another copy gets a numbered name, as Finder does.
export const saveInvoicePdf = async (directory: string, invoiceNumber: string, pdf: Buffer) => {
  await mkdir(directory, { recursive: true });
  const stem = toInvoiceFileStem(invoiceNumber);
  for (let copy = 1; copy <= MAX_COPIES; copy += 1) {
    const filePath = join(directory, copy === 1 ? `${stem}.pdf` : `${stem} (${copy}).pdf`);
    try {
      await writeFile(filePath, pdf, { flag: 'wx' });
      return filePath;
    } catch (error) {
      if (!checkFileExistsError(error)) throw error;
    }
  }
  throw new Error(`${directory} already has ${MAX_COPIES} copies of invoice ${invoiceNumber}.`);
};
