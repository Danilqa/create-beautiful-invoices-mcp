# AGENTS.md

create-beautiful-invoices-mcp is an MCP server that renders invoices to PDF. This repo is a pnpm workspace: the published stdio server, the hosted HTTP server on Vercel and the invoice package they both render with.

## Packages

| Package      | Description                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| `mcp-server` | `create-beautiful-invoices-mcp`, the only published package: the stdio MCP server and its `create_invoice` tool |
| `mcp-http`   | The hosted server at https://www.nothing-fancy.space/invoice/api/mcp, deployed to Vercel                        |
| `invoice`    | The invoice domain: zod schemas, totals, formatting and the react-pdf document. It knows nothing about MCP      |

## Package manager

pnpm 12 and Node 24, with one lockfile at the root. Versions that several packages use live in the catalog in `pnpm-workspace.yaml`. A package imports another workspace package only after it declares it as `"<name>": "workspace:*"`.

## Commands

Run them from the repo root.

```bash
pnpm install
pnpm validate   # format check, lint, typecheck and tests
pnpm dev        # the server from source on stdio
pnpm inspect    # the server from source in the MCP Inspector
pnpm build      # packages/mcp-server/dist/main.js
```

To release, bump `version` in `packages/mcp-server/package.json` and both versions in `packages/mcp-server/server.json`, run `npm publish` in `packages/mcp-server`, then `mcp-publisher publish` there to list the new version in the MCP Registry. npm copies `package.json` as it is, so the `dependencies` of `mcp-server` keep exact versions instead of `catalog:`.

`.github/workflows/ci.yml` runs each check of `pnpm validate`, the Vercel output check and the npm package check as parallel jobs on every PR. The Vercel output check builds the functions of `mcp-http` and creates an invoice with the bundles. The npm package check installs the packed server in an empty project and creates an invoice with it through the MCP Inspector.

To deploy the hosted server, run from the repo root, with the Vercel CLI logged in to the project:

```bash
vercel build --prod && vercel deploy --prebuilt --prod
```

Leave out `--prod` for a preview, which Vercel Authentication keeps private: reach it with `vercel curl`. The project isn't connected to GitHub, so nothing deploys on merge. Deploy prebuilt, since `vercel deploy` with a remote build fails: the CLI leaves `.pnpmfile.cjs` out of the upload, and the frozen install then rejects the lockfile's `pnpmfileChecksum`.

`tsc` is TypeScript 7. typescript-eslint needs the JavaScript API that TypeScript 7 doesn't have, so `typescript` is TypeScript 6 under an alias, for ESLint only.

## Architecture

- `invoice` never imports `@modelcontextprotocol/*` or `mcp-server`, so any other app can render invoices with it. `mcp-server` imports it by name, such as `invoice/render`, never by a relative path.
- Money is in minor units from `calculateTotals` on, so totals add up to the penny. The schema allows two decimals at most in prices and quantities, and none in prices of a currency without decimals, such as JPY. The discount comes off the subtotal before tax.
- The MCP SDK is v2: `McpServer` from `@modelcontextprotocol/server`, served by `serveStdio`, which speaks both the 2025 and the 2026 protocols. stdout carries the protocol, so the server never logs to it.
- Tool errors, thrown or from input validation, reach the client as `isError` results.
- `mcp-http` serves the same tool over HTTP with `mcp-handler`, stateless, for both the 2025 and the 2026 protocols. It stores nothing: the tool seals the invoice into a link with AES-256-GCM, keyed by the `INVOICE_LINK_SECRET` env var of the Vercel project, and `/api/invoice` opens the link and renders the PDF for 30 days. Changing the secret breaks every link out there. The `nothing-fancy` Vercel project (repo `Danilqa/cooking-blog`) proxies `/invoice/*` of www.nothing-fancy.space to this project with a rewrite in its `vercel.json`, so the `PUBLIC_URL` env var, `https://www.nothing-fancy.space/invoice`, tells the server where the links go. Without it, links take the host of the request. It takes no logo and no saved defaults, since both are files on the caller's machine.
- `scripts/build-output.ts` of `mcp-http` writes the Vercel Build Output itself: one esbuild bundle per function in `routes/`, with the Inter files and pdfkit's standard fonts copied beside the one that renders, since both are read at runtime. Vercel's zero-config TypeScript compiles file by file and leaves imports Node can't load, so the entries live in `routes/`, not `api/`, where Vercel would pick them up.
- `bin/create-beautiful-invoices-mcp.js` runs `src/main.ts` through tsx in a checkout and `dist/main.js` when installed from npm. esbuild bundles `invoice` and keeps the npm packages external, so a package that bundled code imports at runtime must be a `mcp-server` dependency and on the esbuild external list.
- The fonts are the static weights of every Inter subset from `@fontsource/inter`, resolved at runtime. Each subset is a family of its own, and react-pdf takes a glyph missing in one from the next, so latin, latin-ext, Cyrillic, Greek and Vietnamese all print. Inter has no CJK, Arabic or Hebrew glyphs, and the currencies are limited to the ones whose symbols it has.
- The `invoice` schema has no defaults beyond an item's quantity. The server fills in the saved defaults from `INVOICE_DEFAULTS` and the dates, then validates the whole invoice with `invoiceSchema`, so its input schema asks only for what the defaults leave out.

## Code style

ESLint enforces most of it, see `eslint.config.js`.

- Very strict TypeScript: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and the rest in `tsconfig.json`, and typescript-eslint's `strictTypeChecked`.
- ts-pattern `match(...).exhaustive()` instead of `switch`, or `===` on string-literal unions. No enums, no inline object types, no type assertions.
- Named `interface`s, and props as a named `<Component>Props` interface.
- kebab-case file names. Tests sit next to the code as `*.test.ts` and run with Vitest. Only tests import `mocks`.
- Functions start with a verb. Boolean functions start with `check`.
- One-line comments that say why, only where the code can't.
