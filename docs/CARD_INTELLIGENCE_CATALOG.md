# Card Intelligence Catalog

## Purpose
The recommendation product should treat merchant detection as a thin signal collector and keep durable intelligence in backend data. The extension/app should send purchase context; the backend should normalize it, load the user's cards, query card and merchant rules, then return the best action with a reason.

## Current MVP
- `data/top-priority-card-products.json` stores the top-10 card catalog, rewards, and benefit rules.
- `data/merchant-catalog.json` stores normalized merchants, domains, aliases, categories, and merchant-specific offer hints.
- `lib/recommendation/merchant-context.ts` joins those catalogs in memory for `POST /api/recommend-card`.
- `lib/recommendation/use-now-demo-merchants.ts` stores the in-app Use Now demo merchant matrix and request contexts for Whole Foods, Patagonia, Delta, Amazon, and Chipotle.
- `lib/recommendation/use-now-route-state.ts` parses shareable Use Now route state so smoke checks can open a specific demo merchant directly.
- `card_products` in Supabase stores card catalog rows for signed-in wallet analysis.
- `merchant_catalog`, `merchant_offer_rules`, and `card_reward_rules` can now be seeded into Supabase with `npm run seed:merchant-intelligence`.
- `GET /api/merchant-intelligence` returns backend availability/counts for the seeded merchant intelligence tables.

## Recommendation Flow
1. Extension or in-app Use Now sends context: merchant, URL, page title, category hint, and available card product IDs.
2. Backend normalizes the merchant by domain first, then alias/title/category text.
3. Backend maps the merchant to a canonical reward category such as dining, groceries, flights, hotel, travel, gas, drugstore, rent, streaming, or general.
4. Backend ranks the user's candidate cards by reward multiplier for that category.
5. Backend attaches any merchant-specific offer hint that applies to the user's cards.
6. Response includes best card, runner-up, reason, merchant/category normalization, and matched offer.

## Supabase Tables
- `merchant_catalog`: canonical merchant name, domains, aliases, reward category, MCC/category metadata, and active status.
- `merchant_offer_rules`: issuer/card-specific merchant offers, enrollment requirements, expiry, geography, and confidence/source.
- `card_reward_rules`: normalized reward multipliers by card, category, merchant, portal requirement, cap, and effective dates.
- `card_benefit_rules`: normalized statement credits, access perks, protections, welcome bonuses, resets, and eligibility constraints.
- `user_card_state`: per-user enrollment, benefit usage, welcome bonus progress, accepted account matches, and suppressed recommendations.

## Near-Term Build Order
1. Keep expanding `merchant-catalog.json` and `use-now-demo-merchants.ts` together when the priority demo or extension smoke matrix changes.
2. Seed merchant catalog, offer rules, and top-priority reward rules into Supabase with `npm run seed:merchant-intelligence`.
3. Keep recommendation execution on the local JSON fallback until the Supabase scorer can be tested against the seeded rules.
4. Add issuer offer ingestion later; until then, merchant offers should be explicitly labeled as catalog hints.
5. Normalize `card_benefit_rules` and `user_card_state` after the reward-rule path is stable.

## Use Now Demo Matrix
- Whole Foods: grocery catalog match, best card `amex-gold`.
- Patagonia: general retail catalog match, best card `capital-one-venture-x`; catalog hint reminds users to check issuer offers.
- Delta: flights catalog match, best card `amex-platinum`.
- Amazon: current rotating-quarterly catalog demo, best card `chase-freedom-flex`.
- Chipotle: dining catalog match, best card `amex-gold`.

Amazon is currently a demo catalog hint. Before treating it as production personalization, add issuer activation windows, user enrollment state, and quarterly cap tracking.

## Use Now Deep Links
The wallet accepts query-string state for the demo recommendation surface:

```text
/?screen=use-now&merchant=Whole%20Foods
```

Supported behavior:
- `screen=use-now` opens the full Use Now screen and preloads the merchant recommendation.
- `screen=wallet&merchant=Patagonia` opens the wallet merchant-search panel for the merchant.
- Demo merchant names are normalized back to their canonical labels, so lower-case links such as `merchant=whole%20foods` still render `Whole Foods`.
- Arbitrary merchant input is capped before being written into React state; it still flows through the existing `/api/recommend-card` fallback path.

This is intentionally a smoke/evidence affordance, not a new routing system. The app still uses the same client component and the same `/api/recommend-card` backend behavior.
