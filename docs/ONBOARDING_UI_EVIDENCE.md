# Onboarding UI Evidence

Last updated: 2026-07-20

## Intent
The add-card and profile access boundaries are now extracted from `WalletPrototype.tsx`, but future state and callback extractions still need a visual baseline. This evidence route and capture command make the core onboarding overlays reproducible without requiring live Supabase auth, Plaid Link, or manual browser setup.

## Evidence Route
- Route: `/evidence/onboarding`
- Query parameter: `state`
- Supported states:
  - `manual-card` - signed-in manual card entry with a selected top-priority catalog product.
  - `plaid-match` - post-Plaid card-product matching with a suggested Amex Gold match.
  - `auth-entry` - profile sign-in entry sheet.
  - `email-verify` - email verification sheet.
  - `profile-setup` - first profile setup sheet.

The route uses deterministic fixture data and renders the production components directly:
- `components/card-reader/AddCardSheet.tsx`
- `components/profile/ProfileAccessBoundary.tsx`
- `components/auth/AuthEntrySheet.tsx`
- `components/auth/EmailAuthFlow.tsx`
- `components/auth/ProfileSetupFlow.tsx`

## Capture Command
```bash
npm run evidence:onboarding
```

By default the command captures production at `https://card-reader-xi.vercel.app` into `artifacts/onboarding-ui-YYYY-MM-DD/`.

Useful overrides:
```bash
APP_BASE_URL=http://localhost:3010 EVIDENCE_DATE=2026-07-20 npm run evidence:onboarding
EVIDENCE_VIEWPORT=500,980 npm run evidence:onboarding
```

The command requires a local Chrome/Chromium-compatible browser. Set `CHROME_PATH` if the default browser candidates do not match the machine.

## 2026-07-20 Evidence Set
Captured against a local production build at `http://localhost:3010` with a `500,980` viewport.

Artifacts:
- `artifacts/onboarding-ui-2026-07-20/manual-card.png`
- `artifacts/onboarding-ui-2026-07-20/plaid-match.png`
- `artifacts/onboarding-ui-2026-07-20/auth-entry.png`
- `artifacts/onboarding-ui-2026-07-20/email-verify.png`
- `artifacts/onboarding-ui-2026-07-20/profile-setup.png`

## Implementation Notes
- The evidence page intentionally does not call Supabase, Plaid, or recommendation APIs.
- The Add Card states pass fixture card products, a pending Plaid account, and a match suggestion into the real component props.
- The profile states pass fixture auth flow and identity data into `ProfileAccessBoundary`.
- The capture script uses Chrome headless with a forced device scale factor and a 500px default width. A 430px screenshot in headless desktop Chrome cropped the layout due to the browser's effective layout viewport, so the default captures the full narrow layout instead of producing misleading right-edge crops.

## UI Fix Captured
The first auth-entry capture surfaced horizontal clipping in the auth/profile sheets. The fix constrains the modal containers to `calc(100vw - 1.5rem)` and lets social sign-in button internals shrink at narrow widths.

Touched components:
- `components/auth/AuthEntrySheet.tsx`
- `components/auth/EmailAuthFlow.tsx`
- `components/auth/ProfileSetupFlow.tsx`

## Next Best Action
Use these screenshots as the visual baseline before extracting final selected-card outcomes from Plaid/manual-card mutation callbacks in `WalletPrototype.tsx`.
