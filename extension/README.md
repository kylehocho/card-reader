# Card Reader Browser Extension MVP

## Install Locally
1. Open Chrome Extensions.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `extension/` folder.

## Test Pages
- https://www.patagonia.com
- https://www.delta.com
- https://www.hyatt.com
- https://www.amazon.com

## Behavior
- Content script extracts merchant context.
- Background worker calls `POST /api/recommend-card`.
- Popup shows best card, multiplier, runner-up, and mock merchant offer if available.
- Badge shows the best multiplier, such as `4x`.

## MVP Limits
- Uses the top-10 demo card catalog, not authenticated user cards yet.
- Does not inspect checkout forms or collect payment data.
- Merchant offers are static mock/domain rules.
