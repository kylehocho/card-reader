# Daily Work Log - 2026-07-21

## Goal
Extract the final selected-card mutation outcome rules from `WalletPrototype.tsx` into the wallet navigation boundary.

## Product Reason
Manual card saves, Plaid Link success, card-product match saves, and connected-account removal all change what card the user sees next. Keeping those transitions deterministic and tested reduces the chance that future onboarding or account-management changes leave the wallet focused on a stale or missing card.

## Changed
- Added selected-card outcome helpers to `components/card-reader/useWalletNavigation.ts`.
- Added `useWalletSelectionOutcomes()` to centralize manual-card, Plaid-link, match-save, and account-removal selection transitions.
- Replaced the inline selected-card mutation callbacks in `components/card-reader/WalletPrototype.tsx` with the new outcome boundary.
- Expanded `components/card-reader/useWalletNavigation.test.ts` coverage for connected-account card ids and removal fallback behavior.
- Updated `docs/WALLET_DECOMPOSITION.md`, `PROJECT_STATE.md`, and `ROADMAP.md`.

## Implementation Notes
- `walletCardIdForConnectedAccount()` preserves the existing `plaid-${accountId}` wallet-card id convention.
- `selectedWalletCardIdAfterConnectedAccountRemoval()` keeps selection unchanged when a non-selected account is removed, moves to the first remaining connected account when the selected account is removed, and falls back to the seed selected card id when the last selected account is removed.
- `useWalletSelectionOutcomes()` keeps persistence and mutation status inside `usePlaidWalletActions.ts`; it only owns post-mutation screen, page, scan-step, and selected-card transitions.
- The manual-card success path still uses the existing add-card success delay before returning to the wallet and resetting manual-card status to `idle`.

## Verification
- `npm test -- components/card-reader/useWalletNavigation.test.ts`
- `npm run lint`
- `npm run build`
- `npm test`

## Risks
- This is a behavior-preserving extraction; it does not add live signed-in Plaid/auth browser evidence.
- Connected-account removal still falls back to the first remaining account by current list order; a future polish pass could prefer the nearest visual wallet-stack neighbor.

## Next Best Action
Add a browser-driven signed-in Plaid/auth smoke or extend the fixture evidence harness to cover selection outcomes after manual-card save, Plaid match save, and account removal.
