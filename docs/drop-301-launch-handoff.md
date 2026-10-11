# Drop 301 — local preview; not published

Prepared 2026-10-11. Last public release before this work: 9861e68.

## Prepared

- One parent listing: `straw-topper-charm-designs`, six child design SKUs.
- Home & living > Tumbler accessories. Initial all-design gallery, selection filters media.
- 47 reviewed product photos, six original WebM clips, optimized 480/1200 WebP images.
- Media packages retained outside repository under `../private-production/tumbler-accessories-2026-10-11`.
- Source record `commerce/tumbler-accessories-source.json`; idempotent import script.
- Owner confirmed complete assembled topper + handle charms + chain/rings.
- Proposed CAD item prices: reaper 14.99, cat 15.99, octopus 15.99, cow 16.99, panda 14.99, dragon 17.99.
- Admin source connected, creation blocked by launchReady=false. Prices below $15 will need product-specific admin validation before launch.
- Every new catalog entry has launchReady=false; add-to-cart is disabled and Cart.add rejects unreleased products.
- Preview prices ignore the global pickup subtraction until pickup pricing is confirmed. Existing catalog pricing is unaffected.
- Build, static verification and all grouped galleries passed before final preview guard; rerun final checks after guards.

## Pending owner answers

1. User promised a collection cover image; none supplied for this drop yet.
2. Tested straw diameter. Source provides approximate accessory heights only, not compatibility. Do not claim universal Stanley fit or food-safety certification.
3. Async question pending: same item price for pickup/no shipping vs existing $10 pickup reduction; recommend same price and $5 shipping once per shipped order containing this collection.

## Complete before public release

- Confirm fulfillment rule before modifying prices or live shipping settings.
- Add configurable per-product pickup difference/shipping profile to catalog, storefront fallback, managed product generator/update-price and admin copy/validation.
- Make product, cart, checkout, fulfillment selector, policies and Google feed accurately show this shipping exception. Existing pages currently assume free shipping; do not deploy this preview as a completed shipping implementation.
- Shopify existing custom profile 136310980907 is "Edmonton pickup only", free rate "Edmonton pickup by appointment — no delivery", 63 products. Native Shopify admin is authenticated. Inspect products/variant assignment before changing membership.
- Recommended separate Shopify profile for six delivery variants with a CAD $5 Canada rate; pickup variants in existing free pickup profile. Mixed existing free-shipping + new profile should total $5; verify rather than assume.
- Native Shopify CSV import is available without website admin login. Create six physical products with delivery/pickup SKUs using confirmed prices; do not overwrite other handles.
- Verify real unpaid hosted checkouts: new-only, multiple new items, mixed cart, pickup. Never pay or place real orders for tests.
- Add tumbler-accessories to search-discovery collectionIds and product-specific shipping in feed/schema after real shipping is verified.
- Apply owner cover using existing optimized cover/galleryOverviewCover pattern.
- Mark launchReady=true only when ready in both catalog and source; update importer to retain confirmed settings on rerun.
- Rebuild/test then commit only intended files, deploy, verify live prices/media/checkout. Unrelated existing untracked files must remain untouched.

## Local preview

http://127.0.0.1:4173/shop/straw-topper-charm-designs/?analytics_test=1&fulfillment=delivered

The existing Node static preview server serves dist. This preview is not on the public website and Shopify products have not been created.
