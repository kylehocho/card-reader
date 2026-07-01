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
- Manual card add persists card-product match for users without Plaid. Shipped first catalog-backed slice on 2026-07-01; production browser smoke remains.

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
- Build extension MVP.
- Add recommendation API.
- Add authenticated wallet analysis API.
- Wire shared analysis engine into UI.
- Keep docs current after each material decision.
