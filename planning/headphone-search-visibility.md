# Headphone search visibility handoff — 2026-10-08

## Live implementation

- Six headphone stand products remain connected to Shopify Headless checkout.
- Product SEO titles/descriptions: `commerce/headphone-search.json`.
- Collection buying guide/FAQ uses existing site components.
- `commerce/search-discovery.json` defines the discovery scope, store, country and shipping price. Expand deliberately when other categories have been reviewed.
- `commerce/search-discovery.mjs` reads current delivered SKU prices and availability from Shopify. No fabricated stock, reviews or product identifiers.
- Public feed: https://custombuildstudio.ca/google-headphones.xml
- Function: `netlify/functions/shop-discovery.mjs`; needs existing `VITE_SHOPIFY_STOREFRONT_TOKEN` available to Functions.
- `netlify/edge-functions/headphone-search.ts` adds verified Product Offers and breadcrumbs to the initial product HTML. Falls back to normal pages if Shopify is unavailable.
- Feed links use `?fulfillment=delivered` to show the Canadian delivered price even if a previous visitor selected pickup.
- Free tracked Canadian shipping; Edmonton pickup by appointment remains $10 lower. No residential address is published.

## Checks

Production build and `npm run verify` pass (77 HTML pages). `node --test tests/discovery.test.mjs` passes. Public feed returns six CAD offers, and all six public product HTML responses contain current Shopify Offers. Website commits: `3c7c4de`, `c387062`.

## Google accounts

Search Console URL-prefix https://custombuildstudio.ca/ verified for gauravvaid22@gmail.com with explicit user approval. Keep `public/google7f6c88e78b93bf92.html` permanently. Sitemap submitted; initial Google status says Couldn't fetch, although direct public HTTP check returns valid XML with 68 URLs, including collection and six headphone products. Recheck Google processing before changing a working sitemap.

Merchant Center onboarding uses online store, no staffed physical retail store (owner confirmed online, pickup and delivery). Account terms acceptance is awaiting user approval. No paid ads created. Feed is ready but not yet registered in Merchant Center. Do not claim free listings are approved until Google confirms.

## Next actions

Google accepted explicit indexing requests for the headphone collection and Flow product into its priority crawl queue. All six products are in the submitted sitemap. Complete Merchant Center free listings onboarding after terms approval, and review Google's sitemap fetch status. If asked for private address or binding terms, obtain the specific necessary approval. Check approved shipping/returns against the website and Shopify; do not invent policies. Rankings and traffic cannot be guaranteed.

## Primary references

- https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- https://support.google.com/merchants/answer/7052112
- https://support.google.com/merchants/answer/14987622

For later product expansion, review accurate variant prices, included items, dimensions, material, images, fulfillment and category copy first. Preserve existing unrelated content and user files.
