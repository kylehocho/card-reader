# Wallet Decomposition

Last updated: 2026-07-20

## Intent
`components/card-reader/WalletPrototype.tsx` still owns the main smart-wallet workflow, including auth-aware wallet state, Plaid Link, transaction sync, card matching, manual card entry, and Use Now recommendations. The decomposition path is to move stable presentation and view contracts into small components while keeping behavior in the parent until each workflow has enough tests and evidence to justify moving state.

## Current Boundaries
- `UseNowScreen.tsx` renders the in-app merchant recommendation surface. `useMerchantRecommendation.ts` owns route parsing, demo merchant selection, `/api/recommend-card` loading state, live result projection, seeded fallback filtering, and full-screen Use Now deep-link URL updates.
- `ConnectedAccountsScreen.tsx` renders the signed-in account-management page. Plaid transaction sync, match persistence, and account removal now route through `usePlaidWalletActions.ts`; `WalletPrototype.tsx` still owns navigation outcomes and selected-card state.
- `AccountMatchSuggestionCard.tsx` renders suggested card-product matches and exports shared match-state labels/tones. It is used by both Connected Accounts and the post-Plaid onboarding match step.
- `PendingPlaidMatchCard.tsx` renders each newly linked Plaid account during onboarding, including the account summary, shared suggestion card, card-product selector, save status, and helper text. `WalletPrototype.tsx` still owns the pending account list, card products, suggestion map, and `updateCardMatch()` persistence path.
- `usePlaidAccountMatching.ts` derives the Plaid account-to-card-product suggestion map used by both matching surfaces. `WalletPrototype.tsx` still owns account state and match persistence, but no longer calls `suggestCardProductMatch()` inline.
- `usePersistedPlaidData.ts` owns signed-in Supabase hydration for card products, persisted Plaid credit-card accounts, recent transaction rows, and the row-to-view-model projection used by the wallet. It returns the same state and refresh callback the action hook consumes, so Plaid Link, manual card add, transaction sync, match persistence, and removal flows continue to call one reload path.
- `usePlaidWalletActions.ts` owns the signed-in Plaid/manual-card mutation workflows: manual card saves, Plaid Link token creation/exchange, pending linked accounts, card-match save state, connected-account removal, and transaction sync status. The hook takes parent callbacks for screen transitions, selected-card updates, and wallet card projection so the extraction does not move presentation/navigation responsibilities prematurely.
- `useAddCardPresentation.ts` owns the add-card sheet presentation state: sheet visibility, current scan/manual/Plaid/match/success step, manual card draft values, manual card-product selector state, last-four sanitization, and the shared success-then-close transition. Persistence, wallet card creation, Plaid Link, and navigation callbacks stay in `WalletPrototype.tsx` and `usePlaidWalletActions.ts`.
- `AddCardSheet.tsx` renders the add-card modal for Plaid connect, post-Plaid matching, anonymous mock scan, and manual card entry. `WalletPrototype.tsx` now passes state and callbacks into the sheet instead of owning the full modal JSX, while still owning auth gates, anonymous demo-card creation, signed-in manual-card persistence, Plaid Link wiring, and navigation outcomes.
- `ProfileAccessBoundary.tsx` renders the profile entry, email verification, and profile setup overlays as one access boundary. `WalletPrototype.tsx` still owns auth/profile state and sign-in callbacks, but no longer composes each auth sheet inline.
- `/evidence/onboarding` renders deterministic Add Card and profile/auth fixture states for visual baseline captures. The current evidence matrix is documented in `docs/ONBOARDING_UI_EVIDENCE.md`.
- `useWalletNavigation.ts` owns the top-level wallet navigation state that is independent from persistence: selected card id, current screen, wallet page index, stack expansion, selected-card fallback, page shifting, reset-to-wallet behavior, and the non-selected card stack plus add-card action.
- `transactionRecommendations.ts` owns the local fallback selector for missed-value transaction recommendations. `WalletPrototype.tsx` still chooses between API-backed wallet analysis and the local fallback, but category inference, reward multiplier lookup, best-card comparison, recommendation formatting, and recommendation de-duplication are now testable without rendering the full wallet shell.
- `types.ts` contains the shared wallet view types needed by multiple card-reader components, starting with `PlaidConnectedAccount` and transaction display rows.

## Wallet Navigation Contract
The navigation hook accepts:
- the current visible wallet cards;
- the empty-wallet card used for signed-in users with no linked accounts;
- the global fallback seed card;
- the initial selected card id;
- the empty-wallet flag.

It owns:
- selected card id and selected-card fallback resolution;
- current screen;
- wallet page index and clamped left/right page shifts;
- wallet stack expansion state;
- the derived wallet stack that omits the currently selected card and appends the add-card action;
- reset-to-wallet behavior used by sign-out and similar cleanup paths.

The pure helpers exported by `useWalletNavigation.ts` keep the behavior testable without rendering the wallet shell:
- `resolveSelectedWalletCard()` picks the selected visible card, empty-wallet placeholder, first visible card, or fallback seed card in that order.
- `shiftWalletPageIndex()` clamps page shifts to the available wallet page bounds.
- `buildWalletStackItems()` returns non-selected visible cards plus the add-card action, or only the add-card action for an empty signed-in wallet.

## Merchant Recommendation Contract
The merchant recommendation hook accepts:
- the signed-in/user-backed wallet flag;
- the seed merchant result matrix used as local fallback copy;
- parent callbacks for screen state, compact search visibility, and wallet stack expansion.

It owns:
- initial route parsing for `?screen=use-now&merchant=...` and compact wallet search routes;
- demo merchant open behavior, including canonical Use Now search-param updates;
- live `/api/recommend-card` fetch state with optional Supabase bearer auth for user-backed wallets;
- live API recommendation projection into the `MerchantResult` contract consumed by the wallet overlay and `UseNowScreen`;
- seeded fallback result filtering and rank merging when live and local results overlap.

The pure helpers exported by `useMerchantRecommendation.ts` keep the behavior testable without rendering the wallet shell:
- `merchantApiRecommendationToResult()` maps API responses into display-ready Use Now cards.
- `merchantResultsForQuery()` filters local seeded results, keeps live recommendations first, and bumps fallback ranks after the live result.

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

## Add-Card Presentation Contract
The add-card presentation hook owns:
- whether the add-card sheet is visible;
- the active add-card step (`camera`, `manual`, `plaid`, `match`, or `success`);
- anonymous/manual card draft fields;
- the signed-in manual card-product selector value;
- open, close, and success-close transitions used by manual-card and Plaid outcomes.

`AddCardSheet.tsx` renders:
- the step chooser for Plaid/manual/camera modes;
- the anonymous business/personal toggle;
- the Plaid sandbox connect state and existing linked-account preview;
- the post-Plaid card-product matching list through `PendingPlaidMatchCard`;
- the signed-in catalog-backed manual-card selector;
- the anonymous manual issuer/name form;
- last-four input, preview card, save/error states, and success copy.

`WalletPrototype.tsx` still decides when a user is allowed into the sheet, which step to open first, how anonymous demo cards are created, how signed-in manual cards are saved, how Plaid Link is opened, and which app screen to show after success. This keeps auth, persistence, and navigation concerns outside the presentation hook/component pair.

The pure helpers exported by the add-card boundary keep behavior testable without rendering the wallet shell:
- `defaultManualCardDraft` preserves the existing anonymous demo defaults.
- `normalizeManualCardLast4()` strips non-digits and caps the manual last-four input at four digits.
- `addCardSheetTitle()` maps each add-card step to its modal title.
- `canSubmitManualCard()` keeps signed-in manual saves disabled until the card catalog, selected product, and four-digit last-four are available while preserving anonymous demo-card entry.

## Profile Access Contract
The profile access boundary accepts:
- current auth flow and auth status;
- the email draft and current user identity;
- parent-owned callbacks for auth-flow changes, email draft changes, provider sign-in, email submit/confirmation, and profile setup.

It renders:
- `AuthEntrySheet` when the user is choosing Apple, Google, or email entry;
- `EmailAuthFlow` for email collection and prototype verification;
- `ProfileSetupFlow` for the required first-name/display-name and notification preference step.

`WalletPrototype.tsx` still decides when auth is required before Plaid/manual-card entry, profile screen navigation, or connected-account management. Keeping those workflow gates in the parent avoids mixing wallet navigation and persistence rules into the auth sheet renderer.

The pure helpers exported by `ProfileAccessBoundary.tsx` keep the small auth routing rules testable:
- `emailAuthMode()` maps the current auth flow to the email sheet's email/verify mode.
- `emailAuthBackFlow()` keeps email back navigation returning from verification to email entry, and from email entry to the profile entry sheet.

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
- Manual card last-four input strips non-digits and caps at four characters before the draft reaches either the anonymous demo-card creator or the signed-in manual-card API path.
- Add-card success transitions close the sheet after the same short delay for anonymous manual cards and signed-in manual-card saves.
- Add-card sheet rendering remains behavior-neutral: the extracted component receives the existing Plaid/manual callbacks instead of creating its own persistence or navigation state.
- Profile access rendering remains behavior-neutral: the extracted boundary receives existing auth callbacks and keeps wallet workflow gates in `WalletPrototype.tsx`.
- Auth/profile sheet containers cap to the viewport and social sign-in row content can shrink, preventing right-edge clipping in narrow evidence captures.
- Clearing the merchant query resets live recommendation status to `idle` at the query boundary, avoiding stale loading/error states in both Use Now surfaces.
- Live merchant results de-duplicate only the same merchant/card pair, so alternate seeded cards for the same merchant remain visible as ranked fallbacks.
- Selected-card fallback prefers the signed-in empty-wallet placeholder only when there are no visible user cards; otherwise missing selected ids fall back to the first visible card before the seed fallback.
- Wallet page swipes clamp at the first and last wallet pages so a drag cannot move the details panel out of range.
- The wallet stack excludes the currently selected card and always leaves an add-card action; an empty signed-in wallet shows only the add-card action.

## Verification
- `npm test -- components/profile/ProfileAccessBoundary.test.ts components/card-reader/AddCardSheet.test.ts components/card-reader/useAddCardPresentation.test.ts`
- `APP_BASE_URL=http://localhost:3010 EVIDENCE_DATE=2026-07-20 npm run evidence:onboarding`
- `npm test -- components/card-reader/AddCardSheet.test.ts components/card-reader/useAddCardPresentation.test.ts`
- `npm test -- components/card-reader/useAddCardPresentation.test.ts`
- `npm test -- components/card-reader/useAddCardPresentation.test.ts components/card-reader/useWalletNavigation.test.ts components/card-reader/usePlaidWalletActions.test.ts`
- `npm test -- components/card-reader/useWalletNavigation.test.ts`
- `npm test -- components/card-reader/useWalletNavigation.test.ts components/card-reader/useMerchantRecommendation.test.ts components/card-reader/usePlaidWalletActions.test.ts`
- `npm test -- components/card-reader/useMerchantRecommendation.test.ts lib/recommendation/use-now-route-state.test.ts`
- `npm test -- components/card-reader/usePlaidWalletActions.test.ts`
- `npm test -- components/card-reader/usePlaidWalletActions.test.ts components/card-reader/usePersistedPlaidData.test.ts components/card-reader/usePlaidAccountMatching.test.ts`
- `npm test -- components/card-reader/transactionRecommendations.test.ts`
- `npm test -- components/card-reader/usePersistedPlaidData.test.ts`
- `npm run lint`
- `npm test`
- `npm run build`

## Next Extraction Candidates
1. Extract final selected-card outcomes from Plaid/manual-card mutation callbacks now that Add Card and profile-access visual baselines exist.
2. Expand the evidence harness or add a browser-driven test when the project needs live signed-in Plaid/auth proof instead of fixture screenshots.
3. Move shared wallet view types into smaller domain files if `types.ts` grows beyond account/card-reader view contracts.
