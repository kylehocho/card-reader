# Daily Work Log - 2026-08-07

## Goal
Extract the connected-account removal confirmation sheet from `WalletPrototype.tsx`.

## Product Reason
Onboarding and Plaid sync remain the top priority, but live signed-in write-path smokes are still blocked by the known stale local Supabase service-role credential. This slice keeps reducing wallet-shell ownership around connected-account management without touching secrets, Plaid token handling, Supabase writes, or user-facing recommendation behavior.

## Changed
- Added `components/card-reader/ConnectedAccountRemovalSheet.tsx` for the connected-account removal confirmation dialog.
- Added `components/card-reader/ConnectedAccountRemovalSheet.test.ts` covering the title fallback and remove-button state helpers.
- Updated `WalletPrototype.tsx` so it passes pending removal account state and callbacks into the extracted sheet.
- Updated `PROJECT_STATE.md`, `ROADMAP.md`, and `docs/WALLET_DECOMPOSITION.md`.

## Implementation Notes
- The extraction is behavior-preserving: the dialog copy, matched card-product title fallback, cancel callback, disabled remove state, and remove callback stay the same.
- `usePlaidWalletActions.ts` still owns `accountPendingRemoval`, `removingAccountIds`, and the authenticated account-removal mutation.
- Keeping the removal dialog in a focused component makes the Connected Accounts flow easier to evolve when browser-driven signed-in Plaid evidence is unblocked.

## Verification
- `npx vitest run components/card-reader/ConnectedAccountRemovalSheet.test.ts`
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
