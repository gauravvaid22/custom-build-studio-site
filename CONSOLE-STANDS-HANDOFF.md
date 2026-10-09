# Community Drop 26 — console stands

Prepared 2026-10-08. Local preview: http://127.0.0.1:4181/shop/console-stands
Published to Netlify main@24cd318. Live collection: https://custombuildstudio.ca/shop/console-stands/
Six Shopify products created and published to My Store Headless on 2026-10-09.

## Products and proposed CAD prices

| Product | Delivered (shipping included) | Edmonton pickup | Source stand height |
|---|---:|---:|---:|
| Neon Cityscape | $64.99 | $54.99 | 120 mm |
| Organic Grid | $54.99 | $44.99 | 140 mm |
| Runestone | $59.99 | $49.99 | 150 mm |
| Cyber Core | $49.99 | $39.99 | 80 mm |
| Crescent Moon | $49.99 | $39.99 | 190 mm |
| Mecha Moon | $54.99 | $44.99 | 190 mm |

Each model has Original PS5 and PS5 Slim choices, currently the same price.
These are source-designed fits, not owner-tested fits. PS5 Pro is not offered.
Prices are estimates. Review actual slicer grams, finish/assembly time, mounting
hardware, packaging and postage before confirming margins or discounting.
Source Bambu P1S print times range approximately 5–11 hours for the selected
monocolour/multipart approaches; automated multicolour versions can take much longer.
Official Sony vertical stand reference: CAD $39.99 at Canada Computers, listed sold out
at review: https://www.canadacomputers.com/en/ps5-gaming-controllers/247957/sony-playstation-5-slim-vertical-stand-711719578918.html

## What is complete

- Six product parents and twelve option entries in the existing catalog.
- Gaming & Desk membership and a dedicated Console Stands collection.
- 41 selected licensed product views, optimized at 480 and 1200 pixels, plus six WebM videos.
- Stand-only main photos; console placement examples later in each gallery.
- Slicer screenshots and alternate single-colour examples excluded from public galleries.
- Console-model selectors, stand height, included-items copy, model-fit guidance and contact link.
- Twelve independent admin price controls; saving changes the corresponding delivered/pickup Shopify SKUs.
- Shopify creation payload supports four variants per product: two console models × two fulfillment modes.
- Existing single-option product creation behavior remains unchanged.
- Collection routes now read the collection data automatically, including Photo Holders and Console Stands.
- Prerendered metadata/sitemap, search-discovery collection membership and edge offer-enrichment paths.
- Production archives and STL/3MF files are private and Git-ignored.

## Release status — 2026-10-09

Owner approved release with “Go head” in reply to the mounting-hardware/fit question.
Included-items copy now includes the matching mounting screw. Source launchReady is true.
Do not claim source fits have been physically tested. Check fit, mounting and ventilation
in production; Cyber Core copy deliberately avoids conflicting source orientation claims.

Products were created through a focused Shopify CSV import because the owner deferred
unlocking website admin. Import preview: 6 products, 24 SKUs, 41 photos; no overwrite.
All six published ONLY to My Store Headless. No other catalog products were changed.

| Handle | Shopify product ID |
|---|---|
| neon-cityscape-console-stand | 15413777629483 |
| organic-grid-console-stand | 15413777727787 |
| runestone-console-stand | 15413777760555 |
| cyber-core-console-stand | 15413777826091 |
| crescent-moon-console-stand | 15413777891627 |
| mecha-moon-console-stand | 15413777924395 |

Each product has Console model (Original PS5 / PS5 Slim) × Fulfillment
(Delivery / Edmonton Pickup). Delivered SKU equals child website ID;
pickup SKU adds -pickup. Inventory untracked, physical shipping required, taxable false.
No production weights were invented. All 12 pickup variants assigned to shipping profile
136310980907 (Edmonton pickup only), preserving previous selections. Its sole free rate
is “Edmonton pickup by appointment — no delivery”. Delivery variants remain General profile.

Protected admin login check remains deferred by owner. The 12 editable controls were deployed;
creation recognizes existing handles and price saving targets the matching child SKUs.
Do not create duplicate products. Owner should unlock admin for read-only final verification.

## Assets and source record

Source: https://platform.stlflix.com/drops/community-drop-26
Product URLs, selected filenames, print times, proposed prices, archive names and
license evidence are recorded in `commerce/console-stands-source.json`.
Owner previously confirmed a lifetime commercial subscription. The authorized session
allowed media/production downloads for all six products. Official media usage reference:
https://help.stlflix.com/pt-BR/articles/14844512-diferenca-entre-plano-pessoal-e-comercial

Media and extracted production packages:
`private-production/community-drop-26/` (never deploy this folder).
Original ZIP downloads: `C:/Users/User/Downloads/`.
Public media: `public/media/shop/<product-id>/`.
Reimport command: `python scripts/import-console-stands.py private-production/community-drop-26`.

## Verification

- Production build passed: 99 prerendered pages.
- Build verification passed for pages, links, images, metadata and Netlify form schema.
- 29 commerce, discovery, sales, photo, console and Shopify authentication tests passed.
- Browser verified all twelve choices, prices and source heights at a 375 px mobile viewport.
- No horizontal overflow at 375, 805 or 1265 px. Product hero images loaded for all six pages.
- Two Neon Cityscape Slim units: pickup CAD $109.98; delivered CAD $129.98, shipping free.
- Cart survived reload; test items removed afterwards.
- Video gallery selects the WebM source with `preload=metadata`; no browser console errors observed.
- Shopify saved export audit passed: 24 exact SKUs/prices, physical shipping true,
  taxable false, inventory untracked; 41 photo records.
- Hosted checkout verified Neon Cityscape PS5 Slim / Delivery at CAD64.99 and
  PS5 Slim / Edmonton Pickup at CAD54.99; mixed cart totals118.58/88.58 correct.
  No email/address/payment entered, no order placed. Shipping-rate selection with a
  real destination was not submitted; pickup profile configuration verified in Shopify.
- Original two owner cart items preserved; only test stand removed and delivered mode restored.
- Public /google-products.xml contains all12 Original/Slim delivered offers with correct
  prices and variant URLs. Google indexing/ranking is not guaranteed or instant.
- Website videos remain available; Shopify CSV imports photos only.
- Shopify displays an existing failed CAD1.05 billing alert. Owner must resolve billing
  in Shopify; no billing/payment settings changed.
- Proof: ../console-stands-live.jpg.
