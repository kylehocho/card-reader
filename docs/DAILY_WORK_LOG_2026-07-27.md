# Daily Work Log - 2026-07-27

## Goal
Harden the merchant intelligence readiness surface so the team can inspect base recommendation data separately from the new benefits research staging tables.

## Product Reason
The app is moving from local JSON rules toward Supabase-backed card and merchant intelligence. Before importing reviewed benefits research, the team needs a clear health check that identifies which table group is ready and which migration tables are still missing.

## Changed
- Updated `GET /api/merchant-intelligence` to derive its response from a single table registry.
- Added `groups.baseRecommendation` for `merchant_catalog`, `merchant_offer_rules`, and `card_reward_rules`.
- Added `groups.benefitResearch` for `card_benefit_rules`, `issuer_offer_sources`, `benefit_research_runs`, and `benefit_research_findings`.
- Each group now reports `expectedTables`, `missingTables`, and `totalRows` while preserving the existing `available`, `benefitResearchAvailable`, and `tables` fields.
- Updated `docs/CARD_INTELLIGENCE_CATALOG.md`, `docs/TECH_ARCHITECTURE.md`, `PROJECT_STATE.md`, and `ROADMAP.md`.

## Implementation Notes
- The route still treats missing Supabase tables as a controlled readiness state instead of a hard error.
- Non-missing Supabase query errors still return a controlled 500 so real data access failures stay visible.
- The grouped response is intended for production smoke checks and future admin screens, not for consumer-facing recommendation decisions.

## Verification
- `npx vitest run app/api/merchant-intelligence/route.test.ts`
- `npm run lint`
- `npm run build`

## Risks
- Production still depends on the Supabase merchant-intelligence migration actually being applied before grouped readiness can show available data.
- This does not import benefits research records or change recommendation ranking yet.

## Next Best Action
Apply or confirm the merchant-intelligence migration in Supabase, then use the grouped status response to verify base recommendation readiness before building the reviewed Notion-to-Supabase importer.
