# Shop sales

The Sales tab at `/shop/admin/` controls one promotion at a time. An administrator can choose a percentage, a whole-shop/category/product scope, a title, a start and end date, and the lowest allowed pickup sale price. Preview reads current prices from Shopify and shows every delivered and pickup option. Activation writes the discounted prices and compare-at prices to Shopify, verifies them, then exposes percentage badges, artwork, and `/shop/sale/` on the website. The checkout uses Shopify's live variant prices.

## Private setup

Install a Custom Build Studio Shopify app with `read_products` and `write_products` scopes. Put its Client ID and Client Secret into Netlify production environment variables `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`. The older `SHOPIFY_ADMIN_ACCESS_TOKEN` is also supported if already available. The existing `SHOP_ADMIN_KEY` protects the admin screen and sale mutations. Keep all of these out of Vite variables, source control, and public pages. The storefront's existing `VITE_SHOPIFY_STOREFRONT_TOKEN` remains public and cannot change prices.

The Shopify store must use CAD. Every sale product must have a delivered SKU and its `-pickup` SKU, with the regular pickup price exactly CA$10 lower. The website applies the sale percentage to the delivered variant, then sets the pickup sale price CA$10 below it. Products whose pickup sale price falls below the configured minimum cannot be included. Existing Shopify compare-at sales must be ended first. The curated “Gifts Under $25” page is not a selectable sale category because its membership changes with pricing.

## Running and ending a sale

1. Open the Sales tab and choose a scope, percentage, title, and pickup price floor.
2. Preview and review every price and margin. The preview is rejected if Shopify prices change before activation.
3. Check existing Shopify automatic discounts and codes. They may stack with these variant sale prices. Acknowledgement is required in the admin page.
4. Select **Start when I turn it on** or a future start time, and set an end time. Dates use the administrator device's timezone and are stored in UTC. Turn on or schedule the sale. The public feature appears only after the saved sale and Shopify Storefront prices agree. The artwork is decorative; real product images stay on product cards.
5. `shop-sale-schedule` runs every ten minutes on the published production deploy. It starts scheduled sales and restores Shopify's original prices after the end time. The public sale display stops at the deadline even if the next scheduled restoration has not yet run. Allow up to ten minutes after a selected time for Shopify variant prices to change. The admin page also supports cancelling a future schedule or ending an active sale early.

If Shopify or Netlify interrupts a multi-product update, the public sale stays off and the tab offers **Recover original prices**. Recovery only changes variants that still match the sale snapshot; a manual Shopify edit is flagged for review instead of overwritten. For a large whole-shop sale, allow the update to finish and refresh the status before retrying. Sale activation is disabled on Netlify deploy previews.

If Shopify prices change between scheduling and the start time, automatic activation stops without changing prices. The admin tab shows an error; cancel the schedule, preview again, and reschedule. A scheduled restoration retries on later runs when it is safe, and logs failures in Netlify Functions. Do not remove the scheduled function or its Shopify credentials during an active promotion.

The sale landing page is intentionally excluded from the static sitemap and is `noindex`, since it only has products while a promotion is active. Normal product and category pages remain crawlable. All sale controls are variable-driven; the static artwork only appears while a verified sale is active.
