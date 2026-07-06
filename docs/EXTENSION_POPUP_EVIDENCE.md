# Extension Popup Evidence Capture

Last updated: 2026-07-06

## Goal
Keep the browser extension popup recommendation UI easy to verify across the same priority merchants used by the in-app Use Now demo: Whole Foods, Patagonia, Delta, Amazon, and Chipotle.

## Capture Command
Run the production popup render matrix with:

```bash
npm run evidence:extension-popup
```

By default the script calls `https://card-reader-xi.vercel.app/api/recommend-card` for each merchant, seeds the actual extension popup HTML/CSS/JS with the production recommendation response, opens a Chrome-rendered evidence harness, and writes screenshots plus a JSON summary to `artifacts/extension-popup-YYYY-MM-DD/`.

Useful overrides:

```bash
APP_BASE_URL=http://localhost:3000 npm run evidence:extension-popup
EVIDENCE_DATE=2026-07-06 npm run evidence:extension-popup
EVIDENCE_DIR=artifacts/custom-extension-popup npm run evidence:extension-popup
EVIDENCE_VIEWPORT=430,620 npm run evidence:extension-popup
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run evidence:extension-popup
```

The command includes short retries around production API fetches so transient Vercel or network connect timeouts do not fail the whole cron run immediately.

## Current Production Evidence
The 2026-07-06 production capture is stored at:

- `artifacts/extension-popup-2026-07-06/summary.json`
- `artifacts/extension-popup-2026-07-06/whole-foods.png`
- `artifacts/extension-popup-2026-07-06/patagonia.png`
- `artifacts/extension-popup-2026-07-06/delta.png`
- `artifacts/extension-popup-2026-07-06/amazon.png`
- `artifacts/extension-popup-2026-07-06/chipotle.png`

The summary records each merchant context, selected best card, multiplier, runner-up, and reason returned by the production recommendation API.

## What This Verifies
- The popup DOM renders a non-empty recommendation state for five merchant categories.
- The popup uses DOM text nodes and current styles without `innerHTML`.
- Long recommendation copy wraps inside the popup viewport.
- The API field mapping still matches what `extension/popup.js` expects.

## What This Does Not Verify
This is a popup render contract, not a full installed-extension smoke. It does not launch the unpacked MV3 package, exercise the background service worker, inject content scripts into merchant pages, or prove `chrome.tabs.query` behavior.

Chrome 149 on this Mac currently logs `--load-extension is not allowed in Google Chrome, ignoring.` when launched through CLI automation, so full installed-extension automation needs a Chromium or Chrome-for-Testing harness that permits unpacked extension loading, or a manual smoke pass through `chrome://extensions`.

## Maintenance Notes
- Keep the merchant list aligned with `lib/recommendation/use-now-demo-merchants.ts` and `extension/background.js`.
- Re-run after changes to `extension/popup.js`, `extension/styles.css`, `/api/recommend-card`, or merchant catalog scoring.
- Pair this capture with manual or extension-capable browser smoke before treating the full MV3 extension as production-ready.
