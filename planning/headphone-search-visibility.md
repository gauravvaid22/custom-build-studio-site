# Product search visibility handoff — 2026-10-08

## Live implementation

- Headphone stands and Halloween products retain the existing Shopify checkout and site layout.
- SEO copy: commerce/headphone-search.json and commerce/mask-search.json.
- commerce/search-discovery.json controls discovery collections, store, country and shipping price.
- commerce/search-discovery.mjs reads delivered SKU prices and availability from Shopify; unsupported, missing or non-CAD offers are excluded. Size/design variants have separate feed entries and grouped structured data.
- Public feed: https://custombuildstudio.ca/google-products.xml (google-headphones.xml remains an alias).
- Netlify function shop-discovery uses the existing VITE_SHOPIFY_STOREFRONT_TOKEN available to Functions.
- netlify/edge-functions/headphone-search.ts inserts verified schema into initial product HTML. It changes metadata only, preserving React hydration. Client navigation also fetches verified schema.
- Feed links explicitly select delivered fulfillment and the correct variant. Edmonton pickup remains $10 lower; private pickup address is not published.
- Preserve unrelated untracked user files.

## Verified

Production build and npm run verify pass for 77 HTML pages; node --test tests/discovery.test.mjs passes three meaningful tests. Public feed parses 25 CAD offers. Live mask size prices match Shopify, and the fresh Medium mask page has no captured console errors after the hydration fix. Main service/shop routes are publicly accessible and indexable.

Implementation commits include 3c7c4de, c387062, 0adbb1b and d232830, pushed to main and deployed through Netlify.

## Google accounts and actual status

- Search Console URL-prefix https://custombuildstudio.ca/ verified for the owner-authorized Google account. Keep public/google7f6c88e78b93bf92.html permanently.
- Sitemap submitted: 68 public URLs. Google currently reports Couldn't fetch despite a valid public XML/HTTP 200 response. Recheck Google processing; do not repeatedly resubmit or change a working sitemap without evidence.
- Priority indexing requests accepted: headphone collection, Flow headphone stand, Pumpkin Head mask and Carved in Fear mask. Acceptance is not confirmation of indexing.
- Merchant Center account 5871050982 created after explicit terms approval. Online store with appointment pickup, not a staffed retail store.
- Data source 10762737798: Website — Headphones & Halloween. Daily URL feed, English, Canada, free listings only. Google imported all 25 options with no feed processing issues. Overview shows 25 under review, zero approved, and 3 of 6 setup tasks complete.
- No paid campaigns or budget changes made.

## Remaining setup

Owner authorized submitting the workshop address to Google and supplied its postal code. Keep private address details out of this repository and public website. The business-address onboarding route and Business info Details route currently render a blank body; fresh tab and dashboard navigation did not resolve it. Do not claim the address was submitted. Resume when Google's form is usable, then complete remaining website ownership, shipping/returns and any verification requirements shown by Google. Use existing confirmed policies only; do not invent them. User must supply any requested verification code.

Merchant Center: https://merchants.google.com/mc/overview?a=5871050982
Search Console: https://search.google.com/search-console?resource_id=https%3A%2F%2Fcustombuildstudio.ca%2F

Google approval, indexing, rankings and traffic cannot be guaranteed. For later catalog expansion, review actual variants, included items, images, dimensions, categories and fulfillment first, then extend configured scope and edge path coverage.

## References

- https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- https://support.google.com/merchants/answer/7052112
- https://support.google.com/merchants/answer/14987622
