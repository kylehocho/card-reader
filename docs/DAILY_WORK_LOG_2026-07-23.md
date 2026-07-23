# Daily Work Log - 2026-07-23

## Goal
Add a browser-driven onboarding contract smoke check for the signed-in manual-card, Plaid-match, and wallet selection outcome fixture states.

## Product Reason
The onboarding evidence route is now the baseline for signed-in setup behavior. A repeatable Chrome smoke catches route, rendering, and copy/contract drift before the project adds heavier live Supabase/Plaid automation.

## Changed
- Added `scripts/smoke-onboarding-contract.mjs`.
- Added `npm run smoke:onboarding`.
- Documented the smoke command and 2026-07-23 production run in `docs/ONBOARDING_UI_EVIDENCE.md`.
- Updated `docs/WALLET_DECOMPOSITION.md`, `PROJECT_STATE.md`, and `ROADMAP.md`.

## Implementation Notes
- The smoke uses the same Chrome candidate discovery pattern as the onboarding evidence capture script.
- It runs `/evidence/onboarding` with `state=manual-card`, `state=plaid-match`, and `state=selection-outcomes`.
- It uses Chrome `--dump-dom` after a virtual-time render budget so the production app bundle executes before assertions.
- Optional `SMOKE_DOM_DIR` can archive the rendered DOM for debugging failed assertions.
- The assertions intentionally check user-visible signed-in fixture contract text and selected wallet-card ids, not implementation-only component details.

## Verification
- `npm run smoke:onboarding`

## Risks
- This is a browser-rendered fixture smoke, not a live disposable-user Supabase/Plaid flow. It proves the signed-in onboarding contract remains renderable, but it does not prove auth provider behavior, Plaid Link behavior, or persisted account writes.
- The command depends on a local Chrome/Chromium-compatible browser. CI will need a browser installed or `CHROME_PATH` configured.

## Next Best Action
Add live signed-in Supabase/Plaid smoke coverage that creates or seeds a disposable user, exercises manual-card save or Plaid match persistence, and compares the resulting wallet state against the fixture-backed onboarding outcome contract.
