# Browser Extension Local Test Plan

Last updated: 2026-06-29

## Goal
Verify the Manifest V3 browser extension can detect merchant context from real shopping pages, call the recommendation API, and show usable anonymous or signed-in card recommendations.

## Setup
1. Run the app locally with `npm run dev` if testing against local API changes.
2. Open extension settings from the popup or Chrome extension details page.
3. For local API testing, set the API base URL to `http://localhost:3000`.
4. For production API testing, leave the API base URL as `https://card-reader-xi.vercel.app`.
5. To test signed-in recommendations, sign in to the web app, open `/extension/connect`, and click Connect extension. The token is stored in `chrome.storage.local`, not sync storage. Manual token paste in extension settings remains available for debugging.
6. Open `chrome://extensions`, enable developer mode, choose Load unpacked, and select the `extension/` folder.
7. Keep the extension service worker console open while testing.

## Priority Pages
- Patagonia shopping page: validates general retail and outdoor merchant context.
- Amazon product/search page: validates marketplace host/title extraction.
- Airline page such as Delta or United: validates travel/flights context.
- Grocery page such as Whole Foods or Kroger: validates grocery category hints after the grocery/dining classifier fix.
- Dining page such as Resy or Chipotle: validates dining context and offer language.

## Checks
- Content script returns hostname, page title, canonical URL, and visible merchant hints.
- Background worker calls `POST /api/recommend-card` exactly once per active request.
- Popup open can self-refresh the active tab when session storage has not already been populated.
- Popup Refresh button can re-run the active-tab recommendation without reloading the merchant page.
- Anonymous mode sends demo top-10 card IDs; signed-in mode sends the bearer token and lets the API use the user's matched card products.
- `/extension/connect` can sync the current web session into the extension without copying a token manually.
- Expired signed-in tokens produce a reconnect-needed state instead of silently falling back to demo recommendations.
- Popup shows merchant, category, best card, runner-up if present, and the recommendation reason.
- Popup status shows either `Demo catalog` or `Signed-in wallet`.
- Extension handles API errors with a visible fallback state instead of a blank popup.
- No payment-form text, card numbers, or full page body content is collected.

## Automated Popup Render Evidence
Run:

```bash
npm run evidence:extension-popup
```

This captures the popup render contract for Whole Foods, Patagonia, Delta, Amazon, and Chipotle under `artifacts/extension-popup-YYYY-MM-DD/`. It seeds the actual popup HTML/CSS/JS with production `/api/recommend-card` responses and verifies the popup can render a non-empty recommendation state without clipping.

Current artifact set: `artifacts/extension-popup-2026-07-06/`.

Limit: this command does not prove installed-extension service worker/content-script behavior. Chrome 149 on this Mac rejects CLI unpacked-extension loading with `--load-extension is not allowed in Google Chrome, ignoring.`, so full MV3 automation still needs a compatible browser harness or manual `chrome://extensions` smoke.

## Manual Installed-Extension Evidence to Capture
- URL tested.
- Extracted merchant/category signal.
- API response card and reason.
- Popup screenshot or copied popup text.
- Console/network error if any page fails.

## Pass Criteria
The popup render contract passes when all five priority merchants produce non-empty recommendation responses and screenshots through `npm run evidence:extension-popup`.

The installed extension passes MVP smoke when at least three different merchant categories produce non-empty recommendation responses from real active tabs and the popup renders them without service worker errors.

## Popup Refresh Behavior
The popup should first render any cached `currentRecommendation` from `chrome.storage.session`. If there is no cached recommendation or error, opening the popup sends `CARD_READER_REFRESH_ACTIVE_TAB` to the background service worker. The same message is sent when the tester clicks Refresh. The service worker should:

1. Query the active tab.
2. Ask the content script for `CARD_READER_GET_CONTEXT`.
3. Fall back to tab URL/title merchant hints if the content script is unavailable.
4. Call `/api/recommend-card` with either the saved Supabase bearer token or anonymous demo card IDs.
5. Store `currentContext`, `currentRecommendation`, and `currentError` in session storage.
6. Return the recommendation or error to the popup.

For manual smoke, this means the tester can navigate to a priority merchant page, open the popup, and click Refresh if the first render looks stale.

## 2026-06-29 Automation Attempt
- Launched an isolated Chrome profile with the unpacked extension loaded from `extension/`.
- Confirmed the MV3 service worker registered under the unpacked extension id.
- Navigated merchant pages through CDP, but the automated run did not leave `currentContext` or `currentRecommendation` in extension session storage.
- Direct `chrome-extension://.../popup.html` navigation returned Chrome `ERR_FILE_NOT_FOUND` in the CDP-launched profile even though the popup file exists, so popup rendering could not be verified through this automation path.
- Patched the extension to make content-script startup messaging safe across Chrome callback/promise variants and to add a background tab URL/title fallback when content-script messaging fails.

Remaining evidence needed: load the extension manually through `chrome://extensions` or use a browser harness with first-class extension popup support, then capture the popup output for the priority page matrix above.

## 2026-06-30 Popup Refresh Hardening
- Added a popup-triggered active-tab refresh path so popup rendering is no longer entirely dependent on background tab events having already populated session storage.
- Added a visible Refresh button for repeated smoke checks against the current tab.
- Remaining evidence needed: run the manual or extension-capable browser smoke matrix and capture output for at least three merchant categories.

## 2026-07-06 Popup Render Contract Evidence
- Added `npm run evidence:extension-popup`.
- Captured production-backed popup screenshots for Whole Foods, Patagonia, Delta, Amazon, and Chipotle under `artifacts/extension-popup-2026-07-06/`.
- Fixed popup layout clipping by rendering the recommendation directly in the popup card, applying global `box-sizing`, wrapping long recommendation text, and allowing the settings/action row to wrap.
- Confirmed Google Chrome 149 rejects CLI unpacked-extension loading, so installed-extension automation remains separate from the render-contract capture.
