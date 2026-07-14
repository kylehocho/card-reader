# Daily Work Log - 2026-07-14

## Goal
Continue the wallet decomposition by extracting signed-in Plaid/manual-card mutation workflows into a focused hook.

## Product Reason
Onboarding and Plaid sync remain the highest-priority product stack item. The wallet now has several smaller read/render boundaries, but the write paths for manual card add, Plaid Link, card matching, account removal, and transaction sync still lived inside the full wallet shell. Moving those workflows into a tested action hook makes the core signed-in account-management path easier to reason about and safer to extend.

## Changed
- Added `components/card-reader/usePlaidWalletActions.ts`.
- Added `components/card-reader/usePlaidWalletActions.test.ts`.
- Updated `components/card-reader/WalletPrototype.tsx` to consume the action hook while keeping screen navigation and selected-card outcomes in the parent.
- Updated `components/card-reader/usePersistedPlaidData.ts` with optional Plaid status/error bridge callbacks for future action/data coordination.
- Updated `docs/WALLET_DECOMPOSITION.md`.
- Updated `PROJECT_STATE.md`.

## Implementation Notes
- `usePlaidWalletActions()` owns manual-card save status, pending linked Plaid accounts, per-account match save status, match edit cleanup, account removal state, transaction-sync status, and shared Plaid error propagation.
- `WalletPrototype.tsx` now passes callbacks for manual-card success, Plaid Link success, card-match success, and connected-account removal so the hook does not own screen transitions or selected-card fallback decisions.
- Plaid Link exchange projection moved behind `buildConnectedAccountsFromPlaidExchange()`, which prefers persisted Supabase account rows when present and filters raw exchange accounts to credit-card accounts.
- Card-match and account-removal transformations moved into pure helpers so account metadata updates and status cleanup have focused coverage.
- The anonymous/demo manual card add path remains in `WalletPrototype.tsx`; signed-in manual card persistence now routes through the action hook.

## Verification
- `npm test -- components/card-reader/usePlaidWalletActions.test.ts` - 1 file passed, 4 tests passed.
- `npm test -- components/card-reader/usePlaidWalletActions.test.ts components/card-reader/usePersistedPlaidData.test.ts components/card-reader/usePlaidAccountMatching.test.ts` - 3 files passed, 10 tests passed.
- `npm run lint`
- `npm test` - 16 files passed, 63 tests passed.
- `npm run build`

## Risks
- No browser screenshot evidence was captured because this is intended as a behavior-neutral decomposition slice.
- Plaid Link itself still needs a real signed-in browser smoke with sandbox credentials to prove the external modal flow after the extraction.
- `WalletPrototype.tsx` still owns merchant recommendation loading, Use Now route effects, profile/navigation state, and selected-card fallback logic.

## Next Best Action
Extract merchant recommendation loading and Use Now route-state effects into a focused hook so `/api/recommend-card` loading and error states can be tested without rendering the full wallet prototype.
