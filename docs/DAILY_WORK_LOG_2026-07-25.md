# Daily Work Log - 2026-07-25

## Goal
Move Plaid card-product match persistence behind an authenticated app API.

## Product Reason
Onboarding and Connected Accounts both ask signed-in users to map Plaid credit-card accounts to known card products. Keeping that write behind a server route gives the Plaid sync path an ownership-checked contract before live sandbox smoke coverage expands beyond manual-card setup.

## Changed
- Added `POST /api/wallet/card-matches`.
- Added route coverage in `app/api/wallet/card-matches/route.test.ts`.
- Updated `usePlaidWalletActions.ts` so suggested and manual Plaid match saves call the authenticated app route instead of writing `account_card_matches` directly from the browser.
- Updated `docs/CARD_MATCH_HINTS.md`, `docs/TECH_ARCHITECTURE.md`, `docs/WALLET_DECOMPOSITION.md`, `PROJECT_STATE.md`, and `ROADMAP.md`.

## Implementation Notes
- The route requires a Supabase bearer token through the existing `getAuthenticatedUser()` helper.
- It validates `plaidAccountId` and `cardProductId` before touching Supabase.
- It loads the Plaid account by `id` and authenticated `user_id`, returning `404` for missing or unowned accounts.
- It rejects non-credit-card accounts with `422`.
- It verifies the selected `card_products` row exists before writing a match.
- It normalizes match status to `manual` or `suggested` and clamps confidence to `0..1`.
- It upserts `account_card_matches` on `user_id,plaid_account_id` and returns the saved match plus product metadata for optimistic UI projection.

## Verification
- `npx vitest run app/api/wallet/card-matches/route.test.ts`
- `npx vitest run components/card-reader/usePlaidWalletActions.test.ts app/api/wallet/manual-cards/route.test.ts`
- `npm run lint`
- `npm run test`
- `npm run build`
- Production homepage smoke after deploy.
- Production unauthenticated `POST /api/wallet/card-matches` smoke after deploy.

## Risks
- This adds route-level protection and UI wiring, but it does not yet create a live disposable Plaid sandbox user and accept a real match through production.
- Live signed-in smoke remains blocked until the stale local Supabase service-role credential is refreshed.

## Next Best Action
Refresh the local Supabase service-role credential, rerun `npm run smoke:signed-in-manual-card`, then extend production smoke coverage to Plaid sandbox exchange plus `POST /api/wallet/card-matches` match persistence.
