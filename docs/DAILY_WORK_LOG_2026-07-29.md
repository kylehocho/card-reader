# Daily Work Log - 2026-07-29

## Goal
Add production-safe Plaid recovery evidence to the signed-in onboarding path.

## Product Reason
Signed-in Plaid onboarding is still the top app priority, but live write-path smoke is blocked by the stale local Supabase service-role key. The app can still improve and verify the user-visible recovery states that appear when a Plaid Link succeeds but token exchange returns no credit-card accounts or a duplicate active card.

## Changed
- Added `plaidErrorRecovery()` to the Add Card sheet.
- Mapped no-credit-card and duplicate active-card Plaid exchange failures to a clear title, explanation, and next action.
- Added `/evidence/onboarding?state=plaid-no-credit`.
- Added `/evidence/onboarding?state=plaid-duplicate`.
- Extended `npm run evidence:onboarding` to capture both Plaid recovery states.
- Extended `npm run smoke:onboarding` to assert both Plaid recovery states in headless Chrome.
- Updated `PROJECT_STATE.md` and `docs/ONBOARDING_UI_EVIDENCE.md`.

## Implementation Notes
- The live `POST /api/plaid/exchange-token` error contract is unchanged.
- Recovery mapping is presentation-only and keeps token, Plaid, and Supabase handling server-side.
- The no-credit-card fixture renders the Plaid connect step with no imported account rows, matching the real exchange failure path.
- The duplicate-card fixture renders the Plaid connect step with the already-linked recovery message so the user is pointed toward connected-account review instead of relinking.

## Verification
- `npx vitest run components/card-reader/AddCardSheet.test.ts`
- `npm run smoke:onboarding`
- `npm run lint`
- `npm run test`
- `npm run build`

## Production Smoke Result
- Deployed commit `fbda564` to Vercel production.
- Deployment URL: `https://card-reader-hr5mmx349-kylehocho-5599s-projects.vercel.app`
- Production alias: `https://card-reader-xi.vercel.app`
- Deployment id: `dpl_AmP6cxPXbZuv4EBuMRUPFw1D2QPA`
- Homepage smoke returned HTTP 200.
- Direct production checks confirmed:
  - `/evidence/onboarding?state=plaid-no-credit` renders `No credit card accounts found` and `Try another issuer or enter manually`.
  - `/evidence/onboarding?state=plaid-duplicate` renders `Card already linked` and `Review connected accounts`.
- `SMOKE_TIMEOUT_MS=5000 npm run smoke:onboarding` passed against the production alias and checked manual-card, Plaid match, both Plaid recovery states, and selection outcomes.

## Risks
- Live signed-in manual-card and Plaid write-path smoke remain blocked until the local `SUPABASE_SERVICE_ROLE_KEY` is refreshed.
- Fixture evidence protects the rendered recovery contract, not the full Plaid Link popup or Supabase write path.

## Next Best Action
Refresh the local Supabase service-role credential, rerun `npm run smoke:signed-in-preflight`, then run `npm run smoke:signed-in-manual-card` and `npm run smoke:signed-in-plaid-card-match` against production.
