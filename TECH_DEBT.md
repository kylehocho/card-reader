# Tech Debt

## High Priority
- Wallet UI still contains demo presentation data and should progressively consume `analyzeWallet()` outputs.
- Supabase keys were shared in Telegram during setup; rotate them later through a secure path.
- Account-card matching is manual; add deterministic matching hints from Plaid account names/masks and user selection history.
- Recommendation estimates use simple multiplier math; add point valuations and issuer-specific redemption assumptions.

## Medium Priority
- Convert top-priority catalog JSON into a versioned admin-editable table workflow.
- Add tests for `analyzeWallet()` categories, credits, welcome bonuses, and recommendations.
- Add `/api/wallet/analysis` for authenticated analysis instead of only local utility code.
- Add merchant normalization aliases and MCC/category confidence.
- Add real extension auth/session handling.

## Low Priority
- Improve docs generation from catalog/rules.
- Add Storybook or component previews if UI iteration gets complex.
- Split giant `WalletPrototype.tsx` into wallet, profile, Plaid, and recommendations modules.
