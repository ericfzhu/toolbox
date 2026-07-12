# Toolbox

A local-first collection of browser utilities for images, text, code, colors, QR codes, barcodes, dates, and structured data. Processing stays in the browser; the production site is exported as static files.

## Development

Requirements: Node.js 20.9 or newer and Yarn 4 via Corepack.

```bash
corepack enable
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
yarn lint
yarn test
yarn exec tsc --noEmit
yarn build
yarn test:e2e
```

## Static Preview

Build and serve the exported site:

```bash
yarn build
yarn start
```

The export is written to `out/`.
