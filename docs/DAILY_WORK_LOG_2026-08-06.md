# Daily Work Log - 2026-08-06

## Goal
Extract the profile notification settings screen and toggle model from `WalletPrototype.tsx`.

## Product Reason
Onboarding and Plaid sync remain the top priority, but live signed-in write-path smokes are still blocked by the known stale local Supabase service-role credential. This slice keeps reducing wallet-shell ownership without touching secrets, Plaid token handling, Supabase writes, or user-facing recommendation behavior.

## Changed
- Added `components/profile/NotificationSettingsScreen.tsx` for the existing Notifications screen rendering.
- Added `components/profile/useNotificationSettings.ts` for the default prototype preferences, display row order, and toggle helper.
- Added `components/profile/useNotificationSettings.test.ts` covering default settings, row order, and immutable toggle behavior.
- Updated `WalletPrototype.tsx` so it routes into the notification screen instead of owning the notification JSX and state inline.
- Updated `PROJECT_STATE.md`, `ROADMAP.md`, and `docs/WALLET_DECOMPOSITION.md`.

## Implementation Notes
- The extraction is behavior-preserving: the visible rows, initial toggle values, and iOS-style toggle presentation stay the same.
- Notification preferences remain local prototype UI state. This does not add Supabase preference persistence, browser push permission handling, or alert delivery.
- Keeping the toggle model in a pure helper gives future profile-preferences persistence a small contract to reuse when the app stores notification settings per user.

## Verification
- `npx vitest run components/profile/useNotificationSettings.test.ts`
- `npm run lint`
- `npm run test`
- `npm run build`
- `APP_BASE_URL=https://card-reader-xi.vercel.app SMOKE_TIMEOUT_MS=15000 npm run smoke:onboarding`
- `npm run smoke:signed-in-preflight` *(still blocked at the known stale local Supabase service-role credential)*

## Production Smoke Result
- Deployed final `main` state to Vercel production.
- Production alias: `https://card-reader-xi.vercel.app`
- Deployment URL: `https://card-reader-7p4h1n4ea-kylehocho-5599s-projects.vercel.app`
- Homepage smoke returned HTTP 200.
- Direct production check confirmed `/evidence/onboarding?state=manual-card` returns HTTP 200.
- The production onboarding contract smoke passed against `https://card-reader-xi.vercel.app`.
- The signed-in preflight still fails at `supabaseAdmin` with `401 Invalid API key`, confirming the same local service-role blocker before write-path smokes.

## Risks
- Notification settings still reset on remount/sign-out because there is no persisted profile-preferences API yet.
- Live signed-in manual-card and Plaid write-path smokes remain blocked until the local `SUPABASE_SERVICE_ROLE_KEY` is refreshed.

## Next Best Action
Refresh the local Supabase service-role credential, rerun `npm run smoke:signed-in-preflight`, then run `npm run smoke:signed-in-manual-card` and `npm run smoke:signed-in-plaid-card-match` against production before adding browser-driven signed-in Plaid onboarding evidence.
