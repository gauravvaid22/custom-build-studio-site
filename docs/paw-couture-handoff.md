# Paw Couture product launch — 12 October 2026

Source: https://platform.stlflix.com/drops/community-drop-23

Owner confirmed fully assembled standard-size products, including the costume elastic, straps and costume accessories. No tested pet head/neck circumference has been supplied. The page must never claim universal fit. Source model heights are reference accessory heights, not neck measurements. Photos show the intended finishes; pets, collars and tags are props.

One grouped listing: `paw-couture-pet-costume-designs`. New department `pet-accessories`, subcollection `pet-hats-costumes`; also linked from Halloween. Supplied cover is first in the overview; selecting a design shows its gallery/video and price. Decorative PLA, short supervised photo sessions; not a chew toy or walking harness.

| Design | Delivered CAD | Edmonton pickup CAD |
|---|---:|---:|
| Party Hat | 24.99 | 14.99 |
| Yay Cap | 29.99 | 19.99 |
| Officer Woof | 29.99 | 19.99 |
| Glam Wave | 29.99 | 19.99 |
| Emo Bangs | 29.99 | 19.99 |
| Dino Crown | 34.99 | 24.99 |
| Pharaoh Cat | 34.99 | 24.99 |
| Little Saint (halo + wings) | 39.99 | 29.99 |
| Little Devil (horns + wings) | 39.99 | 29.99 |

Delivered prices include standard tracked Canadian shipping. Prices are provisional: actual material, machine, finishing, packaging and carrier costs are unknown. Compare against local finished pet accessories, not digital files. Edmonton [Soul of Halloween](https://soulofhalloween.ca/collections/pet-costumes) lists CAD29 lion mane, CAD32 bat wings and CAD35 angel set; those are functional price references, not identical products or verified delivered totals. [Walmart Canada](https://www.walmart.ca/en/ip/QJUHUNG-Halloween-Angel-Wings-Shape-Pet-Costume-Pet-Makeover-Clothes-Fancy-Cosplay-Costume-Pet-Clothes-Supplies-for-Cat-Pet/567Z7DX90JR5) shows CAD19.49 angel wings including seller delivery. This studio's assembled sculptural sets justify a higher provisional price; profitability is not guaranteed.

Media: 43 selected design images plus the owner's collage, each at 480/1200 WebP; nine original WebM clips for the website. Inspected contact sheets and three sampled frames per video. Excluded slicer screenshots, loose buckle assembly diagrams, monochrome versions and misleading alternate finishes. Real H.264 MP4 upload copies are under `.tmp/paw-couture/shopify-videos/`, outside public. Original archives are private Downloads/source work folders.

Isolated checkout `paw-couture-worktree`, branch `codex/paw-couture`. Preserve unrelated drafts in `site-current`. Staged commit c712805, Netlify deploy 6acd5f3546ffd823f400a0fa (Published). Baseline launchReady=false keeps buyable launch blocked until Shopify and admin publication complete. Per-design review UI commit 2b8ee5b preserves individual launch and separate fulfillment gates.

Build and verify passed: 143 generated pages; 11 existing shop tests passed. Local selection switches to six Little Devil photos and one video; video metadata decoded (readyState=4, no error). Browser viewport override did not apply to the preview tab on first attempts; actual mobile width needs verification, not an assumed check.

Remaining at time of this ledger: attach nine Shopify videos through the unlocked admin, individually confirm all reviewed records, save/publish, wait for Shopify/Netlify Live, check delivery/pickup checkout and durable category membership, enable Pet department in managed shop display, verify feed/sitemap/live gallery. Never record admin keys or browser tokens.

## Latest state

Owner explicitly requested ending the sale permanently, not pausing/restarting it. Sale restoration first stopped at a deleted grumpy-kitty-planter. Commit 39712e8 fixes restoration to skip genuinely deleted Shopify products only; existing missing variants and manual price edits still block restoration. Nine sale tests pass, including deleted-product recovery and preserving manual edits. Recovery succeeded; admin shows No active sale. Do not restart it.

Published infrastructure commits: c712805 (assets/draft), 2b8ee5b (individual readiness control), 775bc33 (Sales panel cookie use), 194b4e7 (Shop display cookie use), 39712e8 (sale recovery). Latest Netlify published deploy: 6acd62739de1902209d14b4e.

The pet draft is saved through the real admin with fulfillment confirmed and all ten records individually reviewed/launchReady=true. Public snapshot revision 9 still has baseline launchReady=false because Publish has not run. The final Publish saved draft button was clicked; its native confirmation blocks automation. Owner was asked to click OK/Confirm. Never claim the pets are live until the job completes and public page is checked.

Responsive preview passed on a visible tab at actual width390, document width375, no overflow. Little Devil has six photos plus one video; pickup CAD29.99 and cart total29.99, compared with delivered39.99. Website videos: all nine WebMs. One Party Hat H.264 video uploaded to Shopify Files but not attached/saved in the current document; Shopify product video attachment has not been completed. The website video requirement is fulfilled in the saved draft. Never claim all Shopify videos are attached.

Verified: build plus generated-site verification; 11 shop tests, 15 catalog-management tests and 9 sales tests. Standard Vite large-chunk warning remains pre-existing.

Browser session2 now only has owner admin tab152 (https://custombuildstudio.ca/shop/admin/?analytics_test=1) plus temporary deployment tab if not closed. Current authenticated session works. A page refresh initially shows login then loads authenticated dashboard asynchronously; do not ask for a key based solely on the loading state. Cookies are HttpOnly; do not extract them. Empty Authorization Bearer headers previously prevented cookie authentication in Sales/Shop display; client fixes omit those empty headers.

## Completed launch

Paw Couture is LIVE. Admin publish completed, catalog revision10; Netlify hook deploy 6acd63302f60ca2d70941462 Published. Public Pet accessories and Pet hats & costumes collections exist; Pets navigation is enabled. All nine physical Shopify designs were created with delivery and pickup variants by the managed sync, which verifies every variant price. Website overview includes supplied collage +43 selected images and nine videos. Selection narrows to the chosen gallery.

Live checks: Little Devil six photos/one video, video readyState4 with no decode error. Shopify hosted checkout shows Party Hat Delivery24.99 and Edmonton Pickup14.99 CAD; mixed existing dinosaur bundle totals74.98 delivery and54.98 pickup. No address/payment submitted, no paid order created. Original dinosaur cart item preserved, added Party Hat test item removed, Delivered mode restored.

SEO: live canonical, ProductGroup structured data, sitemap listing/category inclusion and nine pet design entries in Google product feed verified. This makes pages crawlable; actual Google indexing/ranking is not guaranteed. Standard pet head/neck measurements remain untested, clearly disclosed. Website videos are complete; Shopify Files contains one unattached Party Hat upload, not all Shopify product video attachments.

Production-equivalent local build exported live revision10 (103 product records), prerendered/verified137 HTML pages. Actual live phone category at390px has page width375, no overflow. Final cover QA found category hero cropping collage hats; final CSS uses existing explicit shop-overview-cover flag to contain collage images in collection heroes/cards and Halloween cards. This preserves supplied cover contents without changing ordinary single-image crops.

Changed code/data: commerce/catalog-baseline.json, commerce/products.json, commerce/collections.json, commerce/shop-merchandising.json, commerce/paw-couture-source.json, src/lib/shopDiscovery.ts, src/pages/Shop.tsx, src/shop.css, src/components/ProductManager.tsx, src/components/SaleAdmin.tsx, src/components/ShopDisplayAdmin.tsx, commerce/sales.mjs, tests/sales.test.mjs. New public pet media folders plus this handoff. Existing site-current drafts remain untouched.
