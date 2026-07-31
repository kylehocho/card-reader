# Daily Work Log - 2026-07-31

## Goal
Extract the protected wallet access gates from `WalletPrototype.tsx` while keeping the onboarding/Plaid priority lane moving around the current signed-in smoke credential blocker.

## Product Reason
Signed-in onboarding depends on consistent access rules: anonymous users should see auth entry, authenticated users missing profile setup should finish setup, and ready signed-in users should reach Add Card, Connected Accounts, and Profile flows. Moving those gates behind a small tested boundary reduces wallet-shell ownership before live Plaid onboarding evidence work resumes.

## Changed
- Added `components/card-reader/useWalletAccessGates.ts`.
- Added focused coverage in `components/card-reader/useWalletAccessGates.test.ts`.
- Updated `WalletPrototype.tsx` to route Add Card, Connected Accounts, and Profile actions through the shared protected-destination gate.
- Updated `PROJECT_STATE.md`, `ROADMAP.md`, and `docs/WALLET_DECOMPOSITION.md`.

## Implementation Notes
- `resolveWalletAccessGate()` maps protected wallet destinations to either the required auth flow (`entry` or `setup`) or the allowed destination.
- `useWalletAccessGates()` centralizes the shared pre-navigation cleanup for wallet-selection expansion and profile menu state before routing a protected action.
- Add Card still opens the existing Plaid-first add-card sheet for profile-ready signed-in users.
- Connected Accounts and Profile still navigate to their existing screens; no Supabase, Plaid, or recommendation API contract changed.

## Verification
- `npx vitest run components/card-reader/useWalletAccessGates.test.ts`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run smoke:onboarding`
- `npm run smoke:signed-in-preflight` *(still blocked at the known stale local Supabase service-role credential)*

## Production Smoke Result
- Deployed the completed slice to Vercel production.
- Production alias: `https://card-reader-xi.vercel.app`
- Homepage smoke returned HTTP 200.
- Production onboarding contract smoke passed against the alias.

## Risks
- Live signed-in manual-card and Plaid write-path smokes remain blocked until the local `SUPABASE_SERVICE_ROLE_KEY` is refreshed.
- This slice improves onboarding workflow maintainability and test coverage, but it does not add new live Plaid Link browser evidence.

## Next Best Action
Refresh the local Supabase service-role credential, rerun `npm run smoke:signed-in-preflight`, then run `npm run smoke:signed-in-manual-card` and `npm run smoke:signed-in-plaid-card-match` against production before adding browser-driven signed-in Plaid onboarding evidence.
