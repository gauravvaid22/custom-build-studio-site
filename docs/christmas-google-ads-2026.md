# Custom Build Studio — Christmas 2026 Google Ads & Shopping Strategy

## 1. Campaign Overview & IDs

- **Campaign Name**: `CBS - Christmas 2026 - Shopping`
- **Campaign ID**: `24412330538`
- **Campaign Type**: Standard Shopping (Manual CPC, "Include Google search partners" UNCHECKED)
- **Status**: `PAUSED` (Zero spend until owner activation)
- **Daily Budget**: `CA$5.00/day` (Single campaign built to scale smoothly to `$10–$12/day` and `$15–$25/day` without recreating)
- **Start Date**: October 29, 2026
- **End Date**: December 22, 2026
- **Location Targeting**:
  - Edmonton: `+20%` bid adjustment
  - Alberta: `+10%` bid adjustment
  - Canada: `0%` (standard baseline)
  - Target: **Presence** (People in or regularly in your targeted locations)
- **Negative Keyword List**: `CBS - Christmas Negative Shield` (`sharedSetId=12292462515`) with 65+ negative keywords blocking free seekers, competitors, materials, and irrelevant items.

---

## 2. Ad Groups & Feed Segmentation (`Custom Label 0`)

The product feed automatically assigns Google Merchant Center `<g:custom_label_0>` based on product catalog rules:

| Ad Group | Ad Group ID | Custom Label 0 Target | Max CPC | Products Included |
| :--- | :--- | :--- | :--- | :--- |
| **01 - Christmas Trees Toppers Ornaments** | `201688186237` / `207358485291` | `christmas_tree_hero` | `CA$0.80` | Endless Swirling Tree, Luminous Tree & variants, Meowy Tree Topper, Guiding Star Topper, Character Ornaments & Baubles, Christmas Tree Trinket Tray. *(Everything else: Excluded)* |
| **02 - Christmas Decor Lamps Nativity** | `207358565011` | `christmas_decor_general` | `CA$0.50` | Holiday Table Lamps (Angel, Nativity, Moon Village, Campfire), Holy Family & Angel Statues, Nordic Gnomes, Snack Bowls, Stocking & Snowflake Trays. *(Everything else: Excluded)* |

---

## 3. Conversion Tracking Architecture

- **Primary Conversion**: Real Shopify CAD purchases imported directly from **Google Analytics 4 (`GA4`)** property `507605744` (`custombuildstudio` / `G-8D08Z57Q3S`).
- **Tracking Code**: Powered by the verified live Shopify custom pixel (`commerce/checkout-analytics.pixel.js`), which deduplicates order IDs and passes transaction currency (`CAD`) and value.
- **Secondary Conversions**: `add_to_cart` and checkout start events are marked Secondary (observe only) to keep optimization laser-focused on real orders.

---

## 4. Single-Campaign Budget Scaling Ladder

You do **not** need to create new campaigns as order volume grows. Simply edit the daily budget on `CBS - Christmas 2026 - Shopping`:

1. **Phase 1: Starter / Validation (`CA$3.00 – CA$5.00 / day`)**:
   - Initial learning and click validation across Edmonton and Alberta.
   - Max CPCs: `$0.80` (Trees/Ornaments) and `$0.50` (Lamps/Nativity).
2. **Phase 2: Proven Demand (`CA$10.00 – CA$12.00 / day`)**:
   - Once orders start coming in (e.g. 3–5 sales), increase daily budget directly.
   - Allows capturing broader Canadian searches without running out of daily budget by noon.
3. **Phase 3: Peak Holiday Rush (`CA$15.00 – CA$25.00 / day`)**:
   - In late November / early December (Black Friday through Dec 15).
   - If conversion volume is strong (>15–20 conversions), optionally switch bid strategy to **Maximize Clicks** with a max CPC cap or **Maximize Conversion Value**.

---

## 5. Holiday Shipping & Cutoff Operations

- **December 16, 2026 (Canada Post Cutoff)**:
  - In Google Ads → `Locations`: Pause the **Canada** and **Alberta** location rows, leaving ONLY **Edmonton** active.
  - This concentrates 100% of your remaining daily budget on local Edmonton shoppers who can pick up locally or receive fast local hand-delivery before Christmas.
- **December 22, 2026 (Hard Stop)**:
  - The campaign automatically reaches its end date and pauses, preventing accidental spend after Christmas.

---

## 6. Live Readiness & 1-Click Activation Status (Updated October 31, 2026)

Christmas storefront routes (`/shop/christmas-special/`, `/shop/christmas/`, and all 33 Christmas product pages) and `/google-products.xml` (`30` active Christmas SKUs: `15` `christmas_tree_hero` + `15` `christmas_decor_general`) are **LIVE** in production, with off-season Halloween items filtered out so `0` 404 landing pages enter Google Merchant Center.

While `CBS - Christmas 2026 - Shopping` (`24412330538`) remains **`PAUSED`** (`$0.00` spend):
- **Free Organic Google Shopping Listings** automatically display your approved Christmas products on Google Search and the Shopping tab at `$0` ad cost.
- **Background Ad Review** stays warm because the campaign start date (`Oct 29, 2026`) is active and Merchant Center `5871050982` (`Website — Shop Products` `10762737798`) continuously syncs live Shopify CAD prices and stock.

### Whenever You Are Ready to Start Paid Ads (`CA$5.00/day`):
1. Open **Google Ads** → Campaigns → `CBS - Christmas 2026 - Shopping` (`24412330538`).
2. Change campaign status from **`Paused`** → **`Enabled`**.
3. Paid Shopping ads begin serving immediately across Edmonton (`+20%`), Alberta (`+10%`), and Canada (`0%`) using your live `/shop/admin/` CAD prices.
