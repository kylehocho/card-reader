# Daily Work Log - 2026-08-05

## Goal
Extract Plaid wallet-card sync policy from `WalletPrototype.tsx` into the existing Plaid wallet-card helper boundary.

## Product Reason
Onboarding and Plaid sync remain the top priority, but the live signed-in write-path smokes are still blocked by the known stale local Supabase service-role credential. This slice keeps reducing wallet-shell ownership around linked-card behavior without changing Plaid token handling, Supabase writes, auth gates, or user-facing UI copy.

## Changed
- Extended `components/card-reader/usePlaidWalletCards.ts` with tested helpers for Plaid wallet-card merging and selected-account lookup.
- Updated `WalletPrototype.tsx` so refreshed Plaid accounts use the helper to replace wallet cards for signed-in/user-backed wallets and preserve non-Plaid seed/demo cards for anonymous/local wallets.
- Updated `PROJECT_STATE.md`, `ROADMAP.md`, and `docs/WALLET_DECOMPOSITION.md`.

## Implementation Notes
- `mergePlaidWalletCards()` keeps the existing signed-in contract: user-backed wallets render only linked Plaid cards and do not leak seed/demo cards into the production wallet.
- Anonymous/local wallets keep existing non-Plaid cards and replace stale `plaid-*` fallback cards when the stored Plaid connection changes.
- `selectPlaidWalletAccount()` centralizes the `plaid-${accountId}` lookup used by signed-in wallet-analysis projections.
- The extraction is behavior-preserving and intentionally avoids key rotation, Supabase credential changes, Plaid Link changes, and recommendation-engine changes.

## Verification
- `npx vitest run components/card-reader/usePlaidWalletCards.test.ts`
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
- The signed-in preflight still fails at `supabaseAdmin` with `401 Invalid API key`, confirming the same local service-role blocker before write-path smokes.

## Risks
- Live signed-in manual-card and Plaid write-path smokes remain blocked until the local `SUPABASE_SERVICE_ROLE_KEY` is refreshed.
- This slice does not add live browser Plaid Link evidence or change card recommendation behavior.

## Next Best Action
Refresh the local Supabase service-role credential, rerun `npm run smoke:signed-in-preflight`, then run `npm run smoke:signed-in-manual-card` and `npm run smoke:signed-in-plaid-card-match` against production before adding browser-driven signed-in Plaid onboarding evidence.
