# Checkout tracking and customer-flow verification — October 11, 2026

## Published

- Netlify production commit: `76e4068`.
- Deployment: https://app.netlify.com/projects/custombuildstudio/deploys/6acb9e959008ec00089ca653 — Published.
- Shopify Customer events: CBS checkout analytics, custom pixel 237961515 — connected. Analytics consent required; marketing and preferences permissions are not requested.
- Existing GA4 property: custombuildstudio, property 507605744, stream G-8D08Z57Q3S, business Google account. Existing traffic collection was verified in Analytics.
- The personalized lamp and advertising budgets/campaigns were left unchanged.

## Changes

- Cart and checkout wait for current Shopify prices. A failed initial catalog request displays a retry action instead of permitting checkout with fallback prices.
- Product/cart/add-to-cart analytics use loaded catalog prices.
- Checkout carries anonymous GA client/session IDs and whitelisted campaign attribution into Shopify cart attributes. Analytics lookup is capped at 700 ms and cannot block payment indefinitely.
- Hosted checkout tracks checkout started, shipping information, payment information and order completion. Opening checkout is not a purchase. Purchase requires an order ID, with local and GA transaction-ID deduplication.
- The pixel sends product and order-reference data, not customer names, email, addresses, phone numbers, uploaded photo links or arbitrary line properties.
- Admin has a browser-specific option to exclude owner test visits and checkouts. Visiting the storefront with `?analytics_test=1` also enables this preference. Enabled on the desktop browser used for live verification; enable separately on other devices if needed.

## Verified

- Production build and 115-page build verification passed.
- Eleven existing order/backend unit tests passed.
- Four checkout-pixel tests passed: anonymous attribution, values/items, purchase completion/deduplication, owner exclusion and malformed attributes.
- Focused checkout browser tests passed at 1440 and 390 px: initial price guard, Mood Ghost design B, quantity changes, persistence, totals, delivery/pickup variant mapping, analytics test attribute, no horizontal overflow or JavaScript exceptions.
- Live delivery cart: dinosaur set CAD 39.99 + five pumpkin keychains CAD 13.60 = CAD 53.59. Shopify preserved both items, prices and total. Standard Tracked Shipping showed FREE after an Edmonton test postal locality was entered; Canada was the only shipping country. Mobile checkout showed the Custom Build Studio logo, express payment options and address fields, with no captured JavaScript errors.
- No payment, actual order, customer email or real customer contact was submitted. End-to-end receipt of a real purchase in GA4 remains unverified until a real order or an approved Shopify test-payment workflow is completed. Consent/ad blockers can prevent analytics collection.
- The older comprehensive `tests/browser.cjs` stopped on a pre-existing stale homepage `home-motion-active` assertion. It did not complete; focused checkout coverage was used for this change. Do not describe that older suite as passing.

## Instagram

Updated and verified the public bio:

Gifts, décor & personalized photo lamps  
Made in Edmonton • Custom design services  
Free shipping across Canada 🇨🇦  
Shop the link below ↓

Instagram web explicitly disables website-link editing. Owner must use the mobile app: Edit profile → Links → set https://custombuildstudio.ca/shop/ as the shopping link. The existing homepage link remains until that is done.

## Owner follow-up

- Review Shopify Billing: the admin displayed an alert that a CAD 1.05 billing payment failed. No billing settings or payment details were changed.
- Google Analytics is the implemented tracking destination. Meta pixel/Conversions API and Instagram ad optimization were not configured in this task.
- Review GA4 ecommerce results going forward; historical missing purchase events cannot be recovered by this installation. Owner test visits previously recorded cannot reliably be identified retroactively.

## Maintenance

The pixel source is `commerce/checkout-analytics.pixel.js`. Generate the installable code with `VITE_GA_MEASUREMENT_ID` set and run `node scripts/build-checkout-pixel.mjs`; output is private-to-workspace `.tmp/checkout-analytics.pixel.js`, outside public assets. Shopify's editor uses literal event subscriptions because its static validator rejects dynamic event names. Existing Netlify environment values were reused; no new credentials are needed for this GA4 setup.
