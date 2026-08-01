# Daily Work Log - 2026-08-01

## Goal
Extract Plaid wallet-card projection and anonymous Plaid local-storage handling from `WalletPrototype.tsx` into a focused tested boundary.

## Product Reason
Signed-in onboarding and Plaid sync remain the top priority, but live write-path smokes are still blocked by the stale local Supabase service-role credential. Moving Plaid account display and fallback storage logic behind a small helper reduces wallet-shell ownership around linked accounts without changing Plaid, Supabase, or recommendation API contracts.

## Changed
- Added `components/card-reader/usePlaidWalletCards.ts`.
- Added focused coverage in `components/card-reader/usePlaidWalletCards.test.ts`.
- Updated `WalletPrototype.tsx` to use shared helpers for initial anonymous Plaid fallback state, browser localStorage persistence, display-account filtering, and connected-account wallet card projection.
- Updated `PROJECT_STATE.md`, `ROADMAP.md`, and `docs/WALLET_DECOMPOSITION.md`.

## Implementation Notes
- `getWalletDisplayAccounts()` preserves the existing display rule: show credit-card accounts first, or one non-credit fallback account when no credit accounts are present.
- `buildPlaidWalletCard()` preserves existing Plaid wallet card copy, matched-product labels, current-balance formatting, recent transaction preview behavior, and setup benefit metadata.
- `readStoredPlaidConnection()`, `writeStoredPlaidConnection()`, and `clearStoredPlaidConnection()` centralize the anonymous/local Plaid fallback cache used only when Supabase is not configured.
- `WalletPrototype.tsx` still owns signed-in account state, persisted Plaid reload callbacks, mutation workflows, and navigation outcomes.

## Verification
- `npx vitest run components/card-reader/usePlaidWalletCards.test.ts`
- `npm run lint`
- `npm run test`
- `npm run build`
- `SMOKE_TIMEOUT_MS=5000 npm run smoke:onboarding`
- `npm run smoke:signed-in-preflight` *(still blocked at the known stale local Supabase service-role credential)*

## Production Smoke Result
- The default onboarding smoke command hung locally before producing output; the prior documented `SMOKE_TIMEOUT_MS=5000` run completed cleanly.
- Deployed commit `55db718` to Vercel production.
- Deployment URL: `https://card-reader-jz6pqkg8x-kylehocho-5599s-projects.vercel.app`
- Production alias: `https://card-reader-xi.vercel.app`
- Deployment id: `dpl_Ebiyfpgkga69r6w7oQrPtb3r1VD5`
- Homepage smoke returned HTTP 200.
- Direct production check confirmed `/evidence/onboarding?state=manual-card` returns HTTP 200.
- `SMOKE_TIMEOUT_MS=5000 npm run smoke:onboarding` passed against the production alias after deploy and checked signed-in manual-card entry, post-Plaid product matching, both Plaid recovery states, and selection outcomes.

## Risks
- Live signed-in manual-card and Plaid write-path smokes remain blocked until the local `SUPABASE_SERVICE_ROLE_KEY` is refreshed.
- This slice protects linked-account display behavior but does not add new live Plaid Link browser evidence.

## Next Best Action
Refresh the local Supabase service-role credential, rerun `npm run smoke:signed-in-preflight`, then run `npm run smoke:signed-in-manual-card` and `npm run smoke:signed-in-plaid-card-match` against production before adding browser-driven signed-in Plaid onboarding evidence.
