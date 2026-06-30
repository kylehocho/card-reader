# Project State

Last updated: 2026-06-29

## Current Goal
Build the fastest credible MVP of Card Reader: a smart wallet that lets users connect or manually add cards, understands a focused catalog of high-value cards, and recommends the best card/benefit action in real time across web and mobile surfaces.

## Current Production
- App: https://card-reader-xi.vercel.app
- Platform: Next.js on Vercel
- Auth/data: Supabase
- Plaid: sandbox Link + account/transaction sync routes
- Priority catalog: 10 card products seeded into Supabase
- Mock data: 10 mock Plaid accounts, 10 account-card matches, 31 mock transactions

## Recently Completed
- Added Vitest coverage for `analyzeWallet()` and signed-in wallet analysis UI mapping.
- Fixed grocery category inference so merchants like Whole Foods do not get swallowed by the broader dining/food rule.
- Wallet home and Opportunities surfaces now consume the authenticated wallet analysis API for signed-in benefit trackers, welcome bonuses, alerts, and missed-value recommendations.
- User-backed wallets no longer show demo seed cards or global welcome bonus rows.
- Added top-10 priority card catalog.
- Added first-pass wallet benefits analyzer.
- Added top-10 mock wallet fixture and Supabase seed script.
- Updated Vercel Supabase anon/service-role env vars and reseeded production.

## Working MVP Scope
- Supabase email/Google auth foundation.
- Plaid sandbox connect flow.
- Profile-specific linked accounts.
- Manual account-to-card-product matching.
- Transaction sync and first-pass missed-value recommendations.
- Top-10 card catalog and mock analysis data.
- Authenticated wallet analysis API at `GET /api/wallet/analysis`.

## Active Gaps
- Browser extension is scaffold-only until installed locally and wired to user auth.
- Benefits engine has an authenticated API endpoint and the wallet UI consumes it for signed-in analysis surfaces; component-local fallback logic still supports anonymous/demo sessions.
- Test coverage now protects first-pass wallet analysis and signed-in UI mapping, but API route tests and browser-driven signed-in Plaid smoke are still missing.
- Merchant offers are rule-based mocks, not issuer-scraped/live offers.
- Transfer partner optimization is not implemented.
- Admin tools are not built.

## Next Best Actions
1. Install/test the browser extension locally against Patagonia/Amazon/airline pages.
2. Add API route tests for `/api/wallet/analysis` auth/error/data-shape behavior.
3. Add a manual card add flow that persists card-product matches without Plaid.
4. Add deterministic card-product match hints from Plaid account names and known card catalog aliases.
5. Add a lightweight admin/catalog editor for card products and benefits.
