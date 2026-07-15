# Daily Work Log - 2026-07-15

## Goal
Continue the wallet decomposition by extracting merchant recommendation loading and Use Now route-state effects into a focused hook.

## Product Reason
The Use Now surface is the clearest consumer-facing recommendation workflow in the current MVP. Its live `/api/recommend-card` loading, deep-link route handling, and fallback result merging were still embedded in the full wallet shell, making the recommendation path harder to test and riskier to extend for signed-in users and the browser extension.

## Changed
- Added `components/card-reader/useMerchantRecommendation.ts`.
- Added `components/card-reader/useMerchantRecommendation.test.ts`.
- Updated `components/card-reader/WalletPrototype.tsx` to consume the hook for merchant query state, live recommendation status, seeded/live result merging, and demo merchant opening.
- Updated `components/card-reader/UseNowScreen.tsx` to import the shared `MerchantResult` type from the new hook.
- Updated `docs/WALLET_DECOMPOSITION.md`.
- Updated `PROJECT_STATE.md`.

## Implementation Notes
- `useMerchantRecommendation()` now owns initial route parsing for Use Now links, compact wallet merchant-search route activation, demo merchant deep-link URL updates, and live `/api/recommend-card` request state.
- The hook keeps signed-in recommendation auth behavior by attaching the Supabase bearer token only when the wallet is user-backed and a browser session is available.
- Live API responses are projected through `merchantApiRecommendationToResult()` into the same `MerchantResult` shape used by the compact wallet overlay and full Use Now screen.
- `merchantResultsForQuery()` preserves the previous fallback matrix behavior: seeded results are filtered by merchant/category/card/tags, sorted by rank, and merged behind a live recommendation when one is ready.
- Clearing the merchant query now resets the live recommendation state at the query setter boundary so stale loading/error states do not linger after the search field is emptied.

## Verification
- `npm test -- components/card-reader/useMerchantRecommendation.test.ts lib/recommendation/use-now-route-state.test.ts` - 2 files passed, 8 tests passed.
- `npm run lint`
- `npm test` - 17 files passed, 67 tests passed.
- `npm run build`
- `vercel --prod --yes` - deployed `dpl_2Qad14vdfCUY453TvNzpVhTvpuv9` to `https://card-reader-3lytmbh8u-kylehocho-5599s-projects.vercel.app` and aliased `https://card-reader-xi.vercel.app`.
- `curl -sS -o /tmp/card-reader-home.html -w '%{http_code} %{url_effective}\n' https://card-reader-xi.vercel.app` - returned `200 https://card-reader-xi.vercel.app/`.
- `POST https://card-reader-xi.vercel.app/api/recommend-card` for Whole Foods - returned American Express Gold Card at 4x Membership Rewards with Chase Sapphire Preferred as runner-up.

## Risks
- No browser screenshot evidence has been captured yet because this is intended as a behavior-neutral decomposition slice.
- The hook has focused projection and result-merge tests, but full React hook effect testing still depends on higher-level UI or browser smoke.
- `WalletPrototype.tsx` still owns selected-card state, wallet page/tab state, profile flows, and several anonymous/demo paths.

## Next Best Action
Extract selected-card and wallet-page navigation state into a focused hook so card selection, stack expansion, and tab reset behavior can be tested without rendering the full wallet prototype.
