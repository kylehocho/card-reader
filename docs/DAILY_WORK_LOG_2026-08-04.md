# Daily Work Log - 2026-08-04

## Goal
Extract wallet-analysis view projection from `WalletPrototype.tsx` into a focused, tested helper.

## Product Reason
Onboarding and Plaid sync remain the top priority, but the live signed-in write-path smokes are still blocked by the known stale local Supabase service-role credential. This slice keeps reducing wallet-shell ownership around signed-in benefit and missed-value rendering without changing user-facing copy, persistence, Plaid token handling, or production secrets.

## Changed
- Added `components/card-reader/useWalletAnalysisViews.ts`.
- Added focused coverage in `components/card-reader/useWalletAnalysisViews.test.ts`.
- Updated `WalletPrototype.tsx` so signed-in analysis projection for selected benefits, welcome bonuses, alerts, missed-value recommendations, and featured recommendation state lives in the helper.
- Updated `PROJECT_STATE.md`, `ROADMAP.md`, and `docs/WALLET_DECOMPOSITION.md`.

## Implementation Notes
- `buildWalletAnalysisViews()` keeps the existing signed-in behavior: API analysis wins when present, selected-card benefits fall back when no tracker exists for the selected matched product, and seed welcome bonuses are filtered to linked card products while analysis is still loading.
- Anonymous/demo wallets continue to use seed welcome bonuses, seed notifications, and local transaction recommendation derivation.
- The hook keeps local missed-value derivation and API-backed recommendation mapping behind one projection boundary so `WalletPrototype.tsx` no longer chooses between those rows inline.
- The extraction is behavior-preserving and intentionally does not change the wallet UI layout or the live signed-in Plaid/manual-card persistence paths.

## Verification
- `npx vitest run components/card-reader/useWalletAnalysisViews.test.ts`
- `npm run lint`
- `npm run test`
- `npm run build`
- `APP_BASE_URL=https://card-reader-xi.vercel.app SMOKE_TIMEOUT_MS=15000 npm run smoke:onboarding`
- `npm run smoke:signed-in-preflight` *(still blocked at the known stale local Supabase service-role credential)*

## Production Smoke Result
- Deployed final `main` state to Vercel production.
- Production alias: `https://card-reader-xi.vercel.app`
- Homepage smoke returned HTTP 200.
- Direct production check confirmed `/evidence/onboarding?state=manual-card` returns HTTP 200.
- The production onboarding contract smoke passed against `https://card-reader-xi.vercel.app`.
- Checked signed-in manual-card entry, post-Plaid product matching, Plaid no-credit-card recovery, Plaid duplicate-card recovery, and signed-in selection outcomes.
- The signed-in preflight still fails at `supabaseAdmin` with `401 Invalid API key`, confirming the same local service-role blocker before write-path smokes.

## Risks
- Live signed-in manual-card and Plaid write-path smokes remain blocked until the local `SUPABASE_SERVICE_ROLE_KEY` is refreshed.
- This slice does not add live browser Plaid Link evidence or change recommendation-engine logic.
- The production onboarding smoke passed with a 15s timeout; a 5s run was too aggressive for today's Chrome/live-site load and failed before the post-Plaid fixture rendered.

## Next Best Action
Refresh the local Supabase service-role credential, rerun `npm run smoke:signed-in-preflight`, then run `npm run smoke:signed-in-manual-card` and `npm run smoke:signed-in-plaid-card-match` against production before adding browser-driven signed-in Plaid onboarding evidence.
