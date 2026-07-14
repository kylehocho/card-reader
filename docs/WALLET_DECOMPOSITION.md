# Wallet Decomposition

Last updated: 2026-07-14

## Intent
`components/card-reader/WalletPrototype.tsx` still owns the main smart-wallet workflow, including auth-aware wallet state, Plaid Link, transaction sync, card matching, manual card entry, and Use Now recommendations. The decomposition path is to move stable presentation and view contracts into small components while keeping behavior in the parent until each workflow has enough tests and evidence to justify moving state.

## Current Boundaries
- `UseNowScreen.tsx` renders the in-app merchant recommendation surface. `WalletPrototype.tsx` still owns route parsing, demo merchant selection, API loading, and selected result state.
- `ConnectedAccountsScreen.tsx` renders the signed-in account-management page. Plaid transaction sync, match persistence, and account removal now route through `usePlaidWalletActions.ts`; `WalletPrototype.tsx` still owns navigation outcomes and selected-card state.
- `AccountMatchSuggestionCard.tsx` renders suggested card-product matches and exports shared match-state labels/tones. It is used by both Connected Accounts and the post-Plaid onboarding match step.
- `PendingPlaidMatchCard.tsx` renders each newly linked Plaid account during onboarding, including the account summary, shared suggestion card, card-product selector, save status, and helper text. `WalletPrototype.tsx` still owns the pending account list, card products, suggestion map, and `updateCardMatch()` persistence path.
- `usePlaidAccountMatching.ts` derives the Plaid account-to-card-product suggestion map used by both matching surfaces. `WalletPrototype.tsx` still owns account state and match persistence, but no longer calls `suggestCardProductMatch()` inline.
- `usePersistedPlaidData.ts` owns signed-in Supabase hydration for card products, persisted Plaid credit-card accounts, recent transaction rows, and the row-to-view-model projection used by the wallet. It returns the same state and refresh callback the action hook consumes, so Plaid Link, manual card add, transaction sync, match persistence, and removal flows continue to call one reload path.
- `usePlaidWalletActions.ts` owns the signed-in Plaid/manual-card mutation workflows: manual card saves, Plaid Link token creation/exchange, pending linked accounts, card-match save state, connected-account removal, and transaction sync status. The hook takes parent callbacks for screen transitions, selected-card updates, and wallet card projection so the extraction does not move presentation/navigation responsibilities prematurely.
- `transactionRecommendations.ts` owns the local fallback selector for missed-value transaction recommendations. `WalletPrototype.tsx` still chooses between API-backed wallet analysis and the local fallback, but category inference, reward multiplier lookup, best-card comparison, recommendation formatting, and recommendation de-duplication are now testable without rendering the full wallet shell.
- `types.ts` contains the shared wallet view types needed by multiple card-reader components, starting with `PlaidConnectedAccount` and transaction display rows.

## Transaction Recommendation Contract
The local selector accepts:
- persisted Plaid transaction rows;
- the ordered card-product catalog;
- connected Plaid account view models with optional card-product matches;
- an optional output limit.

It returns display-ready `TransactionRecommendationView` rows by:
- ignoring pending transactions and negative/refund rows;
- inferring a reward category from Plaid merchant, name, category, and personal-finance-category signals;
- using stored reward-rule aliases such as `us_supermarkets` for groceries and `capital_one_travel_flights` for flights;
- treating unmatched accounts as 1x baseline instead of hiding missed-value opportunities;
- filtering out already-optimal transactions where the matched card multiplier equals or beats the best known card;
- formatting amount, date, lift, and reason text for the existing wallet UI.

## Persisted Plaid Data Contract
The persisted data hook accepts:
- an enabled flag for authenticated, profile-ready users;
- the current wallet account sync callback;
- the wallet-analysis refresh callback.

It loads:
- the ordered card-product catalog for manual entry and account matching;
- persisted credit-card Plaid accounts with institution and account-card-match relations;
- the most recent 100 Plaid transactions, grouped into a five-transaction preview per persisted account row.

The pure helpers exported by `usePersistedPlaidData.ts` are intentionally small:
- `groupRecentTransactionsByAccountId()` formats recent transaction preview rows and ignores transactions without a persisted account id.
- `accountFromPersistedRow()` projects Supabase account relations into the shared `PlaidConnectedAccount` view model.
- `accountFromSavedRow()` keeps manual-card and Plaid Link success payloads on the same connected-account shape before the full persisted reload runs.

## Plaid Wallet Action Contract
The action hook accepts:
- the current authenticated user identity;
- the current connected-account list and card-product catalog;
- callbacks for syncing connected-account view models into wallet cards;
- callbacks for persisted Plaid reloads and wallet-analysis refreshes;
- parent-owned UI callbacks for manual-card success, Plaid Link success, card-match success, and account removal.

It owns:
- manual-card save status and error propagation through the shared Plaid error surface;
- pending Plaid Link account rows shown during onboarding;
- per-account match save status and edit-state cleanup;
- per-account removal status and confirmation-sheet cleanup;
- transaction-sync status.

The pure helpers exported by `usePlaidWalletActions.ts` keep workflow transformations testable without rendering the full wallet:
- `buildConnectedAccountsFromPlaidExchange()` prefers saved Supabase account rows when available, falls back to raw Plaid exchange accounts, and filters to credit-card accounts.
- `applyCardProductMatch()` attaches selected card-product metadata to the matching connected-account view model.
- `removeAccountFromList()` and `removeAccountStatus()` keep account removal and match-state cleanup deterministic.

## Account Matching Contract
The shared matching UI accepts:
- a `PlaidConnectedAccount` view model;
- a `CardProductSuggestion` from `suggestCardProductMatch()`;
- the current match save state;
- an accept callback that persists the selected product with source and confidence.

`AccountMatchSuggestionCard` intentionally does not own card-product selection, persistence, or account state. `PendingPlaidMatchCard` owns the onboarding selector presentation, but still delegates all saves to `WalletPrototype.tsx` so onboarding and account-management flows continue to use the same save path.

`usePlaidAccountMatching()` is the current behavior boundary for match suggestions. Its pure `derivePlaidAccountMatchSuggestions()` helper keeps deterministic suggestion indexing testable without rendering the full wallet prototype.

## Edge Cases
- Suggested matches hide when there is no suggestion or the account is already matched to that suggested product.
- The accept button disables while a match save is in progress.
- The onboarding selector disables while saving or while the card catalog is still loading.
- Status tones remain shared so `Saving`, `Saved`, `Sync issue`, `Suggested`, `Synced`, and `Unassigned` render consistently across surfaces.
- Accounts that cannot be confidently matched still remain present in the suggestion map with a `null` value so both matching surfaces can distinguish "loaded but no suggestion" from "account missing."
- Persisted transaction previews cap at five rows per account and ignore transactions with no persisted `plaid_account_id`, preventing unowned or accountless transaction rows from appearing on account cards.
- Persisted account projection falls back to `Plaid Sandbox`, mask `0000`, subtype `account`, and null match metadata when optional relations are absent.
- Plaid Link exchange projection filters out checking, savings, loan, and other non-credit-card accounts before the onboarding match step.
- Manual card saves and Plaid Link success still refresh persisted Plaid data and wallet analysis after optimistic account projection.
- Removing a selected connected account falls back to the next connected account when available, otherwise the seed demo card.
- Local transaction recommendations still surface for unmatched persisted accounts as long as a catalog card can beat the 1x baseline.
- Pending, refund, and already-optimal transactions do not create local missed-value recommendations.

## Verification
- `npm test -- components/card-reader/usePlaidWalletActions.test.ts`
- `npm test -- components/card-reader/usePlaidWalletActions.test.ts components/card-reader/usePersistedPlaidData.test.ts components/card-reader/usePlaidAccountMatching.test.ts`
- `npm test -- components/card-reader/transactionRecommendations.test.ts`
- `npm test -- components/card-reader/usePersistedPlaidData.test.ts`
- `npm run lint`
- `npm test`
- `npm run build`

## Next Extraction Candidates
1. Extract merchant recommendation loading and Use Now route-state effects into a focused hook so `/api/recommend-card` loading can be tested outside the full wallet shell.
2. Extract shared account summary formatting if Connected Accounts and onboarding diverge less after the workflow-hook boundary lands.
3. Move shared wallet view types into smaller domain files if `types.ts` grows beyond account/card-reader view contracts.
