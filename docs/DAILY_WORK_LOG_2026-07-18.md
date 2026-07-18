# Daily Work Log - 2026-07-18

## Goal
Continue the wallet decomposition by extracting add-card sheet rendering into a focused component.

## Product Reason
Adding a card is a core onboarding path for both Plaid-backed users and manual-only users. The modal UI was still embedded in the full wallet shell, which made future Plaid, manual-entry, and signed-in matching changes harder to reason about without touching the entire prototype.

## Changed
- Added `components/card-reader/AddCardSheet.tsx`.
- Added `components/card-reader/AddCardSheet.test.ts`.
- Updated `components/card-reader/WalletPrototype.tsx` to render `AddCardSheet` and pass existing state/actions as props.
- Updated `docs/WALLET_DECOMPOSITION.md`.
- Updated `PROJECT_STATE.md`.
- Updated `ROADMAP.md`.

## Implementation Notes
- `AddCardSheet` renders the existing Plaid connect, post-Plaid match, anonymous mock scan, manual card entry, preview, save/error, and success states.
- `WalletPrototype.tsx` still owns auth gates, anonymous demo-card creation, signed-in manual-card persistence, Plaid Link script wiring, selected-card updates, and screen transitions.
- The manual-card submit guard moved into `canSubmitManualCard()` so signed-in saves still require a loaded catalog, selected product, and four-digit last four while anonymous demo cards stay lightweight.
- The modal title mapping moved into `addCardSheetTitle()` so scan-step copy is covered without rendering the full wallet shell.

## Verification
- `npm test -- components/card-reader/AddCardSheet.test.ts components/card-reader/useAddCardPresentation.test.ts` - 2 files passed, 5 tests passed.
- `npm run lint`
- `npm test` - 20 files passed, 78 tests passed.
- `npm run build`
- `vercel --prod --yes`
- `curl -sS -o /tmp/card-reader-home-2026-07-18.html -w '%{http_code} %{url_effective}\n' https://card-reader-xi.vercel.app`
- `POST https://card-reader-xi.vercel.app/api/recommend-card` for Whole Foods

## Risks
- This was intended as a behavior-neutral decomposition slice; no browser screenshot evidence was captured before deploy.
- The add-card UI now has focused helper coverage, but it does not have component-rendering tests because the repo does not currently use a React DOM test harness.
- `WalletPrototype.tsx` still owns final selected-card outcomes and profile/auth sheet rendering.

## Next Best Action
Capture focused UI evidence for the extracted AddCardSheet states, especially signed-in manual entry and post-Plaid matching, so future profile-flow and final outcome extractions have a visual baseline.
