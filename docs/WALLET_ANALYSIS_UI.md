# Wallet Analysis UI Integration

Last updated: 2026-06-29

## Intent
Signed-in wallet surfaces should render from the same shared analysis contract used by backend and future extension clients. This keeps benefit trackers, welcome bonuses, alerts, and missed-value recommendations consistent across app surfaces.

## User Workflow
1. User signs in and completes profile setup.
2. User links Plaid sandbox accounts.
3. User matches each Plaid account to a card product.
4. User syncs transactions.
5. Wallet home refreshes `/api/wallet/analysis` and renders:
   - selected-card benefit trackers from `analysis.trackers`
   - welcome bonus carousel from `analysis.welcomeBonuses`
   - recommendation summary and Opportunities list from `analysis.recommendations`
   - signed-in alert cards from `analysis.alerts`

Anonymous/local prototype sessions still use seed data so UI iteration remains easy without Supabase.

## Client Behavior
`components/card-reader/WalletPrototype.tsx` owns the client fetch lifecycle:
- it requests `/api/wallet/analysis` with the Supabase bearer token once auth/profile state is ready
- it resets analysis state when the user signs out
- it refreshes analysis after account-card match saves
- it refreshes analysis after Plaid transaction sync
- it falls back to component-local transaction recommendation logic when API analysis is not available

The Plaid status strip also exposes analysis refresh state:
- loading: benefit trackers and recommendations are refreshing
- error: API refresh failed, with the error message shown in the wallet
- ready: normal connected account summary

## Data Dependencies
- `card_products.rewards` and `card_products.benefits`
- `plaid_accounts`
- `plaid_transactions`
- `account_card_matches`
- Supabase Auth bearer token

## Edge Cases
- Signed-in user with no linked cards: no seed cards or seed bonuses are shown.
- Linked card with no match: the wallet card remains visible, but API trackers are empty until a card product is assigned.
- Analysis API error: the wallet preserves connected-account UI and shows the refresh error instead of silently returning to seed data.
- Anonymous demo: seed cards, benefits, alerts, and recommendations remain unchanged.

## Verification
- `npm test`
- `npm run lint`
- `npm run build`

## Next Best Action
Add API route tests for `/api/wallet/analysis` auth, error, and response-shape behavior, then run a browser-driven signed-in Plaid smoke against production.
