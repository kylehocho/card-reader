# Roadmap

## Phase 0 - Foundation Already In Place
- Supabase auth/profile persistence.
- Plaid sandbox Link and exchange routes.
- Plaid account storage and transaction sync.
- Card product catalog and account matching.
- Top-10 priority card fixtures.

## Phase 1 - MVP Demo
- Browser extension detects merchant context from URL/title/page text.
- Extension requests recommendation from backend.
- Backend returns best card, reward rationale, active offer/benefit, and fallback.
- Authenticated wallet-analysis API returns shared-engine trackers, welcome bonuses, alerts, and recommendations.
- App wallet renders analysis from shared engine.
- Manual card add persists card-product match for users without Plaid. Shipped first catalog-backed slice on 2026-07-01; signed-in production API and browser UI smoke passed on 2026-07-02.
- In-app Use Now demo surface makes merchant recommendations visible without installing the extension and now calls the same `/api/recommend-card` path as the extension. Initial demo merchants: Whole Foods, Patagonia, Delta, Amazon, and Chipotle.
- The Use Now demo merchant matrix is shared between the UI and backend tests so the five demo merchants stay aligned with catalog-backed recommendation behavior.
- The Use Now production evidence matrix is repeatable through `npm run evidence:use-now`, with screenshot artifacts archived under `artifacts/use-now-YYYY-MM-DD/`.
- Audit hardening from 2026-07-02 narrowed extension content-script scope, sanitized extension popup rendering, allowlisted extension API base URLs, stopped anonymous recommendation-event logging, and made Plaid token encryption use an explicit secret.

## Phase 2 - Benefit Tracking
- Statement credit usage by reset window.
- Welcome bonus progress from linked transactions.
- Rotating category activation reminders.
- Annual fee renewal value report.
- Lounge access lookup by airport/terminal.

## Phase 3 - Offer Intelligence
- Issuer offer ingestion abstraction.
- Merchant normalization table.
- Offer eligibility matcher.
- Extension notifications for merchant-specific offers.
- Admin review workflow for new/expired offers.

## Phase 4 - Travel Optimization
- Transfer partner rules.
- Airline/hotel redemption heuristics.
- Booking context detection.
- Points/cash recommendation.

## Phase 5 - Scale/Hardening
- Background jobs for sync and refresh.
- Audit logs for recommendations.
- Monitoring and error alerts.
- User preference controls.
- Paid-plan/subscription readiness.

## Current Sprint
- Complete true installed-extension screenshot/video evidence after the Use Now production screenshot matrix and the 2026-07-06 popup render-contract evidence.
- Continue splitting `WalletPrototype.tsx` into smaller behavior-owned pieces. The add-card presentation state was extracted on 2026-07-17, add-card sheet rendering moved into `AddCardSheet.tsx` on 2026-07-18, auth/profile sheet composition moved into `ProfileAccessBoundary.tsx` on 2026-07-19, fixture-backed onboarding UI evidence was captured on 2026-07-20, and selected-card mutation outcomes moved into the wallet navigation boundary on 2026-07-21. Next candidate is signed-in Plaid/auth smoke coverage around those onboarding outcomes.
- Keep extension privacy/security guardrails intact as new merchants are added.
- Keep docs current after each material decision.
