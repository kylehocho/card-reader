# Daily Work Log - 2026-07-24

## Goal
Add live signed-in manual-card smoke coverage for the onboarding persistence path.

## Product Reason
The onboarding fixture smoke proves the signed-in UI contract renders, but the MVP also needs a repeatable production check that a real authenticated user can create a wallet card, see it in analysis, safely sync without Plaid items, and receive an authenticated merchant recommendation from owned card matches.

## Changed
- Added `scripts/smoke-signed-in-manual-card.mjs`.
- Added `npm run smoke:signed-in-manual-card`.
- Documented the live signed-in smoke in `docs/ONBOARDING_UI_EVIDENCE.md`.
- Updated `PROJECT_STATE.md` and `ROADMAP.md` with the new coverage and next best action.

## Implementation Notes
- The smoke loads `.env.local`, `.env`, `.env.vercel.production.local`, or existing process env values for Supabase URL, anon/publishable key, and service-role key.
- It creates a disposable confirmed Supabase user through the admin API, signs in through the public password grant, and uses only the resulting bearer token for app API calls.
- It saves an Amex Gold manual card with last four `3007` through `POST /api/wallet/manual-cards`.
- It asserts `GET /api/wallet/analysis` returns one linked account and one matched account.
- It asserts manual-only `POST /api/plaid/sync-transactions` returns zero items and zero saved transactions.
- It asserts authenticated `POST /api/recommend-card` for Whole Foods selects Amex Gold from the user's owned card matches.
- It deletes the disposable smoke user by default; `SMOKE_KEEP_USER=true` keeps the user for debugging.

## Verification
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run smoke:signed-in-manual-card` reached Supabase admin user creation but failed with `401 Invalid API key` from the local service-role credential before creating a smoke user.
- `npm run smoke:onboarding` was attempted after build but hung in the local Chrome process and was cleaned up.

## Risks
- The new smoke covers the live signed-in manual-card path, not Plaid Link UI or sandbox public-token exchange.
- It depends on a valid Supabase admin credential being present in local environment files or exported env vars. The current local service-role credential returned `401 Invalid API key`.
- The recommendation assertion intentionally uses one owned card so it verifies authenticated scoping, but it does not compare multiple owned-card candidates.

## Next Best Action
Refresh the local Supabase service-role credential and rerun `npm run smoke:signed-in-manual-card`; after that passes, extend live signed-in smoke coverage to Plaid sandbox exchange and card-product match persistence.
