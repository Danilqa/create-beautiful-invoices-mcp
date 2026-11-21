// Writes the Vercel Build Output: one esbuild bundle per function, with the Inter files beside it.
// Vercel's own TypeScript step compiles file by file, which leaves extensionless imports and the .tsx
// sources of the invoice package that Node can't load, and it misses the fonts.
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';

const OUTPUT_DIR = '.vercel/output';
// Only the invoice function renders, so only it needs the fonts.
const FUNCTIONS = [
  { name: 'mcp', withFonts: false },
  { name: 'invoice', withFonts: true },
];
const FONT_FILE = /-(400|500|600)-normal\.woff$/;
const REPOSITORY_URL = 'https://github.com/Danilqa/create-beautiful-invoices-mcp';

// These are read at runtime, not imported, so the bundle can't carry them and the function gets copies.
const requireFromInvoice = createRequire(import.meta.resolve('invoice/render'));
const fontsDir = dirname(requireFromInvoice.resolve('@fontsource/inter/package.json'));
const requireFromReactPdf = createRequire(
  requireFromInvoice.resolve('@react-pdf/renderer/package.json'),
);
// pdfkit loads its built-in Helvetica through the #standard-fonts/* imports of its package.json.
const pdfkitStandardFontsDir = join(
  dirname(requireFromReactPdf.resolve('pdfkit')),
  'standard-fonts',
);

const writeJson = (filePath: string, value: unknown) =>
  writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);

await rm(OUTPUT_DIR, { recursive: true, force: true });

for (const { name, withFonts } of FUNCTIONS) {
  const functionDir = join(OUTPUT_DIR, 'functions', 'api', `${name}.func`);
  await build({
    entryPoints: [join('routes', `${name}.ts`)],
    outfile: join(functionDir, 'index.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node24',
    jsx: 'automatic',
    // Bundled CommonJS dependencies call require, which ES modules don't have.
    banner: {
      js: "import { createRequire as createBundleRequire } from 'node:module'; const require = createBundleRequire(import.meta.url);",
    },
    logLevel: 'warning',
  });
  if (withFonts) {
    const functionFontsDir = join(functionDir, 'node_modules', '@fontsource', 'inter');
    await mkdir(join(functionFontsDir, 'files'), { recursive: true });
    await cp(join(fontsDir, 'package.json'), join(functionFontsDir, 'package.json'));
    await cp(join(fontsDir, 'files'), join(functionFontsDir, 'files'), {
      recursive: true,
      filter: source => source.endsWith('files') || FONT_FILE.test(source),
    });
    await cp(pdfkitStandardFontsDir, join(functionDir, 'standard-fonts'), { recursive: true });
    await writeJson(join(functionDir, 'package.json'), {
      type: 'module',
      imports: { '#standard-fonts/*': './standard-fonts/*.cjs' },
    });
  }
  await writeJson(join(functionDir, '.vc-config.json'), {
    handler: 'index.mjs',
    runtime: 'nodejs24.x',
    launcherType: 'Nodejs',
    shouldAddHelpers: false,
    supportsResponseStreaming: true,
    maxDuration: 30,
  });
}

await writeJson(join(OUTPUT_DIR, 'config.json'), {
  version: 3,
  routes: [
    { src: '^/$', status: 307, headers: { Location: REPOSITORY_URL } },
    { handle: 'filesystem' },
  ],
});
