# Technical Architecture

## Stack
- Frontend/app: Next.js App Router, React, TypeScript, Tailwind CSS.
- Hosting: Vercel.
- Database/auth: Supabase Postgres + Supabase Auth.
- Financial data: Plaid sandbox for account/transaction sync.
- Extension: Chrome Manifest V3 static package.
- Recommendation logic: shared TypeScript libraries under `lib/benefits` and `lib/recommendation`.

## Core Modules
- `data/top-priority-card-products.json`: canonical MVP catalog.
- `data/merchant-catalog.json`: canonical MVP merchant domains, aliases, categories, and offer hints.
- `lib/cards/top-priority-cards.ts`: app helper for priority catalog.
- `lib/cards/card-match-hints.ts`: deterministic Plaid account-to-card-product suggestion helper.
- `lib/benefits/analyze-wallet.ts`: pure wallet analysis engine.
- `app/api/plaid/*`: Plaid linking/sync routes. Transaction sync only processes active Plaid items.
- `app/api/recommend-card`: merchant context recommendation API.
- `app/api/wallet/analysis`: authenticated wallet analysis API for linked accounts.
- `app/api/wallet/manual-cards`: authenticated no-Plaid card entry API that creates a manual account and card-product match.
- `components/card-reader/WalletPrototype.tsx`: mobile-first wallet client; signed-in analysis panels consume `/api/wallet/analysis`.
- `extension/`: browser extension MVP.

## Data Flow
1. User signs up through Supabase Auth.
2. User links Plaid account.
3. Server exchanges Plaid public token and stores encrypted access token.
4. Server saves Plaid accounts and transactions.
5. User maps Plaid account to `card_products`, optionally accepting a deterministic match hint.
6. Users without Plaid can manually add a catalog-backed card, which creates a synthetic manual account and `account_card_matches` row.
7. Analysis engine combines card product rules + account matches + transactions.
8. `GET /api/wallet/analysis` exposes wallet trackers, welcome bonuses, alerts, and recommendations for authenticated clients.
9. Signed-in wallet UI renders API-backed trackers, welcome bonuses, alerts, and missed-value recommendations.
10. App/extension render recommendation and benefit actions.

## Database Tables
- `profiles`: app profile for each Supabase auth user.
- `plaid_items`: encrypted Plaid item access-token records.
- `plaid_accounts`: Plaid account snapshots.
- `plaid_transactions`: transaction history for analysis.
- `card_products`: card catalog, rewards, and benefits JSON.
- `account_card_matches`: per-user account-to-card-product mapping.
- Recommendation intelligence tables live in `supabase/merchant-intelligence.sql`: `merchant_catalog`, `merchant_offer_rules`, `card_reward_rules`, and `recommendation_events`.

## Card Match Hints
The client scores linked Plaid account names and institution names against the loaded card catalog. Alias matches and product-token overlap can produce a suggestion, but the app does not write the match automatically. If the user accepts the suggestion, the saved row uses `match_status = suggested` and stores the computed confidence. Manual dropdown saves continue to use `match_status = manual`.

## Recommendation API Shape
`POST /api/recommend-card` is the unauthenticated merchant-context endpoint used by the browser extension MVP.

Input:
```json
{
  "merchant": "Patagonia",
  "url": "https://www.patagonia.com/...",
  "categoryHint": "shopping",
  "cardProductIds": ["amex-gold", "chase-sapphire-reserve"]
}
```

The endpoint now normalizes merchant context against `data/merchant-catalog.json` before falling back to text/category inference. The catalog keeps merchant detection thin: the extension sends host/title/category hints, and the backend owns canonical merchant names, reward categories, aliases, and merchant-specific offer hints.

`npm run seed:merchant-intelligence` mirrors the JSON merchant catalog, merchant offer hints, and top-priority card reward rules into Supabase. `GET /api/merchant-intelligence` exposes a server-side availability/count check for those backend tables. Recommendation execution still uses the local JSON fallback until the Supabase-backed scorer is wired and tested.

If the request includes a Supabase bearer token, the endpoint validates the session and replaces any client-supplied `cardProductIds` with the authenticated user's matched `account_card_matches.card_product_id` values. Anonymous requests keep using the top-10 demo catalog for public extension smoke and shareable API demos.

Successful recommendation calls are also written to `recommendation_events` when Supabase server credentials are available. The event row stores demo vs signed-in mode, user id when present, merchant/category inputs, selected card ids, candidate-card count, and scrubbed request/response snapshots. Logging failures are non-blocking so the recommendation endpoint does not fail if the analytics table has not been applied yet.

`GET /api/recommendation-events` is an authenticated read endpoint for recent signed-in recommendation history. It returns the user's latest event rows and exposes `meta.loggingAvailable=false` when the SQL migration has not been applied yet, which lets extension smoke tooling distinguish "no events" from "logging table unavailable."

## Manual Card API Shape
`POST /api/wallet/manual-cards` requires a Supabase bearer token. It lets a signed-in user add a known catalog product without Plaid by sending `cardProductId`, `last4`, and an optional `label`.

The route creates or reuses one synthetic `plaid_items` row with `status = manual`, upserts a synthetic `plaid_accounts` credit-card row keyed as `manual:<cardProductId>:<last4>`, and upserts an `account_card_matches` row with `match_status = manual`. The manual item status keeps transaction sync from trying to decrypt or sync a non-Plaid token, while wallet analysis and authenticated merchant recommendations continue to read through the existing account/match tables.

`POST /api/plaid/sync-transactions` filters `plaid_items` to `status = active` before it initializes the Plaid client or decrypts access tokens. A manual-only user receives `{ itemCount: 0, totalSaved: 0, items: [] }`, which keeps the no-Plaid setup path safe when the UI transaction-sync action is triggered before any real Plaid item exists.

## Wallet Analysis API Shape
`GET /api/wallet/analysis` requires a Supabase bearer token. It loads the authenticated user's linked Plaid accounts, card-product matches, recent transactions, and the full card catalog before calling `analyzeWallet()`.

Output:
```json
{
  "analysis": {
    "trackers": [],
    "welcomeBonuses": [],
    "recommendations": [],
    "alerts": []
  },
  "meta": {
    "cardProducts": 10,
    "linkedAccounts": 10,
    "matchedAccounts": 10,
    "transactions": 31,
    "generatedAt": "2026-06-27T00:00:00.000Z"
  }
}
```

Merchant recommendation output:
```json
{
  "merchant": "Patagonia",
  "category": "general",
  "bestCard": "Chase Sapphire Reserve",
  "reason": "Best linked card for general spend and purchase protection among provided cards.",
  "matchedOffer": null
}
```

## Scaling Path
- Move card catalog editing into an admin dashboard.
- Add background sync jobs for Plaid and offer refresh.
- Move merchant normalization, offer rules, and card reward rules from JSON into Supabase using the `supabase/merchant-intelligence.sql` blueprint.
- Add analytics/audit trail for recommendation decisions.
- Add mobile clients consuming the same analysis API.
