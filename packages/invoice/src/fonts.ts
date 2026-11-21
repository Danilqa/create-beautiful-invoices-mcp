import { createRequire } from 'node:module';
import { Font } from '@react-pdf/renderer';

const require = createRequire(import.meta.url);

// Each subset of Inter is its own family, and react-pdf takes a glyph missing in one from the next.
const SUBSETS = [
  'latin',
  'latin-ext',
  'cyrillic',
  'cyrillic-ext',
  'greek',
  'greek-ext',
  'vietnamese',
] as const;

export const FONT_FAMILIES = SUBSETS.map(subset => `Inter ${subset}`);

const toInterFile = (subset: string, weight: number) =>
  require.resolve(`@fontsource/inter/files/inter-${subset}-${weight}-normal.woff`);

// Static weights: react-pdf can't pick a weight out of a variable font.
export const registerFonts = () => {
  for (const subset of SUBSETS) {
    Font.register({
      family: `Inter ${subset}`,
      fonts: [400, 500, 600].map(weight => ({
        src: toInterFile(subset, weight),
        fontWeight: weight,
      })),
    });
  }
  // Keep names, emails and IBANs whole instead of hyphenating them across lines.
  Font.registerHyphenationCallback(word => [word]);
};
