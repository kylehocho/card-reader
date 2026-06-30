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
- Popup can explicitly request a fresh active-tab recommendation from the background worker, so opening the popup is not dependent on pre-populated session storage.

## MVP Files
- `extension/manifest.json`
- `extension/content.js`
- `extension/background.js`
- `extension/options.html`
- `extension/options.js`
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

The extension options page stores the API base URL in `chrome.storage.sync` and the Supabase bearer token in `chrome.storage.local`. Background recommendations attach `Authorization: Bearer <token>` when local token storage is populated; otherwise they send the demo top-10 card IDs.

The popup reads the cached `chrome.storage.session` recommendation first. If no recommendation or error is cached, or if the user clicks Refresh, it sends `CARD_READER_REFRESH_ACTIVE_TAB` to the background worker. The worker queries the active tab, asks the content script for structured context, falls back to tab URL/title context when needed, calls `/api/recommend-card`, updates the badge, stores the result, and returns the recommendation to the popup.

## Security/Privacy
- Only send merchant context and page URL for active tab.
- Do not scrape payment forms.
- Do not collect card numbers.
- Do not send full page text in MVP.
- Add user controls before production release.

## Later
- First-class auth handoff from web app to extension instead of manual token paste.
- Scoped extension token with refresh/expiry handling.
- Offer match notifications.
- Airport/lounge context from location or travel booking pages.

## Local Test Plan
Use `docs/EXTENSION_LOCAL_TEST_PLAN.md` for the current smoke-test matrix across Patagonia, Amazon, airline/travel, grocery, and dining pages.
