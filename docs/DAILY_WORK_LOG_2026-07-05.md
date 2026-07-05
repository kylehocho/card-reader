# Daily Work Log - 2026-07-05

## Goal
Close the in-app Use Now demo evidence gap with a repeatable production screenshot matrix.

## Product Reason
The Use Now surface is the fastest way to show the product promise: "which card should I use right now?" A reusable evidence command gives the team a reliable way to validate and share the five priority merchant examples after UI or recommendation changes.

## Changed
- Added `scripts/capture-use-now-evidence.mjs`, a dependency-free headless Chrome capture script for the five direct Use Now production links.
- Added `npm run evidence:use-now`.
- Captured production screenshots for Whole Foods, Patagonia, Delta, Amazon, and Chipotle.
- Fixed compact Use Now top-result metric tiles so long labels like `Live recommendation` wrap instead of clipping at the mobile evidence viewport.
- Added explicit Next viewport metadata so the wallet shell renders at device width on mobile/headless capture instead of overflowing the screenshot viewport.
- Added `docs/USE_NOW_EVIDENCE.md` with capture commands, artifact paths, maintenance notes, and remaining extension evidence gap.
- Updated project state and roadmap notes to reflect the in-app evidence matrix.

## Implementation Notes
- The script defaults to `https://card-reader-xi.vercel.app` and writes dated artifacts under `artifacts/use-now-YYYY-MM-DD/`.
- It accepts `APP_BASE_URL`, `EVIDENCE_DATE`, `EVIDENCE_DIR`, `EVIDENCE_VIEWPORT`, `EVIDENCE_WAIT_MS`, and `CHROME_PATH` overrides so the same tool works for local and production checks.
- The script intentionally uses the same direct-link contract shipped on 2026-07-04 instead of adding a new app route.

## Verification
- `npm run evidence:use-now`
- `npm test -- --run lib/recommendation/use-now-route-state.test.ts lib/recommendation/merchant-context.test.ts app/api/recommend-card/route.test.ts`
- `npm test`
- `npm run lint`
- `npm run build`
- Production homepage HTTP check against `https://card-reader-xi.vercel.app`
- Production API smoke for Whole Foods, Patagonia, Delta, Amazon, and Chipotle

## Risks
- Screenshot evidence verifies render output but does not inspect pixels semantically. Continue pairing it with route and recommendation tests.
- The capture matrix must be updated when the demo merchant list changes.
- Browser extension popup evidence remains separate because Chrome extension popup automation needs a different harness or a manual smoke pass.

## Next Best Action
Complete extension-capable popup smoke for at least three merchant categories, then archive popup screenshots alongside the Use Now matrix.
