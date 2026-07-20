# Daily Work Log - 2026-07-20

## Goal
Create repeatable onboarding UI evidence for the extracted add-card and profile access boundaries, and fix any obvious layout issue found by that evidence.

## Product Reason
Manual card entry, Plaid account matching, sign-in, email verification, and profile setup are the first workflows users hit before recommendations become personal. A reproducible visual baseline lets the wallet decomposition continue without accidentally regressing onboarding overlays.

## Changed
- Added `/evidence/onboarding` as a deterministic fixture route for Add Card and profile/auth overlay states.
- Added `scripts/capture-onboarding-evidence.mjs`.
- Added `npm run evidence:onboarding`.
- Captured five onboarding screenshots under `artifacts/onboarding-ui-2026-07-20/`.
- Fixed auth/profile sheet mobile clipping by constraining sheet width against the viewport and letting social sign-in row content shrink.
- Added `docs/ONBOARDING_UI_EVIDENCE.md`.
- Updated `docs/WALLET_DECOMPOSITION.md`.
- Updated `PROJECT_STATE.md`.
- Updated `ROADMAP.md`.

## Implementation Notes
- The evidence route renders the real `AddCardSheet` and `ProfileAccessBoundary` components with deterministic fixture data.
- The route avoids live Supabase, Plaid, and recommendation API calls, so it can run locally or in production without credentials.
- Captured states are signed-in manual card entry, post-Plaid product matching, profile auth entry, email verification, and profile setup.
- The capture script defaults to production and can be pointed at a local production server with `APP_BASE_URL`.
- The capture viewport defaults to `500,980` because Chrome headless desktop cropped a 430px screenshot before the full CSS layout width was visible.

## Verification
- `npm test -- components/profile/ProfileAccessBoundary.test.ts components/card-reader/AddCardSheet.test.ts`
- `npm run lint`
- `npm run build`
- `npm test`
- `APP_BASE_URL=http://localhost:3010 EVIDENCE_DATE=2026-07-20 npm run evidence:onboarding`
- Visual/file sanity check for the five generated PNGs in `artifacts/onboarding-ui-2026-07-20/`
- `vercel --prod --yes`
- `curl -sS -o /tmp/card-reader-home-2026-07-20.html -w '%{http_code} %{url_effective}\n' https://card-reader-xi.vercel.app`
- `curl -sS -o /tmp/card-reader-evidence-auth-2026-07-20.html -w '%{http_code} %{url_effective}\n' 'https://card-reader-xi.vercel.app/evidence/onboarding?state=auth-entry'`
- `POST https://card-reader-xi.vercel.app/api/recommend-card` for Whole Foods returned Amex Gold at 4x

## Risks
- The evidence route is intentionally fixture-backed; it does not prove live Supabase auth, Plaid Link, or signed-in persistence.
- The screenshots are narrow-layout captures, not a full mobile emulation harness.
- `WalletPrototype.tsx` still owns selected-card outcomes from manual-card, Plaid Link, match-save, and account-removal callbacks.

## Next Best Action
Extract final selected-card mutation outcomes from Plaid/manual-card callbacks now that Add Card and profile-access visual baselines exist.
