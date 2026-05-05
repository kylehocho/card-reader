# Card Reader — Internal Documentation Seed

## Overview
**App name:** Card Reader

**One-line pitch:**
A wallet-style app that tells users which credit card perks, statement credits, rewards, and spend thresholds are still available — and which card to use next.

## Core user promise
The app should answer, fast:
- What card should I use right now?
- What perks or credits have I not used yet?
- How close am I to unlocking a bonus or reward?
- What points or miles balance do I have on each card?

## Product principles
- Wallet-inspired, premium, calm interface
- Actionable guidance beats raw card data
- The app should make value legible in under 10 seconds
- Focus on unused benefits and next best actions

## MVP scope
### Included
- Wallet-style home screen with stacked cards
- Add-card flow with scan mock + manual fallback
- Card detail screen
- Rewards balance display
- Benefit usage / unused perk tracking
- Spend progress / threshold tracking
- Recommendation feed

### Deferred
- Live issuer integrations
- Real reward balance syncing
- Automatic transaction categorization
- True perk redemption detection
- Notification permissions and live push infrastructure

## Primary screens
1. Wallet home
2. Add / scan card flow
3. Card detail
4. Benefits tab
5. Rewards tab
6. Spend progress tab
7. Recommendation / opportunities feed
8. Notifications / expiring perks screen

## Fake data model for prototype
Each card should support:
- issuer
- product name
- last four digits
- rewards balance + label
- spend progress summary
- benefits array
  - title
  - status
  - detail
  - progress percentage
- best-use recommendation
- time-sensitive alerts

## Design direction
### Desired feel
- Very close to Apple Wallet in motion and familiarity
- Dark mode first
- Glossy card materials
- Strong spacing and hierarchy
- Minimal chrome on the top-level screen

### Important note
Aim for **Wallet-grade polish and familiarity** rather than shipping a literal 1:1 clone of Apple Wallet UI assets.

## Next build priorities
1. Card scan confirmation screen
2. Recommendation screen for “what card should I use?”
3. Notifications screen for expiring / unused perks
4. Richer fake data flows and state transitions
5. Motion pass for card stack interaction
6. Optional settings / account screen

## Open questions
- How should users input cards: scan only, manual only, or hybrid?
- How will rewards balances be sourced in v1?
- How much benefit tracking is manual vs automated?
- Is “best card for this purchase” based on merchant category, user goals, or both?
- Should there be an onboarding quiz around priorities (travel, cash back, status, lounge access)?
