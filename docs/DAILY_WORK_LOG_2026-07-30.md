# Daily Work Log - 2026-07-30

## Goal
Extract the anonymous demo-card projection from `WalletPrototype.tsx` and keep the wallet-analysis route test stable across calendar rollovers.

## Product Reason
Signed-in Plaid onboarding remains the top priority, but live signed-in smoke is still blocked by the stale local Supabase service-role credential. The best unblocked build slice was to continue shrinking wallet-shell ownership around Add Card behavior while preserving the signed-in persistence path.

## Changed
- Added `components/card-reader/useDemoWalletCards.ts`.
- Moved anonymous manual-card demo projection into `buildDemoWalletCard()`.
- Added focused coverage in `components/card-reader/useDemoWalletCards.test.ts`.
- Updated `WalletPrototype.tsx` to call the demo-card helper instead of constructing custom wallet cards inline.
- Stabilized `app/api/wallet/analysis/route.test.ts` by using a current-date mocked dining transaction, preventing the monthly statement-credit fixture from aging out of the 31-day lookback window.
- Updated `PROJECT_STATE.md`, `ROADMAP.md`, and `docs/WALLET_DECOMPOSITION.md`.

## Implementation Notes
- Signed-in manual-card persistence still flows through `usePlaidWalletActions.ts` and `POST /api/wallet/manual-cards`.
- Anonymous demo cards keep the same user-facing card copy, reward placeholder, setup transaction, starter benefit, business/personal category labels, and success navigation behavior.
- The custom-card child ids are now sequence-scoped (`custom-N-flat`, `custom-N-setup`, `custom-N-benefit`) so repeated anonymous demo cards no longer share duplicate internal ids.
- The wallet-analysis route behavior was not changed; only the test fixture date was made resilient to the current execution date.

## Verification
- `npx vitest run components/card-reader/useDemoWalletCards.test.ts`
- `npx vitest run components/card-reader/useDemoWalletCards.test.ts app/api/wallet/analysis/route.test.ts`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run smoke:onboarding`
- `SMOKE_TIMEOUT_MS=5000 npm run smoke:onboarding`

## Production Smoke Result
- Deployed commit `0120baf` to Vercel production.
- Deployment URL: `https://card-reader-qlvqcx747-kylehocho-5599s-projects.vercel.app`
- Production alias: `https://card-reader-xi.vercel.app`
- Deployment id: `dpl_2EJeQ9V42fnuvBDaQXTybBTtTakg`
- Homepage smoke returned HTTP 200.
- Direct production check confirmed `/evidence/onboarding?state=manual-card` renders the signed-in manual-card entry fixture.
- `SMOKE_TIMEOUT_MS=5000 npm run smoke:onboarding` passed against the production alias and checked manual-card, Plaid match, both Plaid recovery states, and selection outcomes.

## Risks
- Live signed-in manual-card and Plaid write-path smoke remain blocked until the local `SUPABASE_SERVICE_ROLE_KEY` is refreshed.
- This slice improves internal maintainability and duplicate ids in anonymous demo cards, but it does not add new signed-in Plaid production evidence.

## Next Best Action
Refresh the local Supabase service-role credential, rerun `npm run smoke:signed-in-preflight`, then run `npm run smoke:signed-in-manual-card` and `npm run smoke:signed-in-plaid-card-match` against production.
