# Card Match Hints

Last updated: 2026-07-26

## Intent
Plaid account names are often close to the underlying product name. Card Reader should use that signal to reduce manual matching friction without silently writing an uncertain match.

## Behavior
- `lib/cards/card-match-hints.ts` scores a linked account against the loaded `card_products` catalog.
- Known product aliases handle common shorthand such as `CSR`, `CSP`, `Amex Gold`, `Venture X`, `Freedom Flex`, and `Discover it`.
- Generic token overlap covers product names when an explicit alias is not present.
- Issuer signal helps confidence but cannot create a suggestion by itself.
- The UI shows a suggested match in the post-Link match sheet and Connected Accounts.
- Choosing `Use` saves the match through `POST /api/wallet/card-matches` with `match_status = suggested` and the computed confidence.
- Dropdown saves use the same authenticated route with `match_status = manual` and `match_confidence = 1`.

## Guardrails
- No automatic database write occurs from a hint.
- The browser no longer writes `account_card_matches` directly. The server route verifies the Supabase bearer token, checks that the Plaid account belongs to the authenticated user, rejects non-credit-card accounts, and validates the selected card product before upserting the match.
- Issuer-only signals are ignored, so an account named only `Credit Card` from American Express does not guess Gold or Platinum.
- Hints are hidden if the account is already matched to the suggested product.

## Verification
- `lib/cards/card-match-hints.test.ts` covers alias matches, issuer-only non-matches, and token-overlap fallback.
- `app/api/wallet/card-matches/route.test.ts` covers auth, required ids, account ownership, credit-card-only matching, product lookup, suggested match persistence, and status/confidence normalization.
- `npm run smoke:signed-in-plaid-card-match` covers the intended production contract for a disposable signed-in user: Plaid sandbox exchange, imported account match through `POST /api/wallet/card-matches`, transaction sync, and wallet-analysis visibility. The first 2026-07-26 production attempt is blocked by the known stale local Supabase service-role credential.
- The full suite includes route, analysis, mapper, and hint coverage through `npm test`.
