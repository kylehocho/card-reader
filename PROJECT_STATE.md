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
- Added extension-side settings for authenticated recommendations: API base URL in sync storage, Supabase bearer token in local storage, signed-in wallet status in the popup, and authenticated `/api/recommend-card` calls from the background worker.
- Added optional Supabase bearer auth to `/api/recommend-card` so authenticated extension clients can rank only the user's matched card products instead of the top-10 demo catalog.
- Added a first-pass merchant intelligence catalog for the recommendation engine, plus merchant-context tests and a Supabase table blueprint for moving merchant/reward rules out of JSON later.
- Started browser extension local smoke in isolated Chrome; patched extension fallback behavior after automation showed session storage was not populated from merchant page navigation.
- Added `/api/wallet/analysis` route tests for auth, Supabase error, and happy-path response shape.
- Added deterministic Plaid account-to-card-product match hints with conservative user acceptance flow.
- Moved `/Goal CTO` daily work logs into dedicated Notion sub-pages under `Daily Work Logs`.
- Added a browser extension local test plan covering merchant pages, API calls, popup rendering, privacy checks, and evidence capture.
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
- Auth-aware merchant recommendation API at `POST /api/recommend-card`.
- Merchant catalog normalization for known extension smoke merchants and offer hints.
- Deterministic card-match hints in the Plaid matching UI.

## Active Gaps
- Browser extension can store auth settings and call the auth-aware recommendation API, but still needs manual or extension-capable browser smoke; CDP automation did not verify popup/session storage end to end.
- Benefits engine has an authenticated API endpoint and the wallet UI consumes it for signed-in analysis surfaces; component-local fallback logic still supports anonymous/demo sessions.
- Test coverage now protects first-pass wallet analysis, signed-in UI mapping, `/api/wallet/analysis` route behavior, and card-match hints; browser-driven signed-in Plaid smoke is still missing.
- Merchant offers are catalog hints, not issuer-scraped/live offers.
- Transfer partner optimization is not implemented.
- Admin tools are not built.

## Next Best Actions
1. Complete manual or extension-capable browser smoke using `docs/EXTENSION_LOCAL_TEST_PLAN.md`.
2. Replace manual token paste with first-class auth handoff from web app to extension.
3. Add a browser-driven signed-in Plaid + extension recommendation smoke against production.
4. Move merchant catalog and offer rules into Supabase once import/admin ownership is ready.
5. Add a manual card add flow that persists card-product matches without Plaid.
