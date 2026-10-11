# Managing your shop

Open https://custombuildstudio.ca/shop/admin/ and unlock the control panel with your existing administrator key. The key stays out of browser storage; the sign-in expires after eight hours. Sign out on a shared device.

## Products

- **Add product** starts a draft. Choose a single item, design collection, size, personalized gift, bundle, lamp or mask template.
- **Edit** loads current Shopify base prices. Existing links and SKUs stay stable when you rename an item.
- Enter the buyer description, included items, dimensions and care/material notes. Leave unknown dimensions blank.
- Upload public product photos (JPG/PNG/WebP, up to 20 MB each) or MP4/MOV video (up to 100 MB). Shopify stores and processes these assets. Customer-uploaded personalization photos remain in the separate private workflow.
- For a design collection, add each design and its gallery/price. For sizes, enter the option label, price and measurements.
- The first image is the cover. Use **Move up**, **Make cover** or **Remove** to organize the gallery. Removing a photo here does not permanently delete its stored file.
- Confirm included components, compatibility and fulfillment. Choose relevant categories.
- Review delivery and pickup prices, **Save draft**, then **Preview**. Saving alone does not put the item on sale.
- **Publish saved draft** checks Shopify, sends the update and rebuilds the website's product pages, sitemap and feed. Wait until the job says **Live**. If it says **Needs attention**, read the error and retry after addressing it.
- **Duplicate** creates new links/SKUs and a draft. **Save as template** creates a reusable starting point.
- **Archive** withdraws a listing from the website channel and preserves past orders. **Restore** brings it back. There is no permanent-delete button.

## Collections and rows

Collections control category names, membership, covers and order. Existing category links are fixed to avoid broken links. Add a category, choose products, save the layout and publish the saved layout. Empty categories stay out of the generated category pages until populated.

Shop rows add curated selections or information strips. Set heading/introduction, selected products, order, visibility and optional dates. Dates use your device's local time and are stored as UTC. Save and publish the layout.

## Connection

The website channel and delivery/pickup profiles must be selected from your existing Shopify settings. The editor assigns newly created delivery/pickup variants to those profiles; it does not change shipping rates. Verify unusual shipping arrangements before publishing.

## History and safeguards

History lists saved changes. Restore a previous editor revision as a draft, review it and publish separately. Active or scheduled sales must be ended/cancelled before changing base prices. If Shopify changed after opening the editor, reload and reconcile rather than overwriting those changes.

## Current limits

- Adding size choices to a product already created in Shopify requires configuring the extra variants in Shopify first; the editor reports this instead of silently changing variant IDs. New products can include all their size options from the start.
- Existing videos continue to play on the website, including WebM. New browser uploads use MP4/MOV. An existing website-only video is not automatically converted for Shopify.
- Media processing and storage use existing Shopify plan limits. Every website publication consumes a Netlify build; no paid app was added.
- Product edits are reviewed and published individually. Batch operations, permanent deletion and a freeform page builder are not included.
