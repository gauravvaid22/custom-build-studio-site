# Shop sales

The Sales tab at `/shop/admin/` controls one active promotion at a time. An administrator can choose a percentage, a whole-shop/category/product scope, a title, and the lowest allowed pickup sale price. Preview reads current prices from Shopify and shows every delivered and pickup option. Activation writes the discounted prices and compare-at prices to Shopify, verifies them, then exposes sale badges, artwork, and `/shop/sale/` on the website. The checkout uses Shopify's live variant prices.

## Private setup

Install a Custom Build Studio Shopify app with `read_products` and `write_products` scopes. Put its Client ID and Client Secret into Netlify production environment variables `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`. The older `SHOPIFY_ADMIN_ACCESS_TOKEN` is also supported if already available. The existing `SHOP_ADMIN_KEY` protects the admin screen and sale mutations. Keep all of these out of Vite variables, source control, and public pages. The storefront's existing `VITE_SHOPIFY_STOREFRONT_TOKEN` remains public and cannot change prices.

The Shopify store must use CAD. Every sale product must have a delivered SKU and its `-pickup` SKU, with the regular pickup price exactly CA$10 lower. The website applies the sale percentage to the delivered variant, then sets the pickup sale price CA$10 below it. Products whose pickup sale price falls below the configured minimum cannot be included. Existing Shopify compare-at sales must be ended first. The curated “Gifts Under $25” page is not a selectable sale category because its membership changes with pricing.

## Running and ending a sale

1. Open the Sales tab and choose a scope, percentage, title, and pickup price floor.
2. Preview and review every price and margin. The preview is rejected if Shopify prices change before activation.
3. Check existing Shopify automatic discounts and codes. They may stack with these variant sale prices. Acknowledgement is required in the admin page.
4. Turn on the sale. The public feature appears only after the saved sale and Shopify Storefront prices agree. The artwork is decorative; real product images stay on product cards.
5. End the sale from the same tab. The original price and compare-at value of each variant are restored.

If Shopify or Netlify interrupts a multi-product update, the public sale stays off and the tab offers **Recover original prices**. Recovery only changes variants that still match the sale snapshot; a manual Shopify edit is flagged for review instead of overwritten. For a large whole-shop sale, allow the update to finish and refresh the status before retrying. Sale activation is disabled on Netlify deploy previews.

The sale landing page is intentionally excluded from the static sitemap and is `noindex`, since it only has products while a promotion is active. Normal product and category pages remain crawlable. All sale controls are variable-driven; the static artwork only appears while a verified sale is active.
