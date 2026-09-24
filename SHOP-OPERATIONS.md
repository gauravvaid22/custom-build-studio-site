# Printed gift collection — preview and operations

The collection is implemented at `/shop`. It has twelve product pages, licensed reference galleries, product video where available, a quantity-aware cart and server-validated manual-payment checkout. Existing service, portfolio and quote pages are preserved.

## Run the working preview

Use Node 24 for the local SQLite preview:

```sh
npm ci
npm run build
npm run preview:shop
```

Open `http://127.0.0.1:4180/shop`. All local orders are TEST orders. No money or messages are sent. Orders persist in `../private-production/shop-preview/orders.sqlite`, outside the repository and deployed assets. The local administrator key is in the adjacent `admin-key.txt`; enter it at `/shop/admin`. Do not use this preview key in production.

## Editing products and fulfillment

- `commerce/products.json`: names, integer CAD prices in cents, buyer descriptions, included items, source dimensions, gallery paths, categories and production-review flags.
- `commerce/settings.json`: payment email, phone, $5 delivery, free pickup, 50 km radius, 2–3 business day production after confirmation, zero GST, quantity limit and catalog approval.
- `public/media/shop`: web-optimized licensed product photos only. Original photos, PDFs and production sources belong outside this repository.
- No residential pickup address is in the storefront. Arrange a time by call/text and share the address privately.
- Delivery addresses are reviewed manually against the 50 km area before requesting payment. The checkout does not pretend a postal code or community proves eligibility.
- Prices are provisional. No sizes, materials, colours or hardware variants have been invented. Confirm these from actual production before approving each product.

## Before a Netlify launch

1. User must approve the finished preview before publishing.
2. Obtain/verify each production archive, slice/test the intended version, and confirm material, finish and assembly/hardware before manufacturing. `productionReviewed` records physical production review separately from storefront approval; do not mark it true without that review.
3. The owner approved publishing the displayed catalog and prices on September 20, 2026. `catalogApproved: true` and `pricesAreProvisional: false` reflect that approval; checkout still requires live enablement, administrator authentication and a configured mailer.
4. In Netlify Functions environment variables, configure a unique random `SHOP_ADMIN_KEY` of at least 32 characters, plus `RESEND_API_KEY` and `SHOP_EMAIL_FROM` (a sender on a verified domain). Keep them out of the repository/client build. Set `SHOP_LIVE_ENABLED=true` only when ready. Live checkout requires the mailer configuration; previews never send email. `CONTEXT=production` selects live storage.
5. Deploy a Netlify preview and verify the Functions/Blobs adapter on the actual account. Local tests use SQLite with the same order logic; cloud persistence has not yet been tested on this account.
6. Check the Netlify account's Functions/Blobs allowance and billing limits. No paid services have been purchased. This adds storage/compute usage to the existing plan, not an external payment processor.
7. Make a clearly identified production smoke-test order after launch authorization, verify persistence/admin access and cancel the unpaid test. Never transfer real money for testing.

## Managing orders

Open `/shop/admin` and enter the private admin key. New orders start **Awaiting payment / Not started**. Owner notification code sends the order number, items, total, contact details and special request to `custombuildstudio@gmail.com`, with the customer address as Reply-To. Resend domain `orders.custombuildstudio.ca` is verified and a domain-restricted sending key is stored as a production-only Netlify secret. Sender: `Custom Build Studio <orders@orders.custombuildstudio.ca>`. No paid plan was purchased. Live delivery still needs an end-to-end smoke test. Customers save their private confirmation link; automatic customer email is not included.

1. Standard prints use colours similar to the main photo. Standard pickup orders show payment instructions immediately, without a manual details review. A custom colour/special request (including legacy notes) requires **Approve request at the displayed total** before payment details appear. Do not approve a price-changing request at the old total: contact the customer and cancel/recreate the agreed order instead.
2. For delivery, check the exact address is within 50 km; record **Confirm address**. If it is outside the area, arrange pickup or cancel the unpaid order; do not ask for the $5 transfer first.
3. After confirmation, the customer's private order page shows the amount, order number and confirmed Interac email. They may call/text if their bank needs a security question.
4. Independently verify the deposit in the studio's bank account, then **Confirm e-Transfer received** with a reference. A customer's message never marks an order paid.
5. Move Paid orders through **Start production → Ready → Collected/delivered**. Refresh the dashboard after concurrent changes. Record meaningful notes; admin notes are not returned to the customer endpoint.

The confirmation URL contains a random private lookup token. Anyone given that link can view that order; do not share it publicly. Payment/admin data is never stored in browser localStorage; only cart choices are. The admin key remains in memory for that page session. Paid cancellations/refunds must be resolved separately; this integration does not initiate transfers or refunds.

## Source and license evidence

The signed-in STLFLIX profile displayed **Lifetime Commercial License**. Official commercial guidance includes marketing photos/videos for selling physical prints:

- https://stlflix.com/gift-card-2/
- https://help.stlflix.com/en/articles/7888969-stlflix-terms-of-use-conditions-of-use

Each catalog row links its original product page and each image records its original filename. The private manifest `../private-production/stlflix/sources.json` records URLs, downloaded sizes and SHA-256 hashes, plus failures. Original marketing photos were retrieved through observed authorized media-package URLs. Public galleries exclude AI-labelled images and slicer screenshots and identify images as STLFLIX references, not completed studio work.

Customer-facing supplier credits have now been removed at the owner's request. Source records remain intact. Dimensions remain in editable catalog data and are shown where they help customers choose a product. The owner confirmed prints will use similar colours to the main photo; custom colours require approval.

Production archive downloads were attempted but no STL/3MF archive was verified locally. Two PDF instructions were downloaded initially; additional available instructions are recorded privately. Four Baby Dragon media URLs returned 403; three other photos are usable. Do not claim production sources are complete until those archives are actually obtained. Never publish STL/3MF/PDF production files.

## Validation

`npm run build`, `npm run verify`, and `npm run test:shop` check prerendered routes, metadata, integer totals, quantities, delivery fees, validation, duplicate retry protection, concurrent writes, persistence after database reopening, admin authentication and allowed payment/fulfillment transitions. Browser tests also exercise local checkout and administrator updates with fictional details and no payment.

Email notifications are stored with the order before attempting delivery. The admin dashboard shows Pending, Sending, Needs retry or Accepted (accepted by provider, not guaranteed delivered). Failed sends do not remove orders. Checkout retries and administrator retries use a stable provider idempotency key. Automatic retries stop after 23 hours from the first attempt to stay within Resend's 24-hour deduplication window; inspect the provider log and contact the customer manually for older ambiguous attempts. No scheduled retry worker is configured; monitor the dashboard. Local preview renders the owner email there without sending it.

No automatic stock tracking, geocoding, card processing or shipping carrier integration is included. The order dashboard currently loads all orders and is appropriate for the initial small catalog; add pagination and a retention/export process as order volume grows.
