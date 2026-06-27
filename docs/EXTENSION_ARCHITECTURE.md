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

## Security/Privacy
- Only send merchant context and page URL for active tab.
- Do not scrape payment forms.
- Do not collect card numbers.
- Do not send full page text in MVP.
- Add user controls before production release.

## Later
- Authenticated extension session.
- Local cache of user card products.
- Offer match notifications.
- Airport/lounge context from location or travel booking pages.
