# Gift & Decor collection — operations

The collection is implemented at `/shop`. It has nineteen editable products, licensed reference galleries, product video where available, a quantity-aware cart and Shopify-hosted checkout. Existing service, portfolio and quote pages are preserved.

## Run the working preview

Use Node 24 for the local SQLite preview:

```sh
npm ci
npm run build
npm run preview:shop
```

Open `http://127.0.0.1:4180/shop`. Shopify checkout requires the public Storefront API variables listed below. The legacy order preview remains available for testing old orders; it never transfers money.

## Editing products and fulfillment

- `commerce/products.json`: names, integer CAD prices in cents, buyer descriptions, included items, source dimensions, gallery paths, categories and production-review flags.
- `commerce/settings.json`: fallback shipping and production settings. Shopify is the live source of truth for product prices and checkout shipping.
- `commerce/site-content.json`: fallback service prices, machine build volumes, production time and storefront shipping message.
- `public/media/shop`: web-optimized licensed product photos only. Original photos, PDFs and production sources belong outside this repository.
- Product prices are edited in Shopify. The storefront fetches Shopify prices and falls back to `commerce/products.json` if Shopify is temporarily unavailable.
- The Canada shipping profile is **Free Tracked Shipping**. The added amount is included in the displayed product prices.
- No residential pickup address is published on the storefront.

### Pickup and delivered prices

The shop remembers one fulfillment choice for the whole cart. Delivered prices include free Canadian tracked shipping; Edmonton pickup prices are $10 less per catalog unit (a five-keychain set is one unit). Size/design choices and personalization photos survive switching modes. Checkout rechecks Shopify availability and price before redirecting.

Each physical Shopify variant has a Delivered SKU and a corresponding `-pickup` SKU. Keep each pickup price exactly $10 below its delivered partner. The website admin price panel shows both and warns about missing or mismatched pickup prices. The personalized lamp price editor synchronizes both when Shopify Admin API integration is configured; otherwise use its Shopify edit link.

All 23 pickup variants belong to **Edmonton pickup only**, whose sole free Canada rate is **Edmonton pickup by appointment — no delivery**. Delivered variants remain in the General free-shipping profile. Do not move pickup variants into General, or Shopify could offer shipping at the pickup price.

This is manual scheduled collection, not Shopify native local pickup: native pickup would expose the residential location before payment. Shopify still requests the customer's contact address. After receiving a pickup order, email the customer privately to arrange a time and provide the pickup address, then mark it fulfilled after collection. Never send a shipping label for a pickup order. No additional app subscription is required. Shopify's order-confirmation template detects `-pickup` SKUs and explains collection arrangements; its fulfillment email uses a collected-order message for those SKUs. Delivered-order body copy remains intact.

Tracked inventory is separate for the two fulfillment variants. The existing five dinosaur sets were allocated as three Delivered and two Pickup, retaining five total. Rebalance these counters as needed; no shared-stock synchronization is installed. Other existing made-to-order products retain their original untracked inventory settings.

## Before a Netlify launch

1. Obtain/verify each production archive, slice/test the intended version, and confirm material, finish and assembly/hardware before manufacturing. `productionReviewed` records physical production review separately from storefront approval.
2. Keep `SHOP_ADMIN_KEY` as a unique production-only Netlify secret. It protects `/shop/admin` and the editable website settings stored in Netlify Blobs.
3. Configure `VITE_SHOPIFY_STORE_DOMAIN` and `VITE_SHOPIFY_STOREFRONT_TOKEN` in Netlify. The token must expose products and cart creation through Shopify's Storefront API.
4. Maintain prices, variants, availability and the Canada shipping profile in Shopify. The website administrator provides direct Shopify edit links but does not store a Shopify Admin API token.
5. After catalog or shipping changes, test one cart through the Shopify address step without making a payment.

## Managing orders

Open `/shop/admin` and enter the private admin key. The dashboard now has three areas:

1. **Orders** keeps the historical Netlify/e-Transfer records available for reference. New Shopify orders are managed in Shopify Admin.
2. **Website settings** edits starting service prices, hourly rates, FDM/resin build volumes, production time and the free-shipping message. Changes persist in Netlify Blobs and update public pages without a new code deploy.
3. **Product prices** shows current Shopify-backed prices and opens each item in Shopify Admin. Shopify remains the secure price, variant, payment and fulfillment authority.

## Source and license evidence

The signed-in STLFLIX profile displayed **Lifetime Commercial License**. Official commercial guidance includes marketing photos/videos for selling physical prints:

- https://stlflix.com/gift-card-2/
- https://help.stlflix.com/en/articles/7888969-stlflix-terms-of-use-conditions-of-use

Each catalog row links its original product page and each image records its original filename. The private manifest `../private-production/stlflix/sources.json` records URLs, downloaded sizes and SHA-256 hashes, plus failures. Original marketing photos were retrieved through observed authorized media-package URLs. Public galleries exclude AI-labelled images and slicer screenshots and identify images as STLFLIX references, not completed studio work.

Customer-facing supplier credits have now been removed at the owner's request. Source records remain intact. Dimensions remain in editable catalog data and are shown where they help customers choose a product. The owner confirmed prints will use similar colours to the main photo; custom colours require approval.

Production archive downloads were attempted but no STL/3MF archive was verified locally. Two PDF instructions were downloaded initially; additional available instructions are recorded privately. Four Baby Dragon media URLs returned 403; three other photos are usable. Do not claim production sources are complete until those archives are actually obtained. Never publish STL/3MF/PDF production files.

## Validation

`npm run build`, `npm run verify`, `npm run test:shop`, `npm run test:browser`, and `node tests/gift-discovery.cjs` check prerendered routes, metadata, catalog prices, cart quantities, responsive layouts, Shopify checkout handoff, admin authentication and editable site content.

Email notifications are stored with the order before attempting delivery. The admin dashboard shows Pending, Sending, Needs retry or Accepted (accepted by provider, not guaranteed delivered). Failed sends do not remove orders. Checkout retries and administrator retries use a stable provider idempotency key. Automatic retries stop after 23 hours from the first attempt to stay within Resend's 24-hour deduplication window; inspect the provider log and contact the customer manually for older ambiguous attempts. No scheduled retry worker is configured; monitor the dashboard. Local preview renders the owner email there without sending it.

No automatic stock tracking, geocoding, card processing or shipping carrier integration is included. The order dashboard currently loads all orders and is appropriate for the initial small catalog; add pagination and a retention/export process as order volume grows.
