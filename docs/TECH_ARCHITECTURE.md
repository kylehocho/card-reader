# Technical Architecture

## Stack
- Frontend/app: Next.js App Router, React, TypeScript, Tailwind CSS.
- Hosting: Vercel.
- Database/auth: Supabase Postgres + Supabase Auth.
- Financial data: Plaid sandbox for account/transaction sync.
- Extension: Chrome Manifest V3 static package.
- Recommendation logic: shared TypeScript library under `lib/benefits`.

## Core Modules
- `data/top-priority-card-products.json`: canonical MVP catalog.
- `data/merchant-catalog.json`: canonical MVP merchant domains, aliases, categories, and offer hints.
- `lib/cards/top-priority-cards.ts`: app helper for priority catalog.
- `lib/cards/card-match-hints.ts`: deterministic Plaid account-to-card-product suggestion helper.
- `lib/benefits/analyze-wallet.ts`: pure wallet analysis engine.
- `app/api/plaid/*`: Plaid linking/sync routes.
- `app/api/recommend-card`: merchant context recommendation API.
- `app/api/wallet/analysis`: authenticated wallet analysis API for linked accounts.
- `components/card-reader/WalletPrototype.tsx`: mobile-first wallet client; signed-in analysis panels consume `/api/wallet/analysis`.
- `extension/`: browser extension MVP.

## Data Flow
1. User signs up through Supabase Auth.
2. User links Plaid account.
3. Server exchanges Plaid public token and stores encrypted access token.
4. Server saves Plaid accounts and transactions.
5. User maps Plaid account to `card_products`, optionally accepting a deterministic match hint.
6. Analysis engine combines card product rules + account matches + transactions.
7. `GET /api/wallet/analysis` exposes wallet trackers, welcome bonuses, alerts, and recommendations for authenticated clients.
8. Signed-in wallet UI renders API-backed trackers, welcome bonuses, alerts, and missed-value recommendations.
9. App/extension render recommendation and benefit actions.

## Database Tables
- `profiles`: app profile for each Supabase auth user.
- `plaid_items`: encrypted Plaid item access-token records.
- `plaid_accounts`: Plaid account snapshots.
- `plaid_transactions`: transaction history for analysis.
- `card_products`: card catalog, rewards, and benefits JSON.
- `account_card_matches`: per-user account-to-card-product mapping.
- Target recommendation tables are sketched in `supabase/merchant-intelligence.sql`: `merchant_catalog`, `merchant_offer_rules`, and `card_reward_rules`.

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
