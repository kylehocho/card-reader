# Browser Extension Local Test Plan

Last updated: 2026-06-29

## Goal
Verify the Manifest V3 browser extension can detect merchant context from real shopping pages, call the recommendation API, and show a usable card recommendation before investing in authenticated extension sessions.

## Setup
1. Run the app locally with `npm run dev` if testing against local API changes.
2. For local API testing, set `API_BASE_URL` in `extension/background.js` to `http://localhost:3000`.
3. For production API testing, leave `API_BASE_URL` as `https://card-reader-xi.vercel.app`.
4. Open `chrome://extensions`, enable developer mode, choose Load unpacked, and select the `extension/` folder.
5. Keep the extension service worker console open while testing.

## Priority Pages
- Patagonia shopping page: validates general retail and outdoor merchant context.
- Amazon product/search page: validates marketplace host/title extraction.
- Airline page such as Delta or United: validates travel/flights context.
- Grocery page such as Whole Foods or Kroger: validates grocery category hints after the grocery/dining classifier fix.
- Dining page such as Resy or Chipotle: validates dining context and offer language.

## Checks
- Content script returns hostname, page title, canonical URL, and visible merchant hints.
- Background worker calls `POST /api/recommend-card` exactly once per active request.
- Popup shows merchant, category, best card, runner-up if present, and the recommendation reason.
- Extension handles API errors with a visible fallback state instead of a blank popup.
- No payment-form text, card numbers, or full page body content is collected.

## Evidence to Capture
- URL tested.
- Extracted merchant/category signal.
- API response card and reason.
- Popup screenshot or copied popup text.
- Console/network error if any page fails.

## Pass Criteria
The extension passes this MVP smoke when at least three different merchant categories produce non-empty recommendation responses and the popup renders them without service worker errors.

## 2026-06-29 Automation Attempt
- Launched an isolated Chrome profile with the unpacked extension loaded from `extension/`.
- Confirmed the MV3 service worker registered under the unpacked extension id.
- Navigated merchant pages through CDP, but the automated run did not leave `currentContext` or `currentRecommendation` in extension session storage.
- Direct `chrome-extension://.../popup.html` navigation returned Chrome `ERR_FILE_NOT_FOUND` in the CDP-launched profile even though the popup file exists, so popup rendering could not be verified through this automation path.
- Patched the extension to make content-script startup messaging safe across Chrome callback/promise variants and to add a background tab URL/title fallback when content-script messaging fails.

Remaining evidence needed: load the extension manually through `chrome://extensions` or use a browser harness with first-class extension popup support, then capture the popup output for the priority page matrix above.
