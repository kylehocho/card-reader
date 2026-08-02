# Daily Work Log - 2026-08-02

## Goal
Extract the remaining anonymous manual-card append and selected-card result from `WalletPrototype.tsx` into the tested demo-card boundary.

## Product Reason
Signed-in Plaid smoke remains the highest product priority, but the live write-path checks are still blocked by the stale local Supabase service-role credential. This slice keeps reducing wallet-shell ownership without touching Plaid, Supabase, production secrets, or user-facing contracts.

## Changed
- Extended `components/card-reader/useDemoWalletCards.ts` with `appendDemoWalletCard()`.
- Added focused coverage for the append result and selected wallet-card id in `components/card-reader/useDemoWalletCards.test.ts`.
- Updated `WalletPrototype.tsx` so anonymous manual-card creation delegates card projection, append output, and selected id to the demo-card helper.
- Updated `PROJECT_STATE.md`, `ROADMAP.md`, and `docs/WALLET_DECOMPOSITION.md`.

## Implementation Notes
- `appendDemoWalletCard()` preserves the existing `custom-${sequence}` card id convention and returns the appended card list plus the selected id the wallet should focus after success.
- The signed-in manual-card persistence path still routes through `usePlaidWalletActions.ts`; the new helper is only for anonymous prototype cards.
- `WalletPrototype.tsx` still owns the custom-card sequence ref, success-close transition, and signed-in versus anonymous branch.

## Verification
- `npx vitest run components/card-reader/useDemoWalletCards.test.ts`
- `npm run lint`
- `npm run test`
- `npm run build`
- `SMOKE_TIMEOUT_MS=5000 npm run smoke:onboarding`
- `npm run smoke:signed-in-preflight` *(still blocked at the known stale local Supabase service-role credential)*

## Risks
- Live signed-in manual-card and Plaid write-path smokes remain blocked until the local `SUPABASE_SERVICE_ROLE_KEY` is refreshed.
- This slice is intentionally behavior-preserving and does not add live Plaid Link browser evidence.

## Next Best Action
Refresh the local Supabase service-role credential, rerun `npm run smoke:signed-in-preflight`, then run `npm run smoke:signed-in-manual-card` and `npm run smoke:signed-in-plaid-card-match` against production before adding browser-driven signed-in Plaid onboarding evidence.
