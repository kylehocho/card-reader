# Use Now Evidence Capture

Last updated: 2026-07-05

## Goal
Keep the production Use Now demo path easy to verify and share across the five priority merchants: Whole Foods, Patagonia, Delta, Amazon, and Chipotle.

## Capture Command
Run the production screenshot matrix with:

```bash
npm run evidence:use-now
```

By default the script opens `https://card-reader-xi.vercel.app/?screen=use-now&merchant=<merchant>` in headless Chrome and writes screenshots to `artifacts/use-now-YYYY-MM-DD/`.

Useful overrides:

```bash
APP_BASE_URL=http://localhost:3000 npm run evidence:use-now
EVIDENCE_DATE=2026-07-05 npm run evidence:use-now
EVIDENCE_DIR=artifacts/custom-use-now npm run evidence:use-now
EVIDENCE_VIEWPORT=390,1100 npm run evidence:use-now
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run evidence:use-now
```

## Current Production Evidence
The 2026-07-05 production capture is stored at:

- `artifacts/use-now-2026-07-05/whole-foods.png`
- `artifacts/use-now-2026-07-05/patagonia.png`
- `artifacts/use-now-2026-07-05/delta.png`
- `artifacts/use-now-2026-07-05/amazon.png`
- `artifacts/use-now-2026-07-05/chipotle.png`

These screenshots verify that each direct link renders the Use Now screen, preserves the selected merchant, and has time to load the recommendation response from `/api/recommend-card`.

## Maintenance Notes
- The capture matrix should stay aligned with `lib/recommendation/use-now-demo-merchants.ts`.
- Re-run the script after changes to `WalletPrototype`, route-state parsing, merchant context scoring, or `/api/recommend-card`.
- If Chrome cannot be found automatically, set `CHROME_PATH`.
- Screenshot capture is evidence, not a replacement for tests. Keep the route parser and recommendation behavior covered by Vitest.

## Remaining Gap
This covers the in-app Use Now demo path. The browser extension popup still needs extension-capable smoke evidence for at least three merchant categories.
