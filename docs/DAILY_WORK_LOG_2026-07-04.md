# Daily Work Log - 2026-07-04

## Goal
Make the in-app Use Now recommendation demo directly addressable for smoke testing and stakeholder review.

## Product Reason
The Use Now surface is the quickest way to show Card Reader's core consumer value without installing the browser extension. Direct merchant links make it easier to verify and share the five priority recommendation examples in production.

## Changed
- Added `lib/recommendation/use-now-route-state.ts` to parse shareable Use Now query-string state.
- Added Vitest coverage for direct Use Now links, wallet merchant-search links, unknown screens, merchant text bounds, and link generation.
- Updated `WalletPrototype` so the wallet demo CTA and demo merchant chips use one shared opener.
- The shared opener opens the full Use Now screen, preloads the chosen merchant, and updates the URL to `/?screen=use-now&merchant=<merchant>`.
- Tightened compact Use Now card layout so the deep-link screenshot does not clip key labels.
- Updated `PROJECT_STATE.md`, `ROADMAP.md`, `docs/CARD_INTELLIGENCE_CATALOG.md`, and `docs/TECH_ARCHITECTURE.md`.

## Implementation Notes
- The deep-link behavior is intentionally local to the existing client component. It does not add a new Next route or alter backend recommendation scoring.
- Demo merchant names are canonicalized through the existing Use Now merchant list, so links like `merchant=whole%20foods` display `Whole Foods`.
- Arbitrary merchant input is capped before entering component state and still uses the existing `/api/recommend-card` fallback path.
- The wallet search panel can also be opened with `/?screen=wallet&merchant=Patagonia`, but the primary evidence path is `screen=use-now`.

## Verification
- `npm test -- --run lib/recommendation/use-now-route-state.test.ts lib/recommendation/merchant-context.test.ts app/api/recommend-card/route.test.ts`
- `npm test`
- `npm run lint`
- `npm run build`
- Local API smoke against the built app returned the expected cards for Whole Foods, Patagonia, Delta, Amazon, and Chipotle.
- Local headless Chrome smoke for `http://localhost:3000/?screen=use-now&merchant=Whole%20Foods` rendered Use Now, Whole Foods, and American Express Gold Card.
- Screenshot artifact: `artifacts/use-now-whole-foods-2026-07-04.png`.

## Risks
- Direct links make browser evidence easier to capture, but the full screenshot/video matrix still needs to be archived.
- The Use Now screen is still part of the large `WalletPrototype.tsx` component; splitting recommendation UI remains a cleanup task after evidence capture.
- Amazon remains a demo rotating-category catalog hint, not a per-user activation/cap implementation.

## Next Best Action
Capture production screenshots or video for the five direct Use Now links, then complete extension-capable popup smoke for the same merchant categories.
