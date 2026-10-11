// Installed in Shopify Settings > Customer events, not in public website assets.
// Build with scripts/build-checkout-pixel.mjs using VITE_GA_MEASUREMENT_ID.
// Shopify controls this pixel's loading according to its configured consent.
const measurementId = "__GA_MEASUREMENT_ID__";
window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
const script = document.createElement("script");
script.async = true;
script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
document.head.appendChild(script);
gtag("js", new Date());

function attributes(checkout) {
  return Object.fromEntries((checkout.attributes || []).map(attribute => [attribute.key, attribute.value]));
}
function items(checkout) {
  return (checkout.lineItems || []).map(line => {
    const quantity = Number(line.quantity) || 1;
    const sku = line.variant?.sku || line.variant?.id || line.id;
    return {
      item_id: String(sku || "unknown").replace(/-pickup$/, ""),
      item_name: line.variant?.product?.title || line.title || "Product",
      item_variant: line.variant?.title || "",
      item_category: line.variant?.product?.type || "",
      price: Number(line.finalLinePrice?.amount ?? (Number(line.variant?.price?.amount || 0) * quantity)) / quantity,
      quantity,
    };
  });
}
const campaignFields = { utm_source: "campaign_source", utm_medium: "campaign_medium", utm_campaign: "campaign_name", utm_content: "campaign_content", utm_term: "campaign_term" };
function params(checkout) {
  const attrs = attributes(checkout);
  const shipping = Number(checkout.shippingLine?.price?.amount || 0);
  const tax = Number(checkout.totalTax?.amount || 0);
  const result = {
    send_to: measurementId,
    currency: checkout.currencyCode || "CAD",
    value: Math.max(0, Number(checkout.totalPrice?.amount || 0) - shipping - tax),
    items: items(checkout),
    page_location: "https://aqk73w-k2.myshopify.com/checkouts/",
    page_referrer: "https://custombuildstudio.ca/shop/cart/",
    fulfillment_method: (attrs["Order handoff"] || "").startsWith("Edmonton pickup") ? "pickup" : "delivered",
    transport_type: "beacon",
  };
  for (const [source, target] of Object.entries(campaignFields)) {
    const value = attrs["_cbs_" + source];
    if (typeof value === "string" && /^[a-zA-Z0-9 _.,~+:/-]{1,200}$/.test(value)) result[target] = value;
  }
  if (/^\d{1,20}$/.test(attrs._cbs_ga_session_id || "")) result.session_id = attrs._cbs_ga_session_id;
  return result;
}
function configure(event) {
  const checkout = event.data?.checkout;
  if (!checkout || attributes(checkout)._cbs_analytics_test === "1") return null;
  const attrs = attributes(checkout);
  const clientId = /^[a-zA-Z0-9._-]{1,100}$/.test(attrs._cbs_ga_client_id || "") ? attrs._cbs_ga_client_id : event.clientId;
  gtag("config", measurementId, { send_page_view: false, client_id: clientId, ...params(checkout) });
  return checkout;
}
// Shopify validates subscriptions statically, so event names must be literals.
analytics.subscribe("checkout_started", event => {
  const checkout = configure(event);
  if (checkout) gtag("event", "shopify_checkout_started", params(checkout));
});
analytics.subscribe("checkout_shipping_info_submitted", event => {
  const checkout = configure(event);
  if (checkout) gtag("event", "add_shipping_info", params(checkout));
});
analytics.subscribe("payment_info_submitted", event => {
  const checkout = configure(event);
  if (checkout) gtag("event", "add_payment_info", params(checkout));
});
analytics.subscribe("checkout_completed", async event => {
  const checkout = configure(event);
  // Never treat opening checkout, clicking pay or an incomplete order as a sale.
  if (!checkout?.order?.id) return;
  const transactionId = checkout.order.id;
  const key = "cbs-ga4-purchase-" + transactionId;
  try {
    if (await browser.localStorage.getItem(key)) return;
    await browser.localStorage.setItem(key, "1");
  } catch { /* GA4 also deduplicates purchases by transaction_id. */ }
  gtag("event", "purchase", { ...params(checkout), transaction_id: transactionId, shipping: Number(checkout.shippingLine?.price?.amount || 0), tax: Number(checkout.totalTax?.amount || 0) });
});
