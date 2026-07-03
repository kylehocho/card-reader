# Daily Work Log - 2026-07-03

## Goal
Lock the in-app Use Now demo merchant matrix to backend recommendation behavior.

## Product Reason
The wallet demo CTA is the fastest way to show the core promise before extension setup. Whole Foods, Patagonia, Delta, Amazon, and Chipotle should all produce stable, catalog-backed recommendations through the same `/api/recommend-card` path used by the extension.

## Changed
- Added `lib/recommendation/use-now-demo-merchants.ts` as the shared source of truth for Use Now demo merchant labels and request contexts.
- Wired `WalletPrototype` demo chips and recommendation requests to the shared demo matrix.
- Added Chipotle to `data/merchant-catalog.json` as a dining merchant.
- Marked Amazon as the current rotating-quarterly demo merchant so the backend selects Chase Freedom Flex instead of the generic 2x fallback.
- Added recommendation-engine coverage for the five in-app demo merchants and their intended best-card outputs.
- Updated `PROJECT_STATE.md`, `ROADMAP.md`, `docs/CARD_INTELLIGENCE_CATALOG.md`, and `docs/TECH_ARCHITECTURE.md`.

## Implementation Notes
- The UI still allows arbitrary merchant search. Exact demo merchant matches now send richer context including host, URL, title, and category hint.
- Anonymous/demo recommendation requests still use the top-10 catalog and do not write `recommendation_events`.
- The Amazon rule is intentionally scoped to the MVP demo catalog. A production-grade rotating category implementation still needs issuer activation windows, user enrollment state, and quarterly cap tracking.

## Verification
- `npm test -- --run lib/recommendation/merchant-context.test.ts app/api/recommend-card/route.test.ts`
- `npm run lint`
- `npm run build`
- Production smoke after deploy:
  - `GET https://card-reader-xi.vercel.app/` returned `200`.
  - `POST https://card-reader-xi.vercel.app/api/recommend-card` returned expected best cards for Whole Foods, Patagonia, Delta, Amazon, and Chipotle.

## Risks
- Browser screenshot/video evidence for the Use Now surface is still not captured in this cron lane.
- The extension popup matrix still needs extension-capable browser evidence.
- Amazon rotating-category logic is still a catalog hint, not a real per-user activation/cap model.

## Next Best Action
Capture production browser evidence for the Use Now wallet panel, then complete extension-capable popup smoke for at least three merchant categories using `docs/EXTENSION_LOCAL_TEST_PLAN.md`.
