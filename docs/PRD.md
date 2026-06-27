# Product Requirements Document

## Product
Card Reader is a smart wallet that tells users which credit card to use, which benefits are still available, and which hidden value they are missing.

## Target User
Credit-card optimizers who hold multiple rewards cards and want automatic, context-aware recommendations without manually checking issuer apps, benefit pages, or card terms.

## MVP Outcomes
- User can sign up and create a profile.
- User can connect Plaid sandbox accounts or manually add a card.
- User can match linked accounts to known card products.
- App can analyze linked transactions against card benefits.
- Browser extension can detect merchant context and recommend a card.
- Wallet can surface unused credits, welcome bonus progress, and missed-value recommendations.

## Priority Cards
1. Chase Sapphire Reserve
2. Chase Sapphire Preferred
3. Amex Platinum
4. Amex Gold
5. Capital One Venture X
6. Chase Freedom Unlimited
7. Chase Freedom Flex
8. Citi Strata Premier
9. Bilt Mastercard
10. Discover it Cash Back

## MVP User Stories
- As a new user, I can sign up and connect cards.
- As a user with linked cards, I can see only my cards and benefits.
- As a user shopping online, I can see which linked card to use.
- As a user near a benefit reset, I can see unused credit value.
- As a user pursuing a welcome bonus, I can see progress and next-best spend.
- As a user reviewing transactions, I can see missed-value opportunities.

## Non-Goals For MVP
- Automatic issuer login scraping.
- Full transfer partner award search.
- Production-grade merchant offer ingestion from every issuer.
- Native mobile app release.
- Complex multi-tenant admin/RBAC.

## Success Criteria
- Working web app and extension demo.
- Top-10 card catalog is queryable.
- Mock Plaid wallet produces useful analysis.
- Browser extension can identify merchant context and receive a recommendation.
- Architecture can evolve to real offer ingestion and mobile app without rewrites.
