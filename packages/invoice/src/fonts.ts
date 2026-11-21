import { createRequire } from 'node:module';
import { Font } from '@react-pdf/renderer';

const require = createRequire(import.meta.url);

const toInterFile = (weight: number) =>
  require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`);

// Static weights: react-pdf can't pick a weight out of a variable font.
export const registerFonts = () => {
  Font.register({
    family: 'Inter',
    fonts: [400, 500, 600].map(weight => ({ src: toInterFile(weight), fontWeight: weight })),
  });
  // Keep names, emails and IBANs whole instead of hyphenating them across lines.
  Font.registerHyphenationCallback(word => [word]);
};
