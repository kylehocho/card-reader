# Tech Debt

## High Priority
- Wallet UI still contains demo presentation data and should progressively consume `analyzeWallet()` outputs.
- Supabase keys were shared in Telegram during setup; rotate them later through a secure path.
- Account-card matching now has deterministic hints; add telemetry/review state so accepted suggestions improve future matching.
- Recommendation estimates use simple multiplier math; add point valuations and issuer-specific redemption assumptions.

## Medium Priority
- Convert top-priority catalog JSON into a versioned admin-editable table workflow.
- Add browser-driven signed-in Plaid smoke coverage.
- Continue extracting presentation projections from `WalletPrototype.tsx`; signed-in analysis mappers now live in `lib/benefits/wallet-analysis-view.ts`.
- Add merchant normalization aliases and MCC/category confidence.
- Add real extension auth/session handling.

## Low Priority
- Improve docs generation from catalog/rules.
- Add Storybook or component previews if UI iteration gets complex.
- Split giant `WalletPrototype.tsx` into wallet, profile, Plaid, and recommendations modules.
