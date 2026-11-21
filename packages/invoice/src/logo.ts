import { readFile } from 'node:fs/promises';

export interface Logo {
  data: Buffer;
  format: 'png' | 'jpg';
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

const toLogoFormat = (data: Buffer) => {
  if (data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return 'png';
  if (data.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) return 'jpg';
  return undefined;
};

// react-pdf draws PNG and JPEG only, so anything else fails here with a clear message.
export const readLogo = async (filePath: string): Promise<Logo> => {
  const data = await readFile(filePath).catch((error: unknown) => {
    throw new Error(`Can't read the logo at ${filePath}.`, { cause: error });
  });
  const format = toLogoFormat(data);
  if (format === undefined) throw new Error(`The logo at ${filePath} is not a PNG or JPEG image.`);
  return { data, format };
};
