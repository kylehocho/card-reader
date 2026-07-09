# Wallet Decomposition

Last updated: 2026-07-09

## Intent
`components/card-reader/WalletPrototype.tsx` still owns the main smart-wallet workflow, including auth-aware wallet state, Plaid Link, transaction sync, card matching, manual card entry, and Use Now recommendations. The decomposition path is to move stable presentation and view contracts into small components while keeping behavior in the parent until each workflow has enough tests and evidence to justify moving state.

## Current Boundaries
- `UseNowScreen.tsx` renders the in-app merchant recommendation surface. `WalletPrototype.tsx` still owns route parsing, demo merchant selection, API loading, and selected result state.
- `ConnectedAccountsScreen.tsx` renders the signed-in account-management page. `WalletPrototype.tsx` still owns Plaid account loading, Link, transaction sync, match persistence, and account removal.
- `AccountMatchSuggestionCard.tsx` renders suggested card-product matches and exports shared match-state labels/tones. It is used by both Connected Accounts and the post-Plaid onboarding match step.
- `types.ts` contains the shared wallet view types needed by multiple card-reader components, starting with `PlaidConnectedAccount` and transaction display rows.

## Account Matching Contract
The shared matching UI accepts:
- a `PlaidConnectedAccount` view model;
- a `CardProductSuggestion` from `suggestCardProductMatch()`;
- the current match save state;
- an accept callback that persists the selected product with source and confidence.

The component intentionally does not own card-product selection, persistence, or account state. Those remain in `WalletPrototype.tsx` so both onboarding and account-management flows continue to use the same save path.

## Edge Cases
- Suggested matches hide when there is no suggestion or the account is already matched to that suggested product.
- The accept button disables while a match save is in progress.
- Status tones remain shared so `Saving`, `Saved`, `Sync issue`, `Suggested`, `Synced`, and `Unassigned` render consistently across surfaces.

## Verification
- `npm run lint`
- `npm test`
- `npm run build`

## Next Extraction Candidates
1. Move the post-Plaid onboarding match account card into a reusable component that wraps `AccountMatchSuggestionCard` and the card-product selector.
2. Move Plaid account state derivation and match suggestion mapping into a local hook once the visual account-card contract is stable.
3. Move shared wallet view types into smaller domain files if `types.ts` grows beyond account/card-reader view contracts.
