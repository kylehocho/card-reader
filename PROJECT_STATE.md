# Project State

Last updated: 2026-07-16

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
- Continued the `WalletPrototype.tsx` decomposition by extracting selected-card, wallet-page, screen, stack-expansion, selected-card fallback, and wallet-stack derivation into `components/card-reader/useWalletNavigation.ts`. Added focused helper coverage for selected-card resolution, page-bound clamping, and stack contents in `components/card-reader/useWalletNavigation.test.ts`. Updated `docs/WALLET_DECOMPOSITION.md` and `docs/DAILY_WORK_LOG_2026-07-16.md`. Verification passed with targeted navigation/decomposition tests, lint, full Vitest, production build, Vercel production deploy, homepage smoke, and Whole Foods recommendation smoke.
- Continued the `WalletPrototype.tsx` decomposition by extracting merchant recommendation loading and Use Now route-state effects into `components/card-reader/useMerchantRecommendation.ts`. The hook now owns Use Now route bootstrap, demo merchant deep links, live `/api/recommend-card` loading/error state, optional signed-in bearer auth, live API response projection, and seeded fallback result merging while the wallet shell keeps screen placement and compact/full Use Now presentation. Added focused projection/merge coverage in `components/card-reader/useMerchantRecommendation.test.ts`. Updated `docs/WALLET_DECOMPOSITION.md` and `docs/DAILY_WORK_LOG_2026-07-15.md`. Verification passed with targeted Use Now tests, lint, full Vitest, production build, Vercel production deploy, homepage smoke, and Whole Foods recommendation smoke.
- Continued the `WalletPrototype.tsx` decomposition by extracting signed-in Plaid/manual-card mutation workflows into `components/card-reader/usePlaidWalletActions.ts`. The hook now owns manual-card save status, Plaid Link token/exchange flow, pending linked accounts, card-match save status, connected-account removal state, and transaction-sync status while `WalletPrototype.tsx` keeps navigation and selected-card outcomes. Added focused helper coverage for Plaid exchange projection, card-product match application, account removal, and match-status cleanup. Updated `docs/WALLET_DECOMPOSITION.md` and `docs/DAILY_WORK_LOG_2026-07-14.md`. Verification passed with targeted Plaid action tests, related hook tests, lint, full Vitest, and production build.
- Continued the `WalletPrototype.tsx` decomposition by extracting local missed-value transaction recommendation derivation into `components/card-reader/transactionRecommendations.ts`. The wallet still prefers API-backed analysis when available, while the fallback Plaid selector now owns category inference, reward multiplier aliases, best-card comparison, unmatched-account handling, recommendation formatting, and de-duplication. Added focused tests for grocery/personal-finance inference, reward aliases, stronger-card recommendations, unmatched accounts, and ignored pending/refund/already-optimal rows. Updated `docs/WALLET_DECOMPOSITION.md` and `docs/DAILY_WORK_LOG_2026-07-13.md`. Verification passed with targeted selector tests, lint, full Vitest, and production build.
- Continued the `WalletPrototype.tsx` decomposition by extracting signed-in persisted Plaid data hydration into `components/card-reader/usePersistedPlaidData.ts`. The hook now owns card-product catalog loading, persisted credit-card account loading, account-card-match relation projection, recent transaction row state, and five-row transaction preview grouping while keeping Plaid Link, manual card entry, transaction sync actions, match persistence, account removal, and wallet-analysis rendering in the parent. Added focused tests for transaction grouping and persisted account projection. Updated `docs/WALLET_DECOMPOSITION.md` and `docs/DAILY_WORK_LOG_2026-07-12.md`. Verification passed with targeted hook tests, lint, full Vitest, and production build.
- Continued the `WalletPrototype.tsx` decomposition by extracting Plaid account match suggestion derivation into `components/card-reader/usePlaidAccountMatching.ts`. Connected Accounts and post-Plaid onboarding still receive the same `matchSuggestionByAccountId` map, while the deterministic mapping now has focused Vitest coverage for known-product suggestions and unmatched accounts. Updated `docs/WALLET_DECOMPOSITION.md` and `docs/DAILY_WORK_LOG_2026-07-11.md`. Verification passed with targeted hook tests, lint, full Vitest, production build, Vercel production deploy, homepage smoke, and Whole Foods recommendation smoke.
- Continued the `WalletPrototype.tsx` decomposition by extracting the post-Plaid onboarding match account card into `components/card-reader/PendingPlaidMatchCard.tsx`. The match step now reuses a focused component for account summary, suggested match, status pill, card-product selector, and save helper text while keeping Plaid Link, match persistence, card-product loading, and suggestion derivation in `WalletPrototype.tsx`. Updated `docs/WALLET_DECOMPOSITION.md` and `docs/DAILY_WORK_LOG_2026-07-10.md`. Verification passed with lint, Vitest, production build, Vercel production deploy, homepage smoke, and Whole Foods recommendation smoke.
- Continued the `WalletPrototype.tsx` decomposition by extracting shared Plaid account matching UI into `components/card-reader/AccountMatchSuggestionCard.tsx` and shared card-reader view types into `components/card-reader/types.ts`. Both the post-Plaid onboarding match step and the signed-in Connected Accounts page now use the same suggested-match display, match labels, and tone classes. Added `docs/WALLET_DECOMPOSITION.md`. Verification passed with lint, Vitest, production build, Vercel production deploy, homepage smoke, and Whole Foods recommendation smoke.
- Continued the `WalletPrototype.tsx` decomposition by extracting the signed-in Connected Accounts page into `components/card-reader/ConnectedAccountsScreen.tsx`. The new component owns account-list rendering, recent transactions, card-product match controls, sync/error states, and empty-state CTAs while keeping Plaid Link, transaction sync, match persistence, and removal behavior in the parent. Verification passed with lint, Vitest, and production build.
- Started the `WalletPrototype.tsx` decomposition by extracting the in-app Use Now screen into `components/card-reader/UseNowScreen.tsx` while preserving the live `/api/recommend-card` loading, route-state handling, and demo merchant behavior in the parent. Verification passed with lint, Vitest, and production build.
- Added repeatable production-backed extension popup render evidence: `npm run evidence:extension-popup` calls `/api/recommend-card` for Whole Foods, Patagonia, Delta, Amazon, and Chipotle, seeds the actual popup HTML/CSS/JS with those responses, and captures screenshots plus `summary.json` under `artifacts/extension-popup-2026-07-06/`. The popup now renders recommendations directly in the card, applies global box sizing, wraps long recommendation text, and lets settings actions wrap so evidence screenshots do not clip. Chrome 149 rejects CLI unpacked-extension loading, so full installed-extension service worker/content-script smoke remains separate.
- Added a repeatable production Use Now evidence command: `npm run evidence:use-now` captures the five direct merchant links in headless Chrome and archives screenshots under `artifacts/use-now-YYYY-MM-DD/`. The 2026-07-05 run captured Whole Foods, Patagonia, Delta, Amazon, and Chipotle; the app now declares device-width viewport metadata, resets the body margin, the wallet shell explicitly fills the viewport, compact top-result metric tiles wrap long labels, and decorative rank pills hide on narrow result cards instead of clipping on mobile.
- Added URL-addressable Use Now demo routes for the in-app recommendation surface: wallet CTA and demo merchant chips now open the full Use Now screen, update the URL to `/?screen=use-now&merchant=<merchant>`, and preload the live `/api/recommend-card` result for Whole Foods, Patagonia, Delta, Amazon, or Chipotle. Route parsing is isolated in `lib/recommendation/use-now-route-state.ts` with Vitest coverage.
- Locked the in-app Use Now demo merchant matrix to backend recommendation behavior: shared demo merchant request contexts now drive the UI chips and `/api/recommend-card` calls, Chipotle is cataloged as dining, Amazon is the current rotating-quarterly demo merchant, and tests cover Whole Foods, Patagonia, Delta, Amazon, and Chipotle best-card outputs.
- Implemented the 2026-07-02 Jazz/Fable audit fix batch: extension content scripts are no longer injected on `<all_urls>`, demo/anonymous recommendations no longer write browsing-context event rows, extension demo requests omit page URL/title, popup rendering no longer uses `innerHTML`, stored API base URLs are allowlisted before bearer-token use, Plaid token encryption now requires `PLAID_TOKEN_ENCRYPTION_KEY`, and authenticated recommendations return a controlled 422 when matched cards are missing from the local catalog.
- Polished the wallet demo path from the audit: in-app Use Now now calls the same `/api/recommend-card` endpoint as the extension, manual card labels default to the selected card product name, Connected Accounts uses clearer `Add` wording, and account removal uses an in-app confirmation sheet instead of a browser-native confirm.
- Production-smoked the signed-in manual-card API lifecycle against `https://card-reader-xi.vercel.app`: disposable Supabase user creation/sign-in, manual `amex-gold` add, wallet analysis inclusion, manual-safe zero-item transaction sync, signed-in Whole Foods recommendation/event logging, manual-card removal, post-removal wallet clear, and smoke-user cleanup.
- Production-smoked the signed-in manual-card browser UI path with screenshot evidence for the empty wallet, manual Amex Gold entry preview, populated wallet/benefit trackers, and Connected Accounts row. Browser native confirm automation for remove timed out, so final cleanup used Supabase admin deletion and confirmed no user accounts remained.
- Added a front-end demo polish slice for the wallet home and in-app Use Now flow: the wallet now has a visible demo-route CTA, merchant recommendations cover Whole Foods, Patagonia, Delta, Amazon, and Chipotle, merchant results show matched benefit chips, and manual card entry has a richer preview/status state.
- Hardened Plaid transaction sync for manual-card users: `POST /api/plaid/sync-transactions` now returns a clean zero-item result when no active Plaid items exist, so synthetic manual wallets do not require Plaid client initialization or token decryption.
- Added authenticated manual card entry for signed-in users without Plaid: the Add Card sheet can save a selected catalog product and last four digits through `POST /api/wallet/manual-cards`, creating a manual account/product match that flows into wallet analysis and authenticated extension recommendations.
- Added extension-side settings for authenticated recommendations: API base URL in sync storage, Supabase bearer token in local storage, signed-in wallet status in the popup, and authenticated `/api/recommend-card` calls from the background worker.
- Added a popup-triggered active-tab refresh path for the browser extension, including a visible Refresh control, so popup smoke tests can request a fresh recommendation even when session storage was not pre-populated by background tab events.
- Added first-class web-to-extension auth handoff at `/extension/connect`, so signed-in users can sync the current Supabase session into the extension without pasting tokens manually.
- Added extension token-expiry handling so expired signed-in sessions surface a reconnect-needed state instead of silently falling back to demo recommendations.
- Added backend recommendation event logging for successful `/api/recommend-card` calls, with a Supabase `recommendation_events` SQL blueprint and typed route coverage.
- Added authenticated `GET /api/recommendation-events` so signed-in smoke tooling can read recent recommendation history once the migration is applied.
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
- Authenticated manual card entry at `POST /api/wallet/manual-cards` for users who need a no-Plaid card setup path.
- Auth-aware merchant recommendation API at `POST /api/recommend-card`.
- Merchant catalog normalization for known extension smoke merchants and offer hints.
- Shared Use Now demo merchant contexts for Whole Foods, Patagonia, Delta, Amazon, and Chipotle.
- Deterministic card-match hints in the Plaid matching UI.

## Active Gaps
- The Use Now screen, Use Now merchant recommendation hook, wallet navigation hook, Connected Accounts, post-Plaid match-card, shared match-suggestion component, Plaid match suggestion hook, persisted Plaid data hook, local transaction recommendation selector, and Plaid wallet action hook boundaries are in place, but `WalletPrototype.tsx` still owns profile flows, scanner/manual-card presentation, and final selected-card outcomes from several mutation callbacks.
- Extension popup render evidence now covers five priority merchants with seeded production responses, but full installed-extension smoke still needs a compatible browser harness or manual `chrome://extensions` pass because local Google Chrome CLI automation rejects unpacked extension loading.
- The in-app demo path now shares `/api/recommend-card` with the extension, has automated best-card coverage across the priority merchant matrix, supports direct Use Now demo links, and has a repeatable production screenshot matrix documented in `docs/USE_NOW_EVIDENCE.md`.
- Manual card entry is now production-smoked at both the signed-in API lifecycle and browser UI evidence levels, but it does not import transaction history.
- Manual-only users can safely trigger transaction sync without Plaid credentials or decrypting synthetic manual items; real transaction history still requires a future import/sync path.
- Browser extension can store auth settings, call the auth-aware recommendation API, refresh the active tab from the popup, and uses a narrower merchant/app content-script allowlist, but still needs manual or extension-capable browser smoke evidence across the priority merchant matrix.
- Benefits engine has an authenticated API endpoint and the wallet UI consumes it for signed-in analysis surfaces; component-local fallback logic still supports anonymous/demo sessions.
- Test coverage now protects first-pass wallet analysis, signed-in UI mapping, `/api/wallet/analysis` route behavior, and card-match hints; browser-driven signed-in Plaid smoke is still missing.
- Merchant offers are catalog hints, not issuer-scraped/live offers.
- Transfer partner optimization is not implemented.
- Admin tools are not built.

## Next Best Actions
1. Extract scanner/manual-card presentation state into a focused hook or component boundary so add-card, Plaid match, manual entry, and success-step transitions are testable without rendering the full wallet prototype.
2. Add a true installed-extension smoke path using a browser that permits unpacked extension loading, then verify at least three live merchant tabs through the background refresh flow and popup.
3. Add signed-in extension smoke coverage for `/extension/connect` plus expired-session behavior.
4. Add a browser-driven signed-in Plaid + extension recommendation smoke against production and query `/api/recommendation-events` for evidence.
