# Onboarding UI Evidence

Last updated: 2026-07-29

## Intent
The add-card and profile access boundaries are now extracted from `WalletPrototype.tsx`, but future state and callback extractions still need a visual baseline. This evidence route and capture command make the core onboarding overlays reproducible without requiring live Supabase auth, Plaid Link, or manual browser setup.

## Evidence Route
- Route: `/evidence/onboarding`
- Query parameter: `state`
- Supported states:
  - `manual-card` - signed-in manual card entry with a selected top-priority catalog product.
  - `plaid-match` - post-Plaid card-product matching with a suggested Amex Gold match.
  - `plaid-no-credit` - Plaid exchange recovery state when the linked item has no credit-card accounts.
  - `plaid-duplicate` - Plaid exchange recovery state when the linked credit card is already active in the wallet.
  - `selection-outcomes` - signed-in selection outcomes after manual-card save, Plaid Link success, card-match save, and connected-account removal.
  - `auth-entry` - profile sign-in entry sheet.
  - `email-verify` - email verification sheet.
  - `profile-setup` - first profile setup sheet.

The route uses deterministic fixture data and renders the production components directly:
- `components/card-reader/AddCardSheet.tsx`
- `components/profile/ProfileAccessBoundary.tsx`
- `components/auth/AuthEntrySheet.tsx`
- `components/auth/EmailAuthFlow.tsx`
- `components/auth/ProfileSetupFlow.tsx`
- `components/card-reader/useWalletNavigation.ts`

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

## Browser Contract Smoke
```bash
npm run smoke:onboarding
```

The smoke command runs Chrome headless against `/evidence/onboarding`, lets the production app bundle render, dumps the DOM, and asserts the signed-in fixture contract for:
- manual card entry;
- post-Plaid card-product matching;
- Plaid no-credit-card recovery guidance;
- Plaid duplicate-card recovery guidance;
- wallet selection outcomes after manual-card save, Plaid Link success, card-match save, and connected-account removal.

By default it checks production at `https://card-reader-xi.vercel.app`. Useful overrides:
```bash
APP_BASE_URL=http://localhost:3010 npm run smoke:onboarding
SMOKE_DOM_DIR=artifacts/onboarding-smoke-dom npm run smoke:onboarding
```

The command is intentionally a lightweight browser smoke, not a replacement for future live Supabase/Plaid automation. It prevents UI copy, routing, or fixture drift from breaking the signed-in onboarding outcome baseline while keeping the daily verification path repeatable.

## Signed-In Manual Card Smoke
Run the dependency preflight first:

```bash
npm run smoke:signed-in-preflight
```

For a manual-card-only credential check that skips Plaid:

```bash
SMOKE_PREFLIGHT_SKIP_PLAID=true npm run smoke:signed-in-preflight
```

Then run the live manual-card workflow:

```bash
npm run smoke:signed-in-manual-card
```

The signed-in smoke creates a disposable confirmed Supabase user, signs in with the public auth API, saves an Amex Gold manual card through `POST /api/wallet/manual-cards`, verifies `GET /api/wallet/analysis` sees exactly one linked and matched account, verifies manual-only `POST /api/plaid/sync-transactions` returns a zero-item result without touching Plaid credentials, and verifies authenticated `POST /api/recommend-card` recommends that owned card for Whole Foods.

By default both commands run against production at `https://card-reader-xi.vercel.app` and load Supabase credentials from `.env.local`, `.env`, or `.env.vercel.production.local` when present. The preflight also validates Plaid sandbox credentials unless `SMOKE_PREFLIGHT_SKIP_PLAID=true` is set. Useful overrides:
```bash
APP_BASE_URL=http://localhost:3010 npm run smoke:signed-in-manual-card
SMOKE_CARD_PRODUCT_ID=amex-gold SMOKE_CARD_LAST4=3007 npm run smoke:signed-in-manual-card
SMOKE_KEEP_USER=true npm run smoke:signed-in-manual-card
```

The command prints only IDs and smoke-result metadata. It never prints Supabase service-role keys, anon keys, bearer tokens, Plaid secrets, or token material. It deletes the disposable Supabase user at the end unless `SMOKE_KEEP_USER=true` is set for debugging.

## 2026-07-20 Evidence Set
Captured against a local production build at `http://localhost:3010` with a `500,980` viewport.

Artifacts:
- `artifacts/onboarding-ui-2026-07-20/manual-card.png`
- `artifacts/onboarding-ui-2026-07-20/plaid-match.png`
- `artifacts/onboarding-ui-2026-07-20/auth-entry.png`
- `artifacts/onboarding-ui-2026-07-20/email-verify.png`
- `artifacts/onboarding-ui-2026-07-20/profile-setup.png`

## 2026-07-22 Evidence Set
Captured against a local production build at `http://localhost:3010` with a `500,980` viewport.

Artifacts:
- `artifacts/onboarding-ui-2026-07-22/manual-card.png`
- `artifacts/onboarding-ui-2026-07-22/plaid-match.png`
- `artifacts/onboarding-ui-2026-07-22/selection-outcomes.png`
- `artifacts/onboarding-ui-2026-07-22/auth-entry.png`
- `artifacts/onboarding-ui-2026-07-22/email-verify.png`
- `artifacts/onboarding-ui-2026-07-22/profile-setup.png`

## 2026-07-23 Contract Smoke
Captured against production with Chrome headless:

```bash
npm run smoke:onboarding
```

Validated states:
- `manual-card` rendered manual card entry with Amex Gold fixture copy, last four `3007`, and the `Add card` action.
- `plaid-match` rendered the post-Plaid match step with the Amex Gold account, suggested match, and card-product selector.
- `selection-outcomes` rendered the four signed-in selection outcomes and expected selected card ids.

## 2026-07-24 Signed-In Manual Card Smoke
Added the repeatable live signed-in smoke command:

```bash
npm run smoke:signed-in-manual-card
```

Expected live signed-in behavior:
- Disposable confirmed Supabase user creation and password sign-in.
- Manual Amex Gold card save through the production API.
- Wallet analysis metadata with one linked account and one matched account.
- Manual-only transaction sync returning `{ itemCount: 0, totalSaved: 0 }`.
- Authenticated Whole Foods recommendation selecting Amex Gold from the user's matched card products.
- Disposable smoke user cleanup.

Initial production execution reached Supabase admin user creation but returned `401 Invalid API key` from the local service-role credential. The script deleted no user because creation failed before any smoke user existed. Refresh the local `SUPABASE_SERVICE_ROLE_KEY` or export a valid key, then rerun the command to capture the first passing production result.

The 2026-07-28 preflight addition checks this blocker directly through Supabase admin Auth before the manual-card or Plaid smoke scripts create users or write app data.

## 2026-07-29 Plaid Recovery Evidence
Added two production-safe fixture states and smoke assertions for Plaid exchange failures that happen after Link returns:

- `plaid-no-credit` renders the no-credit-card import recovery copy from `POST /api/plaid/exchange-token` and guides the user to retry with a credit-card issuer or use manual entry.
- `plaid-duplicate` renders the duplicate active-card recovery copy and guides the user to review connected accounts instead of relinking the same card.

The Add Card sheet now maps raw Plaid exchange errors through `plaidErrorRecovery()` before rendering them, so the onboarding modal gives a clear title, explanation, and next action while preserving the route-level error contract.

Verification commands:

```bash
npx vitest run components/card-reader/AddCardSheet.test.ts
npm run smoke:onboarding
```

## Implementation Notes
- The evidence page intentionally does not call Supabase, Plaid, or recommendation APIs.
- The Add Card states pass fixture card products, a pending Plaid account, and a match suggestion into the real component props.
- The profile states pass fixture auth flow and identity data into `ProfileAccessBoundary`.
- The selection-outcomes state renders `buildWalletSelectionOutcomeSummary()` output, so visual evidence and unit coverage share the same selected-card transition contract.
- The capture script uses Chrome headless with a forced device scale factor and a 500px default width. A 430px screenshot in headless desktop Chrome cropped the layout due to the browser's effective layout viewport, so the default captures the full narrow layout instead of producing misleading right-edge crops.

## UI Fix Captured
The first auth-entry capture surfaced horizontal clipping in the auth/profile sheets. The fix constrains the modal containers to `calc(100vw - 1.5rem)` and lets social sign-in button internals shrink at narrow widths.

Touched components:
- `components/auth/AuthEntrySheet.tsx`
- `components/auth/EmailAuthFlow.tsx`
- `components/auth/ProfileSetupFlow.tsx`

## Next Best Action
Refresh the local Supabase service-role credential, rerun `npm run smoke:signed-in-preflight`, then run `npm run smoke:signed-in-manual-card` and `npm run smoke:signed-in-plaid-card-match` against production. Keep `npm run smoke:onboarding` in the daily production verification path so signed-in manual, Plaid match, Plaid recovery, and selection-outcome fixtures do not drift while live credentials are blocked.
