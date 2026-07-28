# Signed-In Plaid Smoke

Last updated: 2026-07-26

## Intent
The signed-in Plaid smoke verifies the production path a real user will take after creating an account: connect a Plaid sandbox credit-card item, save the imported account, accept a card-product match through the authenticated app route, sync transactions, and confirm wallet analysis sees the linked and matched account.

This complements `npm run smoke:signed-in-manual-card`, which covers the no-Plaid manual-card onboarding path.

## Command
Run the shared dependency preflight before the live workflow smoke:

```bash
npm run smoke:signed-in-preflight
```

Then run the Plaid workflow smoke:

```bash
npm run smoke:signed-in-plaid-card-match
```

The script loads `.env.local`, `.env`, and `.env.vercel.production.local` without printing secrets. By default it targets `https://card-reader-xi.vercel.app`.

Required configuration:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`

Optional overrides:
- `APP_BASE_URL`
- `SMOKE_USER_EMAIL`
- `SMOKE_USER_PASSWORD`
- `PLAID_SANDBOX_INSTITUTION_ID`
- `PLAID_SANDBOX_INSTITUTION_NAME`
- `SMOKE_CARD_PRODUCT_ID`
- `SMOKE_MATCH_STATUS`
- `SMOKE_MATCH_CONFIDENCE`
- `SMOKE_SYNC_DAYS`
- `SMOKE_KEEP_USER=true`
- `SMOKE_PREFLIGHT_SKIP_PLAID=true` for manual-card-only preflight checks

## Dependency Preflight
`npm run smoke:signed-in-preflight` checks the live dependencies without creating a smoke user or writing app records:
- production homepage reachability at `APP_BASE_URL`
- Supabase admin Auth access with `SUPABASE_SERVICE_ROLE_KEY`
- Supabase public Auth access with the anon or publishable key
- Plaid sandbox credential access through `categories/get`

The command prints redacted JSON only. It does not print Supabase keys, Plaid secrets, bearer tokens, or token material. A service-role failure exits at `failedCheck: "supabaseAdmin"` with the retry hint to refresh `SUPABASE_SERVICE_ROLE_KEY` before running either signed-in smoke command.

## Covered Workflow
1. Create a disposable confirmed Supabase user through the admin Auth API.
2. Sign in with the public Supabase auth token flow.
3. Create a Plaid sandbox public token for a credit-card institution.
4. Call production `POST /api/plaid/exchange-token` with the signed-in bearer token.
5. Assert at least one credit-card account was imported.
6. Call production `POST /api/wallet/card-matches` for the imported Plaid account.
7. Assert the saved match uses the expected card product and normalized status.
8. Call production `POST /api/plaid/sync-transactions` for the saved Plaid item.
9. Call production `GET /api/wallet/analysis` and assert linked and matched accounts are visible.
10. Delete the disposable user unless `SMOKE_KEEP_USER=true`.

## Success Output
On success the script prints a JSON summary with:
- app base URL
- disposable user id and email
- Plaid institution id/name
- saved Plaid item id
- imported/skipped account counts
- card-match account/product/status/confidence
- transaction sync counts
- wallet-analysis linked/matched/transaction counts
- cleanup status

## Current Blocker
The first production attempt on 2026-07-26 failed before Plaid or app API calls because the local `SUPABASE_SERVICE_ROLE_KEY` returned `401 Invalid API key` from Supabase admin user creation. The 2026-07-28 preflight command now surfaces this dependency directly before any write-path smoke runs. Refreshing the local service-role credential should unblock both signed-in smoke commands.

## Verification
- `node --check scripts/smoke-signed-in-preflight.mjs`
- `node --check scripts/smoke-signed-in-plaid-card-match.mjs`
- `npx vitest run app/api/wallet/card-matches/route.test.ts app/api/plaid/exchange-token/route.test.ts app/api/plaid/sync-transactions/route.test.ts`
- `npm run lint`
- `npm run smoke:signed-in-preflight` should pass before running the write-path smoke commands. If it fails at `supabaseAdmin`, refresh the local service-role credential and rerun it.
- `npm run smoke:signed-in-plaid-card-match` attempted against production and failed at Supabase admin user creation with the known local credential blocker.
