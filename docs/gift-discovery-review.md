# Gift collection discovery review — 23 September 2026

Prepared locally for review; this work has not been published.

## Verified findings and changes

- Live `/shop/mood-ghost` returns 301 to `/shop/mood-ghost/`, which returns 200. A nonexistent product returns a genuine 404. Keep existing slugs; canonical and sitemap URLs now use final trailing-slash URLs.
- Initial product HTML already includes headings, prices and Product JSON-LD, but JSON-LD had no offers despite `catalogApproved: true` and `pricesAreProvisional: false`. Offers now use the same catalogue cents as checkout, with CAD, seller and new condition. InStock means available to order, not shelf inventory; visible copy says made to order, with payment verification before production. No inventory counts or delivery promises were added.
- Mood Ghost and Octopus now use ProductGroup with pattern/size variants and individual SKU/price/URL values. Variant URLs use `?variant=SKU`, preselect the right option, and canonicalize to the parent. Child SKU records stay out of the sitemap. Cart/checkout/order/admin remain noindex.
- Social image metadata incorrectly declared every image 1200 × 630. Removed those unverified dimensions. Client navigation also updates image alt metadata.
- Product images now use catalogue alt text rather than generic numbered product labels. Supplier reference labels were removed from old image descriptions. Responsive derivatives, lazy thumbnails and explicit layout dimensions are retained. View-specific descriptions still need a full photographic audit where older catalogue assets only describe the product.
- Added visible product breadcrumbs, category-matched related links and a homepage collection entry. All products have ordinary HTML links. Added one prerendered Halloween category for its four complementary products. Two gaming products and two planters do not yet justify separate narrow landing pages; existing filters remain available.
- Navigation now says Gifts & Décor; collection heading says Unique Gifts & Décor, Made in Edmonton. Product type/use is prominent, with 3D printing, ordering, pickup/delivery and care information in details. No unverified care temperatures, waterproof claims or food-safety claims added.
- Corrected Mood Ghost B cart image to its actual design-B gallery photo.
- Existing GA4 ID is G-8D08Z57Q3S. Added view_item, successful add_to_cart and begin_checkout at the cart-to-checkout action. Events use catalogue fields and quantities only; no customer details or private order URLs. Existing privacy exclusion for checkout/order/admin remains. Direct entry into checkout is consequently not counted by this action event.
- Reaching the per-item quantity limit previously still announced a successful add. Over-limit additions now return false and clear success feedback.
- Order creation remains an unpaid order, not a GA purchase. No purchase event is emitted on e-Transfer instructions, self-reported transfer or order submission. Reliable paid-purchase reporting requires a server-side event at the verified-payment transition, a GA4 Measurement Protocol secret, suitable consent handling and durable deduplication by order number. This is deliberately pending account setup, not a browser event fired by an administrator.

## Naming review

| Before | After |
|---|---|
| Skeleton Chameleon | Skeleton Chameleon Figurine |
| Basilisk Dice Tower | Unchanged |
| Articulated Baby Dragon | Articulated Baby Dragon Figurine |
| Glutton Ghost Bowl | Glutton Ghost Decorative Bowl |
| Grumpy Kitty – Planter | Grumpy Kitty Cat Planter |
| 6-Finger Alien Hand Controller Holder | Unchanged |
| Articulated Hermes, the Hermit Crab | Hermes Articulated Hermit Crab |
| Verdant Remains – Planter | Dragon Skeleton Planter — Verdant Remains |
| Joyful Axolotl | Joyful Axolotl Figurine |
| Pumpkin Fidget Keychain | Unchanged |
| Night Owl Wall Light | Unchanged |
| Octopus Wine Bottle Holder | Unchanged |
| Mood Ghost | Mood Ghost Figurine |
| Ghost Arch Wreath | Halloween Ghost Arch Wreath |

## Research and limitations

A small current search sample covered Edmonton unique/local gifts and actual product phrases including octopus wine bottle holders, gaming gifts and decorative planters. Edmonton retailers Shop Chop and Zocalo use gift, décor and planter language; that supports clarity, not a claim about search demand. These keyword choices are hypotheses, with no invented volumes. No authenticated Search Console/GA4 exports were available in this work; no account baseline or ownership is claimed.

Sources:
- https://developers.google.com/search/docs/appearance/structured-data/product-variants
- https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
- https://support.google.com/merchants/answer/12756116?hl=en
- https://support.google.com/merchants/answer/12079604?hl=en
- https://support.google.com/merchants/answer/14011730?hl=en
- https://shopchop.ca/
- https://www.shovelworks.com/

## Merchant Center and business accounts

Do not submit a feed yet. Free listings require a functioning purchase flow, clear contact/conditions, and a public return/refund policy. Google gives invoicing as a conventional-payment example; this does not independently establish approval of this exact e-Transfer workflow. Confirm acceptance with Merchant Center support. Configure only the actual Edmonton service area; do not advertise Canada-wide shipping or treat pending production as store pickup stock. Local inventory programs need separate eligibility review because this is made-to-order pickup by arrangement, not confirmed on-shelf retail inventory.

Owner decisions needed: return eligibility/window, defective items, refund timing, who pays return costs; confirm whether standard e-Transfer orders can complete without further seller approval and how regional delivery restrictions will be represented. No return policy, feed approval or enrollment has been fabricated.

Public code consistently uses custombuildstudio@gmail.com and 780-203-0081. Business Profile link already exists. In the authenticated profile, confirm the same contact details and service area; use `/shop/` as an additional product/website destination where supported, upload actual finished-product photos and keep any residential pickup address private. Profile settings were not accessed or changed.

Search Console: sign in yourself at https://search.google.com/search-console and choose/add the Domain property `custombuildstudio.ca`. If unverified, copy Google's exact TXT verification value (starts `google-site-verification=`) into the domain's authoritative DNS at host `@`, then click Verify. Supply that exact generated value if DNS implementation is needed; do not share a password. A public page cannot establish whether the domain is already verified by DNS.

Baseline: Performance → Search results → last 3 months → search type Web; filter page containing `/shop/`; export Queries, Pages, Devices and Countries. Repeat with search type Image. Record impressions, clicks, CTR and position; separate branded/non-branded and Halloween/evergreen pages. Export GA4 landing pages and ecommerce events for the same dates. Compare verified paid orders in the existing order dashboard separately until server-side purchase reporting is configured.

## Validation

Changed implementation files: `commerce/products.json`, `src/App.tsx`, `src/components/Shared.tsx`, `src/components/Cart.tsx`, `src/components/Analytics.tsx`, `src/components/Seo.tsx`, `src/data/seo.ts`, `src/pages/Home.tsx`, `src/pages/Shop.tsx`, `scripts/prerender.mjs`, `scripts/verify-build.mjs`, `tests/browser.cjs`. Added `tests/gift-discovery.cjs` and this report. Existing product URLs, media files, prices and fulfilment settings are preserved.

Business facts still needed: final printed dimensions for products marked pending in the catalogue; material-specific care, planter drainage/watertightness and light power/mounting details. These were not inferred from decorative photos.

Production build and HTML verification pass for 52 routes. Existing eight shop/backend tests pass. `node tests/gift-discovery.cjs` checks all 14 public product schemas and canonical URLs against catalogue prices, plus desktop/mobile (1440/390) pages, Halloween category, query-selected variants and cart success. The complete browser suite passes 96 route/viewport checks with no reported accessibility violations or browser errors. Sitemap image entries now include the public product galleries alongside canonical page URLs.

Google Rich Results Test has not been completed against the unpublished revision; run Code mode with generated product HTML or test live URLs after approval/deployment. Local checks cannot prove Google's rich-result eligibility or indexing. GA4 DebugView receipt needs authenticated account access and production testing; localhost intentionally sends no analytics.

## 30 / 60 / 90 days after release

- 30 days: submit sitemap in Search Console; inspect collection, category and representative product URLs; check indexing, product enhancements, Web/Image impressions and event receipt. Establish paid-order counts and organic landing-page baseline. Halloween demand is approaching and should be measured separately.
- 60 days: compare query/page CTR, product views → cart → checkout and verified payments; improve titles/photos only where the evidence indicates a problem. Account for Halloween ending rather than treating its seasonal decline as a technical failure.
- 90 days: compare evergreen products and holiday-gift traffic separately from Halloween. Prioritize products generating paid orders, test one content/image change at a time, and evaluate Merchant Center only after policy/payment/fulfilment requirements are resolved.

No ranking, indexing-time or revenue guarantees.
