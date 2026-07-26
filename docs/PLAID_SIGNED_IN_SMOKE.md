# Signed-In Plaid Smoke

Last updated: 2026-07-26

## Intent
The signed-in Plaid smoke verifies the production path a real user will take after creating an account: connect a Plaid sandbox credit-card item, save the imported account, accept a card-product match through the authenticated app route, sync transactions, and confirm wallet analysis sees the linked and matched account.

This complements `npm run smoke:signed-in-manual-card`, which covers the no-Plaid manual-card onboarding path.

## Command
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
The first production attempt on 2026-07-26 failed before Plaid or app API calls because the local `SUPABASE_SERVICE_ROLE_KEY` returned `401 Invalid API key` from Supabase admin user creation. Refreshing the local service-role credential should unblock both signed-in smoke commands.

## Verification
- `node --check scripts/smoke-signed-in-plaid-card-match.mjs`
- `npx vitest run app/api/wallet/card-matches/route.test.ts app/api/plaid/exchange-token/route.test.ts app/api/plaid/sync-transactions/route.test.ts`
- `npm run lint`
- `npm run smoke:signed-in-plaid-card-match` attempted against production and failed at Supabase admin user creation with the known local credential blocker.
