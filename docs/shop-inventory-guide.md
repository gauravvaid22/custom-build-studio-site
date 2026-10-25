# Managing product stock

Open `/shop/admin/`, unlock the control panel, and choose **Inventory**.

## Everyday use

1. Search for a product or design.
2. Read **Available** (what customers can still order) and **Committed** (already assigned to placed orders).
3. Enter an amount and choose **Add stock** to replenish. For example, adding 3 to an available quantity of 1 makes 4, subject to any orders placed in the meantime.
4. Use **Set available** only to correct the total available quantity. Refresh first. If another order changes stock while you edit, Shopify rejects a stale correction; refresh and review it.
5. Use **Sold out**, **Low stock**, or **Needs attention** to find items requiring action.

If an order changes stock while either adjustment is being saved, refresh and review the quantity before retrying. Both actions use Shopify's quantity checks and stable request IDs to avoid duplicate changes.

Inventory updates save directly to Shopify. A website rebuild is unnecessary. Browsing pages refresh on focus and periodically; checkout always revalidates stock. Shopify remains the final authority during simultaneous purchases.

## Defaults and exceptions

- Ordinary designs/sizes start with 3 available each.
- The Mini Safari ten-pack starts with 20 packs. Each ten-pack order uses one pack from that quantity, regardless of the selected animals. It does not consume individual-animal stock.
- Other packs use the default until an exception is saved.
- Expand **Product and pack exceptions**, select a stock item, and set its default. This changes its future initial quantity, not today's existing stock. To change existing stock, use the inventory table.
- Changing the default does not reset stock for existing items.
- New products published after inventory activation receive their initial quantity once. Photo, description, price and sale edits do not replenish them.

## Initial connection

The existing private Shopify app needs `read_inventory`, `write_inventory` and `read_locations`. Choose the existing workshop location that fulfills online orders. Initialize pending stock, review the resulting quantities, then enable website stock controls and save settings. Previously initialized items are preserved on retries.

Three means three additional units available to order, separate from existing committed orders. The table makes that distinction visible. Products stocked at additional locations need reconciliation in Shopify before initialization.

An untracked, unconnected, or unconfirmed item is not represented as having an invented quantity. The interface displays an availability problem and checkout requires verification.

## Orders, cancellations and restocking

Shopify commits inventory for placed orders. Opening a page, adding to a website cart or abandoning checkout does not permanently decrement it. Do not reduce quantities manually again for ordinary Shopify orders.

For a cancellation/refund, review Shopify's restock choice. A refund by itself does not always replenish stock. Use **Refresh stock** to see Shopify's result before adding anything manually.

Delivery and the local-pickup request use the same stock and price. There are no additional pickup stock variants. Etsy remains outside this integration.
