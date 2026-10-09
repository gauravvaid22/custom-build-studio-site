# Personalized photo holders — Drop 367

Added 2026-10-08. Source: https://platform.stlflix.com/drops/drop-367

## Offering and prices

Each order unit is one assembled **desk-version** holder plus one customer-supplied photo, printed, trimmed and fitted. Owner confirmed the photo size as **2.5 × 3.5 inches (63.5 × 88.9 mm)** on 2026-10-08. Gallery photos are personalization examples. No magnets, digital files or other props are included. These are small decorative keepsakes, not conventional full-size picture frames. Source body dimensions are recorded without inventing axis labels; photo dimensions are separate.

| Designs | Delivered CAD | Edmonton pickup CAD |
| --- | ---: | ---: |
| Daisy Duo, Sunflower Duo, Stoneside, Paw Hold, Sakura Duo, Lavender Duo | $29.99 | $19.99 |
| Up in the Clouds, Sealed Letter, Love Letter, Dino Peek, T-Rex Peek | $34.99 | $24.99 |
| Retro Cam, Analog Days | $39.99 | $29.99 |

These are recommended launch prices, not verified margins. The CAD 10 shipping allowance follows the owner's existing postage budget. Cost allowances: photo CAD 1, packaging CAD 1.50, labour 15 minutes at CAD 25/hour, machine time CAD 1/hour, material/waste CAD 1–3, fees 3% + CAD 0.30. Depending on design, this estimates roughly CAD 21.90–26.70 in delivered cost. Prices leave roughly CAD 6–15 before overhead, extra labour and tax on supplies. Confirm actual material weight, assembly time, photo-print minimum orders, postage and fees after a sample run. A blanket 25% sale can erase the smaller frames' margin.

Use multipart versions for coloured components and assemble them; source multipart times are about 58–207 minutes. Source automatic multicolour versions can take 9–28 hours and do not fit these estimates. Do not rely on these allowances for hand painting or individual trips to a photo lab.

Benchmarks researched: Michaels Canada advertises printed/framed/boxed 8×8 or 8×10 keepsakes at CAD 29 in store (https://www.michaelspressroom.com/news/detail/5031/michaels-debuts-10-minute-custom-framing-in-canada). Peterborough Print offers custom framed photos from CAD 17.48 (https://www.peterboroughprint.ca/product/custom-framed-photos/); size/shipping vary. These are broader retail comparisons, not identical sculptural holders. CAD 1 for the photo remains an allowance, not a supplier quote.

## Source assets and rights

All 13 authorized media packages downloaded to the owner's Downloads folder. Extracted originals: `private-production/drop-367/` (Git ignored). Only optimized WebP images and WebM product previews are copied to `public/media/shop/`. The source record in `commerce/photo-frames-source.json` maps original pages, selected image filenames, videos, body dimensions and source multipart times. Numbered views 1–4 were chosen for the desk version; magnet backs and alternate finishes were omitted. Production STL/3MF files never belong in public assets or Git.

Owner reports lifetime commercial rights; authenticated STLFLIX session showed Lifetime access. STLFLIX's commercial offering explicitly includes media-kit photo/video use: https://my.stlflix.com/ and https://get.stlflix.com/subscribe/. Current commercial terms: https://help.stlflix.com/en/articles/7888969-stlflix-terms-of-use-conditions-of-use. No new subscription purchased.

## Website and administration

Collection: `/shop/photo-frames/`, linked from `/shop/personalized-gifts/`. Each design has a prerendered product page, unique title/description/canonical, social image, gallery, WebM video and source body sizes. The public sitemap includes all pages. Google feed and verified Shopify offer enrichment cover the collection. Google indexing and ranking are not immediate or guaranteed.

Photo upload reuses the existing Netlify Blobs chunk-upload function. Its private unlisted reference and customer instructions are sent as Shopify line-item attributes. Each uploaded photo creates its own cart line. Quantity copies use the same photo. Missing/failed uploads cannot add an item; checkout rejects photo-holder items without a photo reference. Customer photos never enter the repository, public galleries, sitemap or product feed.

`/shop/admin/` → Product prices includes 13 photo-holder controls. Saving updates both delivered and CAD 10 lower pickup Shopify variants, and the website reads those live prices. Existing sale guards prevent overwriting active/scheduled discounts. Names remain editable in Shopify.

## Verification

Production TypeScript/client/server build and 92-page verification pass. Existing commerce tests plus the two new frame mapping/feed tests pass (26 tests). Desktop/mobile image loading, no horizontal overflow, pickup display and WebM playback checked. Complete live upload/Shopify sales-channel/checkout verification after deployment and product creation; never transfer money or place a real customer order to test.
