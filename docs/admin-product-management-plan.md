# Custom Build Studio — self-service shop admin plan

Prepared: 11 October 2026. Status: proposed plan only; no implementation or deployment approved by this document.

## Goal

Let the owner manage products, design collections, media, prices, categories and shop display from `/shop/admin/`, using forms and reusable templates. Keep the current customer-facing design, cart, Shopify checkout and product URLs.

## Findings from the current code

- The site is React/TypeScript on Netlify with generated HTML pages for search engines. `commerce/products.json` and `commerce/collections.json` currently determine much of the catalog at build time.
- Shopify supplies live commercial data such as names and fulfillment-option prices. Website settings and some product content use Netlify Blobs.
- Product administration is split among repeated, predefined pricing panels, a special lamp editor and display controls. The current creation action only handles known source manifests; it is not a general Add Product tool.
- Grouped listings already work: one website card, multiple selectable designs, associated galleries and underlying Shopify products/options. Preserve this pattern and the existing IDs.
- Display controls offer known departments, two campaign configurations and six fixed featured-product slots. They cannot add arbitrary product rows or categories.
- Refreshing the admin clears its temporary login. Login is labelled “Open orders,” and loading the dashboard currently depends on legacy order requests succeeding.
- The current media endpoint handles images and customer/showcase purposes; it is not a general catalog photo/video upload manager.
- The new Drop 301 accessory catalog is a local preview with launch blockers. This admin project must not publish it incidentally.

## Recommended architecture

Build on the existing website, Netlify backend and Shopify private integration. Do not purchase a page builder, CMS or subscription app for the initial version.

Define one owner for each field:

| Data | Authoritative storage |
| --- | --- |
| Purchasable product title, description, variants, prices, inventory and checkout availability | Shopify |
| Product dimensions, materials, included items, care and template-specific product facts | Typed Shopify metafields |
| Public product photos and videos | Shopify media/CDN, retaining existing website assets during migration |
| Website design-group definitions, parent covers, gallery-to-design mapping, categories/display configuration and reusable template settings | Netlify Blobs |
| Draft revisions, publication jobs, sync state and change history | Protected Netlify Blobs records |
| Customer personalization uploads and private production source files | Existing private workflow; never public catalog media |
| Orders, payments, refunds and fulfillment | Shopify; old manual orders remain separately accessible |

The website admin presents this as one editor. Storage boundaries are implementation details, not tasks the owner must coordinate manually. Shopify’s product synchronization guidance supports API lookups and change events: https://shopify.dev/docs/apps/build/sales-channels/product-sync.

Keep existing grouped products linked to their current Shopify children. New groups use the same generic configuration, with stable group/design IDs. Do not consolidate existing Shopify products in a way that loses historical references or changes working checkout IDs.

## Admin navigation and appearance

Use the current dark slate and sky-blue style, readable type, image thumbnails, clear status labels and concise guidance. Desktop uses a sidebar; mobile uses an accessible compact navigation and full-screen editor. Provide visible Save Draft, Preview and Publish actions, with an unsaved-changes prompt.

Suggested sections:

1. Overview: drafts, publication failures, Shopify connection and last successful website update.
2. Products: searchable catalog, category/template/status filters and consistent editor.
3. Collections: categories, design groups, covers and ordering.
4. Shop Display: homepage/shop sections, featured products and scheduled campaigns.
5. Sales: retain the existing percentage, scope and date workflow.
6. Website Settings: existing service prices, build volumes, fulfillment wording and other approved settings.
7. Orders: current Shopify orders link and separate Legacy Orders tab.
8. Media & History: reusable public media, previous revisions and recent changes.

One failed section must not prevent access to the whole dashboard. Rename login to “Open control panel.” Use an expiring, secure server session so normal refreshes do not require entering the key again; keep Shopify secrets server-side.

## Add Product wizard

The primary action is Add Product; Duplicate Product is available from existing entries.

1. Choose a template.
2. Enter the name, short buyer description, material, included items and category. Optional details include dimensions, care and exclusions.
3. Upload photos/video, choose the listing cover, reorder media and write/edit image descriptions.
4. Add design/size options and prices. Each option has its own label, image, gallery and applicable dimensions.
5. Select an existing fulfillment preset and preview delivery/pickup amounts. Unknown compatibility, shipping or production details keep the item a draft.
6. Preview desktop/mobile, review the checklist, then publish.

Required fields should be limited to what is necessary to sell accurately. Optional sections appear only when relevant to the template. Drafts can be saved with missing details. Publish validates facts, media readiness, Shopify publication, option availability and shipping setup.

Product names remain freely editable; changing the name does not silently change the URL, SKU or IDs. An explicit URL change adds a redirect. A duplicate copies layout and editable facts but receives new IDs/SKUs and starts as a draft, without inheriting misleading stock or checkout mappings.

## Templates

| Template | Main use and fields |
| --- | --- |
| Single item | Name, photos/video, material, included item, price and optional dimensions |
| Choose a design | One listing card; repeatable design rows with price, gallery, dimensions and availability |
| Choose a size | Size labels, measurements, size guide, option prices and matching dimensions |
| Personalized gift | Customer-photo requirement, accepted format/size, photo crop guidance, included photo and private upload workflow |
| Set/bundle | Explicit quantity and included pieces; price applies to the complete set |
| Lamp/light | Included lighting components and confirmed power/care details; no invented certifications |
| Wearable mask | Ear-to-ear size, fastening method, custom-size contact and design/size options |

These are configurations built on one shared product system, not separate bespoke editors. Templates can be renamed, duplicated and saved as owner presets. Most templates compose features: for example, a personalized gift may also offer designs and sizes.

## Standard descriptions

Provide editable sentence blocks for overview, included items, sizing, photo/color variation, care and fulfillment. Product facts generate a starting description; the owner can edit the wording. This does not require a paid AI service.

Example structure:

> A [design/style] [product type] for [use]. Your order includes [included items]. Choose [available options]. [Applicable measurement/compatibility guidance].

Only render filled sections. Never invent compatibility, safety claims, weights, stock or delivery guarantees. An included/excluded-items preview helps avoid photos implying that props come with the item. Standard statements can be inherited from a template or explicitly overridden; editing a default must show affected products before applying it.

## Pricing and fulfillment

- All amounts are CAD, with server-side integer-cent validation and consistent rounding.
- Show customer delivery price and pickup price together in admin. Default eligible products to the current $10 pickup reduction; allow an explicit validated product/preset override instead of applying it to every future item.
- The new accessory drop’s $5 shipping arrangement remains unconfirmed and unpublished. Do not silently assign the ordinary free-shipping/$10-pickup rule.
- Shipping changes must use Shopify’s actual profile configuration. A website label or cart adjustment alone cannot establish the checkout fee.
- Show sale price and normal price clearly. Base-price changes during active/scheduled sales need a defined reconciliation flow; reuse the existing sale integration rather than stacking a second discount.
- Bulk price/category/visibility edits provide a before-and-after review. Detect a Shopify change made elsewhere since the editor loaded and ask the owner to reconcile it rather than overwriting it.
- Inventory and shipping weight are editable only when confirmed; product dimensions must not be presented as parcel dimensions.

## Removing products

Default action: Remove from website / Archive, with Restore available. Explain whether the action affects a whole grouped listing or one design. Hiding from a category is distinct from withdrawing a product from sale.

Withdrawing a product removes it from cards, search, groups and applicable website checkout access. Existing carts receive a clear unavailable-item notice. Keep historical orders and stable IDs. Archive the Shopify product only when removing it from all Shopify sales channels is intended; otherwise withdraw its website-channel publication.

Permanent Delete is an advanced, explicitly confirmed action. Preview dependent groups, sections and media first. Do not delete a shared photo because it was removed from one listing. Old URLs should use an appropriate replacement redirect when one exists, or a proper unavailable/removed response; avoid redirecting every deleted product to an unrelated page.

## Categories and product rows

Let the owner add/edit categories, select covers, order categories and place one item in several relevant categories. Seasonal membership should not require duplicating the product.

Interpret “adding rows” as adding curated homepage/shop sections. Offer presets: product grid, featured collection, image banner and short information strip. A section has a title, optional intro, collection/manual product selection, visibility, order and optional start/end dates. Replace the fixed six-item limit with repeatable choices and responsive layout presets. Avoid a freeform code editor/page builder.

## Media workflow

Uploads come from the device file picker; a website cannot scan the owner's Windows folders automatically. Support selecting several images and associating them with a design. Provide progress, retry, cover selection and reordering, including keyboard/mobile alternatives to dragging.

Upload public marketing media through Shopify’s staged upload API, wait for successful processing, and reference the resulting IDs. Shopify documents this workflow here: https://shopify.dev/docs/api/admin-graphql/latest/mutations/stageduploadscreate.

Check supported formats and current plan quotas before implementation. Shopify has plan-dependent video/storage limits and does not attach videos as native variant media; use the website's explicit design-gallery mapping for per-design videos: https://help.shopify.com/en/manual/products/product-media/add-media. Show an actionable error for unsupported video formats, rather than pretending an upload succeeded. Preserve existing playable WebM assets while deciding the import/conversion path.

Reuse the existing gallery behavior: initially show all designs' media; after a deliberate selection, show that design's media. Keep a separately chosen group cover for listing cards.

## Publishing and search visibility

New-product creation cannot stop at a live browser-only catalog entry: the current build generates product HTML, metadata, sitemap and discovery/feed data from static catalog files.

Add a build-time catalog export before bundling/prerendering. It reads an approved published revision and generates all website catalog/collection data consistently. Never require the owner to edit JSON or Git to publish a product.

Publication sequence:

1. Validate the draft and media; prepare Shopify products/options and confirmed shipping/publication settings.
2. Save an immutable website revision and queue the Netlify rebuild.
3. Generate product/category HTML, canonical metadata, structured data, sitemap and relevant merchant feed data.
4. Verify deployment and checkout mappings; mark the revision Live only after successful completion.

Show Draft / Updating Shopify / Updating Website / Live / Needs Attention. A failed step is retriable without creating duplicate products. Keep the previous valid public website revision until the new one deploys. Withdrawal requires immediate availability guards while rebuilt static pages catch up.

Use authenticated change notifications/reconciliation to reflect edits made directly in Shopify. Debounce rebuild requests and protect against concurrent revisions publishing out of order. Netlify supports programmatic build hooks: https://docs.netlify.com/build/configure-builds/build-hooks/.

Generate editable search-title/description defaults from genuine product facts. Metadata and indexing eligibility improve discoverability; they cannot guarantee a Google ranking or instant indexing.

## Implementation order

1. Foundation: back up the catalog, define the shared schema, stable mappings and secure admin session; build catalog export/deploy-status tracking. Migrate one ordinary item and one grouped listing in preview first.
2. Core owner tools: unified product list/editor, templates, uploads, options/pricing, preview/publish, archive/restore. Extend to all existing catalog patterns after checkout/SEO parity checks.
3. Shop organization: editable categories and repeatable display sections, bulk tools and scheduled placement.
4. Operational polish: sync/retry controls, conflict handling, revision recovery, template defaults and brief owner instructions.

Preview before production. No unrelated site redesign, new paid service or incidental publication of pending products.

## Verification and costs

Test create/edit/duplicate/archive/restore, individual-design removal, failed uploads, invalid prices, sale conflicts, stale edits and retries. Verify chosen option price/gallery/dimensions, pickup reductions, shipping profiles, personalized-file privacy and real Shopify checkout without payment. Check generated HTML, sitemap/feed, old URLs, removed-item carts, desktop/mobile and keyboard operation. Use protected test drafts and confirm they do not leak into public feeds.

Target the existing Shopify/Netlify subscriptions, with no additional paid app for the first release. Actual storage, video, API and Netlify build usage must be checked before implementation; batching publishes and reusing media reduces consumption. Additional Shopify app scopes may be needed for files, metafields or publication/profile operations. Confirm the precise supported shipping/publish path before promising full automation.

Approval checkpoint: agree on this direction, then implement the foundation and core owner tools in preview. The rest can follow using the same schema.
