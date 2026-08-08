# Daily Work Log - 2026-08-08

## Goal
Extract the wallet card stack renderer from `WalletPrototype.tsx`.

## Product Reason
Onboarding and Plaid sync remain the top priority, but live signed-in write-path smokes are still blocked by the known stale local Supabase service-role credential. This slice keeps reducing wallet-shell ownership around the selected-card and Add Card interaction without changing Plaid, Supabase, token handling, or recommendation behavior.

## Changed
- Added `components/card-reader/WalletStack.tsx` for the expandable wallet card stack and Add Card stack action.
- Added `components/card-reader/WalletStack.test.ts` covering the collapsed/expanded stack layout helper and Add Card item detection.
- Updated `WalletPrototype.tsx` so it passes stack items, expanded state, Add Card, and card-selection callbacks into the focused component.
- Updated `PROJECT_STATE.md`, `ROADMAP.md`, and `docs/WALLET_DECOMPOSITION.md`.

## Implementation Notes
- The extraction is behavior-preserving: collapsed taps still expand the stack, expanded Add Card still opens the protected Add Card flow, and expanded card taps still select that wallet card and close the profile menu.
- `useWalletNavigation.ts` still owns selected-card state, stack item construction, and empty-wallet Add Card fallback behavior.
- `WalletStack.tsx` owns only stack rendering, row placement, tap animation scale, and the Add Card row discriminator.

## Verification
- `npx vitest run components/card-reader/WalletStack.test.ts`
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
