# Claude Design File - Card Reader

Authored by Claude Fable 5 on 2026-07-02, from the current implementation.
Audience: future Claude/Fable/Codex agents and designers making UI/product changes.
Companion docs: `docs/PRD.md`, `docs/TECH_ARCHITECTURE.md`, `docs/WALLET_ANALYSIS_UI.md`, `docs/EXTENSION_ARCHITECTURE.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `TECH_DEBT.md`, `DECISIONS.md`.

---

## 1. Purpose and product thesis

Card Reader is a **smart wallet** that tells credit-card optimizers which card to use, which benefits are still available, and which value they are missing. It is not a marketing site, not a bank app clone, and not a general PFM dashboard.

The design thesis:

- The app should feel like **Apple Wallet with a brain** - a dark, card-first, mobile-shaped surface where the physical card metaphor carries the whole UI.
- Every screen answers one of three user questions: *"Which card do I use right now?"*, *"What value am I sitting on?"*, *"What value am I about to lose?"*
- Demo-readiness is a first-class requirement: anonymous sessions must always render a rich, believable wallet from seed data with zero backend dependencies.

## 2. Current surfaces actually present

There are exactly **three product surfaces** in this build. Do not invent others.

### 2.1 Web app - single-route wallet (`app/page.tsx`)
One Next.js route renders `components/card-reader/WalletPrototype.tsx` inside `AuthProvider`. All in-app "screens" are client state, not routes.

### 2.2 Web app - extension connect (`app/extension/connect/page.tsx`)
Standalone page rendering `components/extension/ExtensionConnect.tsx`. Hands the Supabase session to the browser extension via `window.postMessage`.

### 2.3 Chrome extension (`extension/`)
Manifest V3 static package: `popup.html`/`popup.js`, `options.html`/`options.js`, `background.js`, `content.js`, `styles.css`. Detects merchant context on the active tab and shows a best-card recommendation.

There is **no** marketing/landing page, no settings route, no admin UI, no mobile app.

## 3. Navigation model and user flows

### 3.1 Screen state machine (WalletPrototype)
Screens are a `Screen` union driven by `setScreen(...)`:

- `wallet` - home. Hero card, Use Now demo CTA, paged info panel, recommendations summary card, welcome-bonus carousel, Plaid status strip, card stack.
- `profile` - `components/profile/ProfileHome.tsx` (signed-in only).
- `connected-accounts` - Plaid/manual account list, card-product matching, transaction sync, remove.
- `notifications` - notification toggles + alert list.
- `opportunities` - "Expiring Value": deduped missed-value recommendations + alerts.
- `use-now` / `category-guide` / `concierge` / `card-details` - secondary informational screens built on the same card/sheet patterns.

Within `wallet`, a second axis exists: `walletPageIndex` pages through `WalletPage` values `benefits | multipliers | rewards | progress | recommendations` (dot pager + horizontal drag). Merchant search ("Use Now") is a slide-in panel toggled by `showMerchantSearch`, entered via the search icon, the Demo route CTA, or dragging the hero card left.

Navigation conventions to preserve:
- Every non-wallet screen has a top bar: pill **Back** button (`bg-[#2c2c2e]`, rounded-full) on the left, centered 17px semibold title, and a width-balancing spacer or action buttons on the right.
- Overlays (auth sheets, add-card scanner, profile menu) are modals/sheets on top of the current screen, never new routes.

### 3.2 Add-card flow (`ScanStep` union: `camera | manual | plaid | match | success`)
Bottom sheet opened by the `+` button or the dashed "Add Card" stack item. Signed-out users are routed to auth first (`openScanner()` gates on `authStatus`/`profileStatus`). Steps:
1. **plaid** (default, visually "ringed" as recommended) - Plaid Link sandbox connect.
2. **camera** - mock scan affordance (prototype only).
3. **manual** - pick a catalog card product + last4; signed-in users persist via `POST /api/wallet/manual-cards`, anonymous users get a local demo card.
4. **match** - assign linked accounts to card products (deterministic suggestion card + dropdown).
5. **success** - brief confirmation, auto-dismiss ~900ms back to wallet.

### 3.3 Auth flow (`components/auth/*`)
`AuthProvider` exposes `authFlow`: `entry` "** `AuthEntrySheet` (Apple recommended / Google / email), `email`+`verify` "** `EmailAuthFlow`, `setup` "** `ProfileSetupFlow` (first name, display name, notifications opt-in). All are bottom sheets over black scrim with backdrop blur.

### 3.4 Extension flow
Content script/background worker detect merchant "** `POST /api/recommend-card` "** popup renders merchant, best card, multiplier, reason, runner-up, matched offer. Popup has a Refresh action (`CARD_READER_REFRESH_ACTIVE_TAB`). Auth handoff happens only at `/extension/connect`; options page allows manual token paste for debugging.

## 4. Design principles

1. **Wallet-first.** The card object is the anchor of every screen. Information hangs off a card (gradient hero, stack, tinted header stripe on concierge cards), never off a generic table/list page.
2. **Apple Wallet / iOS-inspired, deliberately.** SF Pro font stack for app-shell surfaces, `#2c2c2e` pill buttons, iOS-style grouped lists with inset hairline dividers (`mx-4 h-px bg-white/10`), green `#34c759` toggles, glassy `backdrop-blur-2xl` panels.
3. **Demo-ready at all times.** Anonymous sessions render seed cards/benefits/bonuses/alerts. Signed-in Supabase sessions replace - never mix with - seed data. Any new surface must define both modes.
4. **High-trust finance UX.** Concrete numbers with concrete framing ("$127 of $200 used", "expires in 26 days", "4x vs 1x"). Every recommendation carries a plain-English `reason` and often a `runnerUp`. No vague marketing claims.
5. **Concise, action-first copy.** Eyebrow label "** short headline "** one supporting sentence. CTAs are verbs: "Use", "Sync", "Connect", "Review".
6. **Not a marketing site.** No hero sections, no feature grids, no testimonials, no pricing. The app opens directly into the wallet.

## 5. Visual system

### 5.1 Color
- **Base background:** `#060816` (near-black navy; `globals.css` body + ExtensionConnect) and pure `bg-black` inside WalletPrototype's phone frame. Extension uses `#090b10`.
- **Text:** white with opacity steps as hierarchy - `text-white` (primary), `/70-/78` (body), `/58-/66` (secondary), `/42-/50` (eyebrows/labels), `/28-/44` (hints/disabled).
- **Glass surfaces:** `bg-[rgba(118,118,128,0.24)]` (the signature iOS "material" gray) or `bg-white/[0.04-0.08]`, with `border border-white/10-12`.
- **Semantic tints (always ~10-16% alpha bg + lighter text):**
  - info: `sky-300/400` - suggestions, info alerts
  - warning: `amber-300/400` - expiring value, unassigned matches, deadlines
  - urgent/destructive: `rose-300/400` - errors, sign out, remove
  - success/connected: `emerald-300/400` - Plaid status strip, verified states
- **Inverted emphasis:** solid white cards/buttons with near-black text (`#10131a`, `#060816`, `#080a0f`) mark the single most important item (top merchant result, primary CTA, "missed value" chip).
- **Card art:** each card is a Tailwind `bg-gradient-to-br` three-stop gradient (e.g. Amex Gold `from-[#f3d59f] via-[#cb9d62] to-[#704624]`) plus a top-right radial highlight `bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%)]` and a hairline `inset-x-4 top-3 h-px bg-white/15`. Plaid-derived cards use muted slate gradients; the Add Card slot is dashed-border on `#8d949f/24`.

### 5.2 Typography
- **App shell / wallet UI:** inline `appleInfoFontStyle` (SF Pro stack) applied per section. This is the dominant product typeface.
- **Serif (Lora, `--font-lora`):** body default from `globals.css`; effectively visible only where SF Pro style is not applied. Do not extend serif use into wallet surfaces.
- **Mono (JetBrains Mono, `--font-jetbrains-mono`):** `font-mono` eyebrows/labels (ExtensionConnect, skip link).
- **Scale in use:** 27-32px semibold with tight tracking (`-0.03/-0.04em`) for hero numbers/titles; 17-20px semibold for card/section titles; 13-15px body; 10-11px uppercase eyebrows with wide tracking (`0.16em-0.28em`).
- Numbers are formatted via `Intl.NumberFormat` currency helpers - keep using them.

### 5.3 Shape, spacing, elevation
- **Radius ladder (large "** small):** 32px auth sheets, 28-30px cards/major panels, 24-26px sub-panels and list groups, 18-22px nested tiles/inputs, `rounded-full` pills/buttons/chips.
- **Layout:** single column, `max-w-md` phone frame, `px-4` gutters, `gap/space-y-3` between stacked panels, `p-4/p-5` panel padding.
- **Shadows:** big soft drop + inner top highlight, e.g. `shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)]`; hero card uses `0_32px_70px rgba(0,0,0,0.34)`. The `inset 0 1px 0 white` line is the "glass edge" - keep it on every elevated surface.
- **Aspect ratio:** hero/detail card art uses `aspect-[1.586/1]` (real credit-card ratio).

### 5.4 Motion (framer-motion)
- Global `MotionConfig` spring: `stiffness 280, damping 28, mass 0.9`.
- Card stack expand/collapse: `layout` animation, per-index `top/scale/opacity`, spring `320/30`.
- Horizontal drag gestures: hero card -> merchant search (offset < -70), info panel -> page next/prev (+/-60), search panel -> dismiss (> 70).
- Progress bars animate `width` with a minimum visible width (`Math.max(progress, 6-7)%`).

### 5.5 Signature surfaces (reuse, don't reinvent)
- **Hero card:** gradient + radial highlight + hairline; issuer eyebrow top-left, `**** last4` pill top-right, balance block bottom.
- **Card stack:** overlapping stacked cards, tap to expand into a list, dashed "Add Card" always last.
- **Benefit tracker row:** title (16px semibold) + detail line + 2px-track/2px-fill white progress bar; fill opacity encodes status via `statusProgressTone()` (available=white, in-progress=/80, expiring=/65, used=/35).
- **Multiplier row:** emoji icon circle + label/detail + right-aligned `Nx` pill.
- **Welcome bonus card:** ~78%-width snap-scroll carousel card with issuer eyebrow, deadline amber chip, progress bar, spent/percent/target row, "next move" sentence.
- **Recommendation/alert card:** eyebrow + headline + reason sentence + footer strip (`rounded-[18px] bg-white/[0.06]` with left summary / right affordance). Severity tint via `severityTone()`.
- **Merchant result card:** rank #1 renders inverted (white bg, dark text) with "Top result" eyebrow; others glass. Two-cell value/category grid + matched-benefit chips.
- **Status chips:** `matchToneClass()` - emerald Synced, sky Suggested, amber Unassigned, rose Sync issue.

### 5.6 CTA patterns
- **Primary:** solid white rounded-full, dark text (`text-[#060816]`/`#10131a`), 14px semibold. One per view.
- **Secondary:** `bg-white/10` rounded-full, `text-white/8x`.
- **Tertiary/destructive:** text-only or `bg-rose-300/12` with rose text.
- Disabled: `disabled:opacity-40-60`, plus `disabled:cursor-not-allowed` where relevant. In-flight buttons swap label text ("Syncing", "Connecting", "Signing out") rather than adding spinners.

## 6. Component framework and patterns to reuse

- `components/card-reader/WalletPrototype.tsx` (~3.5k lines) is the wallet client and owns all screen state, seed data, Plaid/analysis fetch lifecycle, and most rendering. It is intentionally monolithic for prototype speed; extraction is planned (see section 11) - follow the existing extraction pattern (pure view-mapping into `lib/`) rather than ad-hoc splitting.
- **Presentation mappers live in `lib/benefits/wallet-analysis-view.ts`:** `benefitFromTracker`, `welcomeBonusFromTracker`, `recommendationFromAnalysis`, `alertFromAnalysis`, `formatWalletAnalysisCurrency`. New API-driven UI must map through functions like these (tested via Vitest), not inline in JSX.
- **Extracted components:** `AuthEntrySheet`, `EmailAuthFlow`, `ProfileSetupFlow` (auth sheets); `ProfileHome`, `ProfileMenu` (profile); `ExtensionConnect`; `MatchSuggestionCard` (in WalletPrototype). New standalone screens should follow `ProfileHome`'s shape: props-driven, `'use client'`, own `appleInfoFontStyle` const, no data fetching inside.
- **Shared logic is library-first** (DECISIONS.md): `lib/benefits/analyze-wallet.ts` (pure engine), `lib/cards/card-match-hints.ts`, `lib/recommendation/*`, `data/top-priority-card-products.json`, `data/merchant-catalog.json`. UI never re-implements scoring/analysis.
- **State conventions:** small string-union state machines (`Screen`, `ScanStep`, `WalletPage`, `SyncState`, statuses like `'idle' | 'loading' | 'connected' | 'error'`). Prefer adding a union member over booleans.
- **Dedupe helpers** (`dedupeTransactionRecommendations`, `dedupeNotifications`) cap list surfaces at ~4 items - keep summaries bounded.

## 7. Data/product contracts that shape the UI

- **Wallet analysis (`GET /api/wallet/analysis`, bearer auth):** returns `{ analysis: { trackers, welcomeBonuses, recommendations, alerts }, meta }`. Signed-in wallet home, benefits page, bonus carousel, Opportunities, and alerts all render from this one contract (see `docs/WALLET_ANALYSIS_UI.md`). Refresh triggers: auth ready, match save, transaction sync, manual card add, sign-out reset.
- **Plaid accounts:** `plaid_items` "** `plaid_accounts` (credit cards only surface as wallet cards) "** `account_card_matches` "** `card_products`. Match status vocabulary: `manual | suggested` (+ UI labels Synced/Suggested/Unassigned/Sync issue). Card-match suggestions come from `suggestCardProductMatch()` and are **never auto-saved** - user must tap "Use".
- **Manual cards (`POST /api/wallet/manual-cards`):** synthetic account keyed `manual:<cardProductId>:<last4>`, `match_status = manual`; flows through the same analysis/recommendation reads. Manual-only users get a clean zero-item transaction sync (`docs/MANUAL_CARD_ENTRY.md`).
- **Merchant recommendation (`POST /api/recommend-card`):** input `{ merchant, url, categoryHint, cardProductIds }`; output `{ merchant, category, bestCard, reason, matchedOffer, runnerUp }`. Anonymous = top-10 demo catalog; bearer token = user's matched products only. Backend owns merchant normalization (`data/merchant-catalog.json`); clients send thin context only.
- **Recommendation events:** successful recommend calls log to `recommendation_events` (non-blocking); `GET /api/recommendation-events` is the authenticated read path. UI does not render these yet - don't build dashboards without a request.
- **Reward vocabulary:** `RewardCategory` union (dining/travel/groceries/flights/hotel/gas/drugstore/rent/streaming/capital_one_travel/rotating_quarterly/general) with `readableRewardCategory()` labels and alias mapping in `rewardMultiplier()`. Reuse these; do not invent parallel category enums.
- **In-app demo merchants:** Whole Foods, Patagonia, Delta, Amazon, Chipotle (`demoMerchantNames` + `seedMerchantResults`). The Use Now search runs against this seed set client-side; backend search fallback is future work.

## 8. Empty / loading / error / signed-out states

Every signed-in surface has explicit states - preserve all of them when refactoring:

- **Signed-out (anonymous):** full seed wallet (6 demo cards, seed notifications/bonuses/merchants). Actions that require identity (`openScanner`, profile, connected accounts) route to `AuthEntrySheet` instead of executing.
- **Signed-in empty wallet:** `emptyWalletCard` renders ("Connect your first card") with setup-flavored copy; **no seed cards or seed bonuses leak in** (`isUserBackedWallet` filters to `plaid-*` cards only). Connected Accounts empty state is a single glass panel with a "Connect sandbox issuer" CTA.
- **Loading:** `walletAnalysisStatus === 'loading'` shows "Refreshing benefit trackers..." in the emerald Plaid strip; buttons swap to progressive labels; extension popup shows "Checking this page...".
- **Error:** inline tinted rose panels with the actual error message (`plaidError`, `walletAnalysisError`); analysis errors preserve connected-account UI rather than reverting to seed data. Extension distinguishes "session expired "** reconnect from web app" from generic failures.
- **Unmatched account:** wallet card stays visible with "Needs match" copy; trackers stay empty until a product is assigned.
- **No search results:** explanatory glass panel ("No mock merchant match yet...") - never a blank region.

## 9. Extension design rules and constraints

- Keep the extension a **static MV3 package** - plain HTML/CSS/JS, no framework, no build step (`extension/styles.css` is the whole design system: dark `#090b10`, Inter/system font, 18px-radius glass panels, white primary buttons, amber offer chip, red error text).
- Popup layout is fixed: eyebrow "Card Reader" "** merchant h1 "** recommendation card (category label, card name h2, issuer + multiplier line, reason, optional runner-up and amber offer chip) "** settings row (API URL input, auth status text, Refresh + Settings buttons). `min-width: 320px` (options page 420px).
- Auth status strings are part of the contract: "Demo catalog", "Signed-in wallet: <email>", "Session expired".
- **Privacy constraints (docs/EXTENSION_ARCHITECTURE.md, non-negotiable):** only merchant context + active-tab URL leave the page; never scrape payment forms, never collect card numbers, never send full page text. `/extension/connect` messages are origin-checked; tokens live in `chrome.storage.local`, API base URL in `sync`.
- Recommendation copy in the popup should visually rhyme with the in-app Use Now results (best card + multiplier + reason + runner-up), even though the styling systems are separate.

## 10. Accessibility and responsiveness

Existing baseline to maintain:
- Skip link in `app/layout.tsx` (`sr-only focus:not-sr-only`); ExtensionConnect declares `id="main-content"` - new full pages should too.
- Icon-only buttons carry `aria-label` (search, add pass, profile, pager dots); form controls get labels/`aria-label` (match select).
- Layout is mobile-first `max-w-md` centered; it renders as a phone frame on desktop by design. Do not add desktop breakpoints/multi-column layouts without an explicit product decision.
- Extension sets `color-scheme: dark`; app is dark-only.

Known weak spots (fair game to improve, carefully): drag-only gestures have button/dot fallbacks - keep both; low-alpha text (`/42`-`/50`) can flirt with contrast minimums, don't go lower; native `window.confirm` is used for account removal (also blocks automation - see section 11); progress bars are visual-only (no `role="progressbar"`/aria values yet).

## 11. Known design debt and near-term UI priorities

From `TECH_DEBT.md`, `PROJECT_STATE.md`, and production smoke reviews:

- `WalletPrototype.tsx` is a 3.5k-line monolith; planned split into wallet / profile / Plaid / recommendations modules (low priority, do incrementally with behavior boundaries - see section 12).
- Wallet UI still carries demo presentation data inline; continue migrating signed-in surfaces onto `analyzeWallet()` outputs via `lib/benefits/wallet-analysis-view.ts` mappers.
- Manual-card labels need polish, and account removal should replace native `confirm` with an in-design confirmation surface (native confirm broke browser automation during smoke).
- Recommendation value math is simple multiplier x one cent; when point valuations land, the "est. value" and "missed value" chips must state assumptions.
- Use Now demo path and extension popup still need screenshot/video evidence across the priority merchant matrix - keep those surfaces stable for capture.
- In-app merchant search is seed-only; wiring it to `/api/recommend-card` for signed-in users is the natural next step (reuse the existing result-card layout).
- `filteredRecommendations` (old category recommendations list) is intentionally emptied - dead paths around `selectedRecommendation`/`purchaseCategory` are cleanup candidates, not features to resurrect.

## 12. Guardrails for future agents

1. **Preserve the design language.** New surfaces must use the existing tokens: dark glass panels, radius ladder, white-pill CTAs, SF Pro app-shell font, opacity-stepped white text, semantic 10-16% tints. If you're writing a new hex color or radius, justify it.
2. **No landing-page drift.** Do not add hero/marketing sections, feature grids, or promotional copy to `app/page.tsx`. The app opens into the wallet.
3. **One recommendation brain.** All scoring/analysis lives in `lib/benefits`, `lib/recommendation`, `lib/cards` and the APIs. Do not duplicate reward math, category inference, or offer logic in components or the extension. (The one sanctioned duplicate is `localTransactionRecommendations` as an offline fallback for when API analysis is unavailable - don't add more.)
4. **Respect the seed/signed-in boundary.** Anonymous = seed data everywhere; signed-in = API data only, seed filtered out. Any change touching `isUserBackedWallet`, `visibleCards`, or `welcomeBonuses` must keep both modes correct and keep the empty signed-in wallet free of demo content.
5. **No broad UI refactors without behavior boundaries.** When splitting `WalletPrototype.tsx`, move one screen at a time behind its existing props/state contract, keep the `Screen`/`ScanStep` unions authoritative, and verify with `npm test`, `npm run lint`, `npm run build` plus a manual pass of the affected screen in both auth modes.
6. **Don't invent product surfaces.** No new routes, nav bars, tabs, or settings pages unless the PRD/roadmap calls for them. Extend the existing screen unions instead.
7. **Extension stays thin and private.** No frameworks, no extra permissions, no page-content exfiltration, no new data fields sent to APIs beyond merchant context.
8. **Copy discipline.** Concrete numbers, reasons, and deadlines. Every recommendation has a "why". Avoid exclamation points and hype.
9. **Docs follow changes.** Material UI/product changes update `PROJECT_STATE.md` and the relevant doc in `docs/` (this file included).

## 13. Checklist for future UI changes

Before shipping any UI change:

- [ ] Does it render correctly in **all four wallet modes**: anonymous seed, signed-in empty, signed-in matched cards, signed-in with unmatched/error states?
- [ ] Loading, error, and empty states defined (no blank panels, no silent failures)?
- [ ] Uses existing tokens: dark glass surface, radius ladder, white-pill primary CTA, SF Pro `appleInfoFontStyle`, opacity-stepped text, semantic tint (sky/amber/rose/emerald)?
- [ ] Back-button + centered-title header on any new screen; screen added to the `Screen` union (not a new route)?
- [ ] Data comes from `lib/` mappers or an existing API contract - no new inline scoring/analysis logic?
- [ ] Currency/points formatted with the existing `Intl.NumberFormat` helpers?
- [ ] Recommendations show card, rate, reason (and runner-up where available)?
- [ ] Icon-only buttons have `aria-label`; interactive gestures have a button fallback?
- [ ] Lists bounded (dedupe/slice) so summary surfaces stay small?
- [ ] `npm test`, `npm run lint`, `npm run build` pass; screenshots captured if the change touches a demo-path surface (wallet home, Use Now, extension popup)?
- [ ] `PROJECT_STATE.md` / relevant docs updated?
