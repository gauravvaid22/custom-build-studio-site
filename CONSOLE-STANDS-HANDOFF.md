# Community Drop 26 — console stands

Prepared 2026-10-08. Local preview: http://127.0.0.1:4181/shop/console-stands
Not deployed and not created in Shopify yet. The existing live shop is unchanged.

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

## Required owner information before release

An asynchronous question is pending: will the owner supply the correct mounting screw
and verify the original PS5 / PS5 Slim fits and stability before selling?
Do not claim included mounting hardware until that is confirmed. Do not invent screw
specifications or assume that Sony's different console models use interchangeable hardware.
Cyber Core's source description says horizontal, but its source marketing images show
an upright console. Buyer copy intentionally avoids an unverified orientation claim;
confirm the installation before release.

`commerce/console-stands-source.json` has `launchReady: false` and release notes.
The protected Shopify creation endpoint refuses release until these details are resolved.
All current changes are a local preview; do not report live checkout verification.

## Release steps after confirmation

1. Update included-items/installation copy and the source release notes using the owner's answer.
2. Set `launchReady` only when the offering is confirmed; rerun the importer if modifying source descriptions.
3. Build and push the focused changes to the connected Netlify repository.
4. Load the updated admin dashboard; owner must unlock it again if its temporary session cleared.
5. In Product prices → PS5 Console Stands, create each of the six Shopify products once.
   The Original and Slim controls refer to the same parent handle; creation is idempotent.
6. Publish those six products to the existing My Store Headless sales channel.
7. Assign only their twelve pickup variants to the existing Edmonton pickup shipping profile.
   Leave delivered variants under the free tracked Canadian shipping profile.
8. Verify all 24 Shopify variant prices/SKUs, each fit selector, delivery/pickup cart lines,
   hosted checkout shipping method and merchant-feed entries. Do not pay or place a real order.
9. Save the verified live URLs/status here.

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
- Live Shopify creation, checkout and publishing remain pending as described above.
