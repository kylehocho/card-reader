# Browser Extension Architecture

## Goal
Detect merchant context while a user shops and recommend the best linked card or relevant offer.

## MVP Design
- Manifest V3 extension.
- Content script extracts:
  - hostname
  - title
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

The background worker also derives fallback context from `tabs` host/title when content-script messaging misses a page update, so the extension can still produce a recommendation for known merchant domains without sending full page URLs.

`/api/recommend-card` now supports authenticated recommendations when a Supabase bearer token is present: it validates the user and ranks only the card products matched to that user's linked accounts. Anonymous extension/API calls keep using the top-10 demo catalog.

The web app exposes `/extension/connect` for first-class auth handoff. When a signed-in user clicks Connect, the page posts the current Supabase access token to the page's content script. The content script only accepts messages from the production Card Reader origin or local dev, forwards the token to the background worker, and the worker stores it in `chrome.storage.local`. API base URL preferences use `chrome.storage.sync`. The extension options page still allows manual token paste for debugging.

Background recommendations attach `Authorization: Bearer <token>` when local token storage is populated; otherwise they send only merchant/host/category hints plus the demo top-10 card IDs. API base URLs are allowlisted to production or localhost before any bearer token is used. The extension also stores the Supabase access-token expiry. If the signed-in token is expired or within the expiry skew window, the background worker clears the bearer token and returns a reconnect-needed error instead of silently making a demo-catalog recommendation.

The popup reads the cached `chrome.storage.session` recommendation first. If no recommendation or error is cached, or if the user clicks Refresh, it sends `CARD_READER_REFRESH_ACTIVE_TAB` to the background worker. The worker queries the active tab, asks the content script for structured context, falls back to tab URL/title context when needed, calls `/api/recommend-card`, updates the badge, stores the result, and returns the recommendation to the popup.

Popup render evidence is captured with `npm run evidence:extension-popup`. The command seeds the actual popup HTML/CSS/JS with production `/api/recommend-card` responses for five priority merchants and stores screenshots under `artifacts/extension-popup-YYYY-MM-DD/`. This verifies the popup render contract, not installed-extension service worker or content-script behavior.

## Security/Privacy
- Content scripts are restricted to known merchant domains and Card Reader app origins, not `<all_urls>`.
- Demo/anonymous recommendation calls do not send page URL/title and do not write recommendation event rows.
- Only send signed-in merchant context for the active tab.
- Allowlist API base URLs before attaching bearer tokens.
- Render popup recommendation fields with DOM text nodes instead of `innerHTML`.
- Do not scrape payment forms.
- Do not collect card numbers.
- Do not send full page text in MVP.
- Add user controls before production release.

## Later
- Scoped extension refresh-token handling if we later want the extension to renew sessions without a web-app reconnect.
- Offer match notifications.
- Airport/lounge context from location or travel booking pages.

## Local Test Plan
Use `docs/EXTENSION_LOCAL_TEST_PLAN.md` for the current smoke-test matrix across Patagonia, Amazon, airline/travel, grocery, and dining pages.
Use `docs/EXTENSION_POPUP_EVIDENCE.md` for the repeatable popup render evidence command and current artifact paths.
