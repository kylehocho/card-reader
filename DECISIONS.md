# Decisions

## 2026-06-27 - Focus catalog on 10 cards first
Decision: Build analysis depth for 10 high-value, widely used cards before expanding breadth.

Rationale: A focused catalog lets the MVP demonstrate real value quickly: credits, welcome bonuses, category rules, lounge/travel perks, and best-card logic.

## 2026-06-27 - App-owned card intelligence, Plaid as transaction/account source
Decision: Do not rely on Plaid sandbox or Plaid metadata to identify exact card products. Store app-owned `card_products`, then match linked accounts to those products.

Rationale: Plaid account names and sandbox data are not reliable enough for card-specific benefit tracking.

## 2026-06-27 - Managed services first
Decision: Use Vercel + Supabase + Plaid sandbox for MVP infrastructure.

Rationale: Solo-founder speed, low ops load, and enough production shape for real users.

## 2026-06-27 - Shared analysis engine
Decision: Keep benefit/recommendation logic in pure library code and expose it through API/UI surfaces.

Rationale: Browser extension, mobile app, wallet UI, and admin tools should all use the same decision model.

## 2026-06-27 - Browser extension is a separate static package for MVP
Decision: Start with a lightweight Manifest V3 extension under `extension/` rather than a full extension build pipeline.

Rationale: Fastest path to demo merchant detection and recommendation calls without monorepo/tooling overhead.
