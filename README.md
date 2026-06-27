# Card Reader

A wallet-style prototype for a credit card benefits assistant.

## Product idea
Card Reader helps people understand:
- which credit card to use for a purchase
- which perks or statement credits are still unused
- how close they are to unlocking spend-based bonuses
- current rewards balances by card

The current prototype is a mobile-first UI demo inspired by Apple Wallet.

## Prototype goals
- make the app feel instantly familiar
- show stacked cards on a wallet-style home screen
- let a user add a card through a scan flow mock
- show benefits, rewards, and spend progress for each card
- surface proactive recommendations and missed opportunities

## Current route
- `/` — main wallet prototype

## Run locally
```bash
npm install
npm run dev
```

## Plaid sandbox setup
Create `.env.local` from `.env.example`, then fill in the Plaid sandbox values:

```bash
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PLAID_TOKEN_ENCRYPTION_KEY=...
```

## Supabase setup
Run `supabase/schema.sql` in the Supabase SQL editor for the project. It creates:
- `profiles` - one row per `auth.users.id`
- `plaid_items` - server-written Plaid item records with encrypted access-token storage
- `plaid_accounts` - server-written account snapshots returned by Plaid
- `plaid_transactions` - server-synced Plaid transaction rows for recommendation inputs
- `card_products` - starter catalog for card benefits and reward rules
- `account_card_matches` - per-user mapping from a connected Plaid account to a card product

The app now uses Supabase Auth and the `profiles` table whenever `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured. Without those env vars, it falls back to the local prototype auth flow so UI work remains easy.

The add-card sheet uses Plaid as the production linking path for signed-in users. In sandbox, use Plaid test credentials in Link; the app requires a signed-in Supabase user, exchanges the returned public token server-side, encrypts the Plaid access token, writes Plaid item/account records, then prompts the user to match each returned credit account to a real card product before finishing the flow.

Connected sandbox accounts are also visible from Profile → Connected accounts, which is the mock home for later persisted Plaid items, issuer account IDs, and card-product benefit mapping.
From the post-Link matching step or Profile → Connected accounts, a signed-in user can assign each persisted Plaid credit account to a card product from `card_products`. The selection writes to `account_card_matches` under Supabase RLS and updates the wallet card to show the matched product.
The same screen includes a transaction sync action. It calls `/api/plaid/sync-transactions`, which decrypts stored Plaid access tokens server-side, pulls recent Plaid sandbox transactions, writes them to `plaid_transactions`, and then displays the latest rows under each connected account.
The wallet and Opportunities surfaces now run a first-pass recommendation check over synced transactions. It infers a simple rewards category from Plaid merchant/category data, compares the matched card against `card_products.rewards`, and surfaces better-card ideas with an estimated value lift.

For Supabase-backed signed-in sessions, the wallet is user-owned: it only renders cards from persisted linked accounts or cards created in that session. The prototype seed deck remains available only as anonymous/local fallback data so a new production user does not inherit example cards.

The UI still caches the most recent connected account payload in browser localStorage for immediate wallet rendering after Link. Supabase is now the source of truth for persisted Plaid item/account records. Access tokens are encrypted server-side and are never exposed to browser code.

## Seed Plaid sandbox data
After the Supabase schema is current and the required env vars are present, run:

```bash
npm run seed:plaid:sandbox
```

The seed script creates a confirmed Supabase test user, creates a Plaid sandbox public token, exchanges it through the live app endpoint, saves the returned Plaid item/accounts, syncs recent Plaid transactions, and creates one starter `account_card_matches` row against the Chase Sapphire Reserve catalog entry.

Optional seed overrides:

```bash
APP_BASE_URL=https://card-reader-xi.vercel.app \
SEED_USER_EMAIL=card.reader.seed@example.com \
SEED_CARD_PRODUCT_ID=chase-sapphire-reserve \
npm run seed:plaid:sandbox
```

## Seed top-priority card analysis data
The top-priority card catalog lives in `data/top-priority-card-products.json`, with app helpers in `lib/cards/top-priority-cards.ts`. The first-pass pure benefits engine is `lib/benefits/analyze-wallet.ts`, and reusable mock Plaid fixture data is in `lib/plaid/mock-top-priority-wallets.ts`.

After Supabase env vars are present, run:

```bash
npm run seed:plaid:top10
```

This creates a confirmed demo user, seeds the 10 priority card products, creates one mock Plaid credit account per card, matches every account to its card product, and inserts transactions that exercise statement credits, welcome bonuses, rent, category spend, and best-card recommendation logic. The seeded Plaid item uses `status = "mock"` so `/api/plaid/sync-transactions` ignores its placeholder token and does not call Plaid for fixture data.

## Browser extension MVP
The extension MVP lives in `extension/`. It detects merchant context from the active tab and calls `/api/recommend-card` for a best-card recommendation from the top-10 catalog.

Local install:

```bash
npm run dev
```

Then open Chrome extensions, enable developer mode, choose "Load unpacked", and select the `extension/` folder.

By default the extension points at production:

```text
https://card-reader-xi.vercel.app
```

For local testing, edit `API_BASE_URL` in `extension/background.js` to `http://localhost:3000`.

API smoke test:

```bash
curl -sS -X POST http://localhost:3000/api/recommend-card \
  -H 'content-type: application/json' \
  --data '{"merchant":"Patagonia","url":"https://www.patagonia.com/shop/mens","title":"Patagonia Outdoor Clothing","categoryHint":"shopping"}'
```

## Wallet analysis API
Signed-in clients can call the shared wallet analysis engine through:

```bash
curl -sS https://card-reader-xi.vercel.app/api/wallet/analysis \
  -H "authorization: Bearer $SUPABASE_USER_ACCESS_TOKEN"
```

The endpoint loads the current user's Plaid accounts, account-card matches, recent transactions, and card catalog rows from Supabase, then returns:
- `analysis.trackers` - statement credit and benefit trackers
- `analysis.welcomeBonuses` - welcome bonus progress from linked transactions
- `analysis.recommendations` - transaction-level missed-value recommendations
- `analysis.alerts` - concise user-facing alerts
- `meta` - counts for linked accounts, matches, transactions, and catalog rows

## Tech
- Next.js
- React
- Tailwind CSS
- TypeScript

## Short-term roadmap
1. card scan confirmation screen
2. notifications / expiring perks screen
3. best-card recommendation flow
4. persist Plaid item/account records after token exchange
5. richer fake data model and state transitions
6. motion pass to get closer to a polished wallet feel

## Product principles
- wallet-inspired, premium, calm UI
- make value legible in under 10 seconds
- emphasize actionable recommendations over raw card data
- show what is still available, not just what exists
