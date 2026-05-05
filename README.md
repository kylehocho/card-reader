# Card Reader

A wallet-style prototype for a credit card benefits assistant.

## Product idea
Card Reader helps people understand:
- which credit card to use for a purchase
- which perks or statement credits are still unused
- how close they are to unlocking spend-based bonuses
- current rewards balances by card

The current prototype is a mobile-first UI demo inspired by Apple Wallet.

## Prototype goals
- make the app feel instantly familiar
- show stacked cards on a wallet-style home screen
- let a user add a card through a scan flow mock
- show benefits, rewards, and spend progress for each card
- surface proactive recommendations and missed opportunities

## Current route
- `/` — main wallet prototype

## Run locally
```bash
npm install
npm run dev
```

## Tech
- Next.js
- React
- Tailwind CSS
- TypeScript

## Short-term roadmap
1. card scan confirmation screen
2. notifications / expiring perks screen
3. best-card recommendation flow
4. richer fake data model and state transitions
5. motion pass to get closer to a polished wallet feel

## Product principles
- wallet-inspired, premium, calm UI
- make value legible in under 10 seconds
- emphasize actionable recommendations over raw card data
- show what is still available, not just what exists
