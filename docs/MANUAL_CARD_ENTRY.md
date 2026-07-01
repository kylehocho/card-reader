# Manual Card Entry

Last updated: 2026-07-01

## Goal
Signed-in users can add a card without Plaid by choosing a known card product from the MVP catalog and entering the last four digits. The saved card uses the same wallet-analysis and recommendation paths as Plaid-linked cards.

## Implementation
- UI: the Add Card sheet exposes a Manual option for signed-in users.
- API: `POST /api/wallet/manual-cards` requires a Supabase bearer token.
- Persistence:
  - Creates or reuses one synthetic `plaid_items` row per user with `status = manual`.
  - Creates or updates a synthetic `plaid_accounts` credit-card row keyed as `manual:<cardProductId>:<last4>`.
  - Creates or updates `account_card_matches` with `match_status = manual`.
- Analysis/recommendations:
  - `GET /api/wallet/analysis` sees the manual account through the existing account/match query.
  - Authenticated `POST /api/recommend-card` includes the matched manual card product because it reads `account_card_matches`.

## API Contract
Request:

```json
{
  "cardProductId": "amex-gold",
  "last4": "9999",
  "label": "Gold personal"
}
```

Success response:

```json
{
  "account": {},
  "match": {},
  "product": {
    "id": "amex-gold",
    "issuer": "American Express",
    "name": "Gold Card"
  }
}
```

Validation:
- `cardProductId` is required and must exist in `card_products`.
- `last4` must contain exactly four digits after stripping non-digits.
- Authentication is required.

## Smoke Test
1. Sign in to the app.
2. Open Add Card.
3. Choose Manual.
4. Select a catalog product and enter four digits.
5. Click Add card.
6. Confirm the wallet shows the manually added card.
7. Open Connected Accounts and confirm the card can be removed.
8. With the same session token, call `POST /api/recommend-card` and confirm recommendations use the manually matched card set.

## Limits
- Manual cards have no transaction history until a later import/sync path exists.
- The synthetic rows intentionally use `plaid_items.status = manual` so Plaid transaction sync ignores them.
- The manual flow only supports products already present in the top-priority card catalog.
