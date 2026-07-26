# Daily Work Log - 2026-07-26

## Goal
Add production smoke coverage for the signed-in Plaid sandbox exchange plus authenticated card-product match flow.

## Product Reason
The highest-priority MVP path is signed-in onboarding and Plaid sync. After moving card-match persistence behind `POST /api/wallet/card-matches`, the next useful slice is a repeatable smoke command that exercises the real production contract instead of seeding matches directly into Supabase.

## Changed
- Added `scripts/smoke-signed-in-plaid-card-match.mjs`.
- Added `npm run smoke:signed-in-plaid-card-match`.
- Added `docs/PLAID_SIGNED_IN_SMOKE.md`.
- Updated `PROJECT_STATE.md`, `ROADMAP.md`, and `docs/CARD_MATCH_HINTS.md`.

## Implementation Notes
- The smoke script follows the same environment-loading and cleanup pattern as the manual-card smoke.
- It creates a disposable confirmed Supabase user, signs in, creates a Plaid sandbox public token, exchanges that token through production `POST /api/plaid/exchange-token`, matches the imported credit-card account through production `POST /api/wallet/card-matches`, syncs transactions for the saved Plaid item, verifies `GET /api/wallet/analysis`, and deletes the smoke user by default.
- The script intentionally uses the authenticated app card-match route instead of writing `account_card_matches` through the Supabase service role.
- The command outputs a JSON run summary suitable for archiving in future evidence logs.

## Verification
- `node --check scripts/smoke-signed-in-plaid-card-match.mjs`
- `npx vitest run app/api/wallet/card-matches/route.test.ts app/api/plaid/exchange-token/route.test.ts app/api/plaid/sync-transactions/route.test.ts`
- `npm run lint`
- `npm run smoke:signed-in-plaid-card-match` attempted against `https://card-reader-xi.vercel.app`.

## Production Smoke Result
The production smoke did not reach Plaid or app API calls because disposable Supabase admin user creation failed with:

```text
401 Invalid API key
```

This matches the known stale local service-role credential blocker from the manual-card smoke.

## Risks
- The signed-in Plaid production smoke command is now ready, but its first full run is blocked until the local Supabase service-role key is refreshed.
- The script verifies the production API contract, but it does not capture browser UI evidence for the live Plaid Link modal.

## Next Best Action
Refresh the local Supabase service-role credential, then rerun both `npm run smoke:signed-in-manual-card` and `npm run smoke:signed-in-plaid-card-match`. After both pass, add browser-driven signed-in Plaid onboarding evidence against production.
