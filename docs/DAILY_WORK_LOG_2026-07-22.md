# Daily Work Log - 2026-07-22

## Goal
Extend onboarding evidence coverage to the signed-in wallet selection outcomes created by manual-card saves, Plaid Link success, card-product match saves, and connected-account removal.

## Product Reason
Signed-in onboarding only feels reliable if the wallet lands on the expected card after each setup action. Fixture-backed evidence plus pure helper coverage makes those transitions inspectable before adding heavier live Plaid/auth browser automation.

## Changed
- Added `buildWalletSelectionOutcomeSummary()` to `components/card-reader/useWalletNavigation.ts`.
- Expanded `components/card-reader/useWalletNavigation.test.ts` to cover the full signed-in outcome summary used by evidence fixtures.
- Added the `selection-outcomes` state to `/evidence/onboarding`.
- Updated `scripts/capture-onboarding-evidence.mjs` so `npm run evidence:onboarding` captures the new state.
- Captured the 2026-07-22 onboarding evidence matrix under `artifacts/onboarding-ui-2026-07-22/`.
- Updated `docs/ONBOARDING_UI_EVIDENCE.md`, `docs/WALLET_DECOMPOSITION.md`, `PROJECT_STATE.md`, and `ROADMAP.md`.

## Implementation Notes
- The outcome summary intentionally mirrors `useWalletSelectionOutcomes()` without taking over persistence or mutation status ownership.
- Manual-card save selects the connected-account wallet card id and records the return-to-wallet/manual-status reset outcome.
- Plaid Link success selects the first newly linked credit-card account, resets the wallet page index to `0`, and moves the add-card flow to `match`.
- Card-product match save selects the matched connected account.
- Connected-account removal uses the existing selected-removal helper to choose the next remaining account or the seed fallback.
- The selection-outcomes evidence state uses its own clean viewport so long connected-account ids and outcome metadata do not overlap the generic onboarding baseline copy.

## Verification
- `npm test -- components/card-reader/useWalletNavigation.test.ts`
- `npm run lint`
- `npm run build`
- `npm test`
- `APP_BASE_URL=http://localhost:3010 EVIDENCE_DATE=2026-07-22 npm run evidence:onboarding`
- Visual inspection of `artifacts/onboarding-ui-2026-07-22/selection-outcomes.png`

## Risks
- This is deterministic fixture evidence, not a live Supabase/Plaid browser smoke. It proves the state contract and visual baseline, but it does not prove Plaid Link or auth provider behavior in production.
- The outcome summary needs to stay aligned with `useWalletSelectionOutcomes()` if future callbacks gain additional side effects.

## Next Best Action
Add browser-driven signed-in Plaid/auth smoke coverage that creates or seeds a signed-in user, exercises manual-card save or Plaid match flows, and compares the resulting wallet state against the fixture-backed outcome contract.
