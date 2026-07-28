# Daily Work Log - 2026-07-28

## Goal
Add a fail-fast dependency preflight for the signed-in production smoke path.

## Product Reason
Signed-in onboarding and Plaid sync remain the top priority, but both live smoke commands are blocked when local credentials drift. A small preflight makes the blocker obvious before the smoke scripts create users, call Plaid, or write app records.

## Changed
- Added `npm run smoke:signed-in-preflight`.
- The preflight loads the same local env files as the signed-in smoke scripts without printing secrets.
- It verifies production homepage reachability, Supabase service-role admin Auth access, Supabase anon/publishable Auth access, and Plaid sandbox credential access.
- It prints redacted JSON with the failed check, completed checks, and a direct remediation hint.
- Updated signed-in Plaid and onboarding smoke docs with the preflight command, manual-card-only Plaid skip option, and retry order.

## Implementation Notes
- The Supabase admin check uses a read-only admin users request, so it does not create a disposable user.
- The Supabase anon check intentionally attempts an invalid password login; a controlled auth rejection proves the public key is accepted without needing a real user.
- `SMOKE_PREFLIGHT_SKIP_PLAID=true` supports manual-card-only dependency checks while keeping the default preflight strict enough for the Plaid smoke.
- The script redacts credential material from output and only reports URLs, statuses, counts, and failure labels.

## Verification
- `node --check scripts/smoke-signed-in-preflight.mjs`
- `npm run smoke:signed-in-preflight` confirmed the existing blocker cleanly: homepage passed, then `supabaseAdmin` failed with `401 Invalid API key`.
- `npm run lint`
- `npm run build`

## Production Smoke Result
- No production deploy was needed because this was smoke tooling and documentation only.
- Production homepage reachability was verified by the preflight before the Supabase credential failure.

## Risks
- The live signed-in manual-card and Plaid smoke commands still cannot pass until the local `SUPABASE_SERVICE_ROLE_KEY` is refreshed.
- The preflight checks Plaid credential validity, not the full Plaid exchange/card-match/sync workflow.

## Next Best Action
Refresh the local Supabase service-role credential, rerun `npm run smoke:signed-in-preflight`, then run both signed-in production smoke commands before adding browser-driven signed-in Plaid onboarding evidence.
