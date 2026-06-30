# Browser Extension Architecture

## Goal
Detect merchant context while a user shops and recommend the best linked card or relevant offer.

## MVP Design
- Manifest V3 extension.
- Content script extracts:
  - hostname
  - title
  - canonical URL
  - visible merchant hints
- Background service worker calls Card Reader API.
- Popup displays current merchant and recommendation.

## MVP Files
- `extension/manifest.json`
- `extension/content.js`
- `extension/background.js`
- `extension/popup.html`
- `extension/popup.js`
- `extension/styles.css`

## Detection Strategy
1. Prefer hostname normalization.
2. Use title and selected page metadata as fallback.
3. Map common domains to merchant/category hints.
4. Send context to `/api/recommend-card`.

The background worker also derives fallback context from `tabs` URL/title when content-script messaging misses a page update, so the extension can still produce a recommendation for known merchant domains.

`/api/recommend-card` now supports authenticated recommendations when a Supabase bearer token is present: it validates the user and ranks only the card products matched to that user's linked accounts. Anonymous extension/API calls keep using the top-10 demo catalog.

## Security/Privacy
- Only send merchant context and page URL for active tab.
- Do not scrape payment forms.
- Do not collect card numbers.
- Do not send full page text in MVP.
- Add user controls before production release.

## Later
- Auth handoff from web app to extension.
- Local cache of the Supabase session or a scoped extension token.
- Offer match notifications.
- Airport/lounge context from location or travel booking pages.

## Local Test Plan
Use `docs/EXTENSION_LOCAL_TEST_PLAN.md` for the current smoke-test matrix across Patagonia, Amazon, airline/travel, grocery, and dining pages.
