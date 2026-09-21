import { createHash, timingSafeEqual } from "node:crypto";
import catalog from "./products.json" with { type: "json" };
import settings from "./settings.json" with { type: "json" };
import { ownerEmail } from "./notifications.mjs";

export { catalog, settings };
export class ShopError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const fail = (message, status) => {
  throw new ShopError(message, status);
};
const hash = (value) => createHash("sha256").update(value).digest("hex");
export const equal = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function totals(
  items,
  fulfillment,
  config = settings,
  products = catalog,
) {
  if (!Array.isArray(items) || !items.length || items.length > products.length)
    fail("Choose at least one product.");
  const ids = new Set();
  const lines = items.map((item) => {
    const product = products.find((p) => p.id === item.id);
    if (!product || ids.has(item.id))
      fail("Your cart contains an invalid or duplicate product.");
    ids.add(item.id);
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > config.maxQuantityPerProduct
    )
      fail(`Choose a quantity from 1 to ${config.maxQuantityPerProduct}.`);
    return {
      id: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPriceCents: product.priceCents,
      lineTotalCents: product.priceCents * item.quantity,
    };
  });
  if (!["pickup", "delivery"].includes(fulfillment))
    fail("Choose pickup or local delivery.");
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.lineTotalCents,
    0,
  );
  const fulfillmentCents =
    fulfillment === "pickup" ? config.pickupFeeCents : config.deliveryFeeCents;
  const taxCents = Math.round(
    ((subtotalCents + fulfillmentCents) * config.taxBasisPoints) / 10000,
  );
  return {
    lines,
    subtotalCents,
    fulfillmentCents,
    taxCents,
    totalCents: subtotalCents + fulfillmentCents + taxCents,
    currency: "CAD",
  };
}
function text(value, label, max, required = true) {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    fail(`Please provide a valid ${label}.`);
  return value.trim();
}
export function validateOrder(input) {
  if (!input || typeof input !== "object" || input.website)
    fail("Unable to accept this order.");
  const customer = {
    name: text(input.name, "name", 100),
    email: text(input.email, "email", 254),
    phone: text(input.phone, "phone number", 30),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))
    fail("Enter a valid email address.");
  if (
    !/^[\d\s()+.-]+$/.test(customer.phone) ||
    customer.phone.replace(/\D/g, "").length < 10 ||
    customer.phone.replace(/\D/g, "").length > 15
  )
    fail("Enter a valid phone number with area code.");
  if (input.accepted !== true)
    fail("Please confirm the order and payment terms.");
  const calculated = totals(input.items, input.fulfillment);
  let address = null;
  if (input.fulfillment === "delivery") {
    if (input.deliveryReview !== true)
      fail("Please acknowledge delivery address review.");
    address = {
      street: text(input.street, "delivery street address", 200),
      city: text(input.city, "community", 80),
      postal: text(input.postal, "Alberta postal code", 7)
        .toUpperCase()
        .replace(/\s/g, ""),
    };
    if (!/^T[0-9][A-Z][0-9][A-Z][0-9]$/.test(address.postal))
      fail("Enter an Alberta postal code. Local delivery is limited to 50 km.");
  }
  const notes = text(input.notes || "", "notes", 1000, false);
  const customRequest = text(input.customRequest || "", "special request", 1000, false);
  if (input.requestMode === "custom" && !customRequest)
    fail("Tell us which colour or change you would like.");
  // Derive review from actual content, never a client-supplied approval flag.
  const requiresApproval = Boolean(customRequest || notes || input.requestMode === "custom");
  if (
    !Number.isInteger(input.expectedTotalCents) ||
    input.expectedTotalCents !== calculated.totalCents
  )
    fail("Prices changed. Refresh your cart and review the total.", 409);
  return {
    customer,
    address,
    notes,
    customRequest,
    requiresApproval,
    fulfillment: input.fulfillment,
    ...calculated,
  };
}
export function createShop({
  store,
  testMode = false,
  enabled = false,
  adminKey = "",
  mailer = null,
  clock = () => new Date(),
}) {
  const ready =
    testMode ||
    (enabled &&
      adminKey.length >= 32 &&
      Boolean(mailer) &&
      settings.catalogApproved &&
      catalog.every((p) => p.images.length));
  const setupChecks = {enabled, administratorConfigured: adminKey.length >= 32, emailConfigured: Boolean(mailer), catalogApproved: settings.catalogApproved};
  async function create(input, key) {
    if (!ready)
      fail("The collection is being prepared. Ordering is not live yet.", 503);
    if (typeof key !== "string" || !/^[a-f0-9-]{36}$/.test(key))
      fail("Missing order request key. Please reload checkout.");
    const validated = validateOrder(input);
    const id = hash(key).slice(0, 24);
    const fingerprint = hash(JSON.stringify(validated));
    const existing = await store.get("order/" + id);
    if (existing) {
      if (existing.data.fingerprint !== fingerprint)
        fail("This request key belongs to a different order.", 409);
      await notifyOwner(id);
      return { order: publicOrder(existing.data), lookupKey: key };
    }
    const order = {
      id,
      number: `CBS-${id.slice(0, 12).toUpperCase()}`,
      createdAt: clock().toISOString(),
      updatedAt: clock().toISOString(),
      testMode,
      ownerNotification: {status: testMode ? "Preview only" : "Pending"},
      paymentStatus: "Awaiting payment",
      fulfillmentStatus: "Not started",
      detailsStatus: validated.requiresApproval ? "Needs review" : "Confirmed",
      deliveryStatus:
        validated.fulfillment === "delivery"
          ? "Needs review"
          : "Not applicable",
      ...validated,
      fingerprint,
      lookupHash: hash(key),
      history: [
        {
          at: clock().toISOString(),
          action: "Order created; awaiting manual payment verification",
        },
      ],
    };
    const saved = await store.put("order/" + id, order, { onlyIfNew: true });
    if (!saved.modified) return create(input, key);
    await notifyOwner(id);
    return { order: publicOrder(order), lookupKey: key };
  }
  function publicOrder(order, admin = false) {
    const { fingerprint, lookupHash, history, ownerNotification, ...publicData } = order;
    const paymentEligible = order.detailsStatus === "Confirmed" &&
      (order.fulfillment === "pickup" || order.deliveryStatus === "Approved") &&
      order.paymentStatus === "Awaiting payment" && order.fulfillmentStatus !== "Cancelled";
    return {
      ...publicData,
      ...(admin ? { history, ownerNotification, notificationPreview: ownerEmail(order).text } : {}),
      paymentEmail: settings.paymentEmail,
      paymentEligible,
      canPay: !order.testMode && paymentEligible,
      productionTime: settings.productionTime,
      pickupInstructions: settings.pickupInstructions,
    };
  }
  async function lookup(key) {
    if (typeof key !== "string" || !/^[a-f0-9-]{36}$/.test(key))
      fail("Order not found.", 404);
    const found = await store.get("order/" + hash(key).slice(0, 24));
    if (!found || !equal(found.data.lookupHash, hash(key)))
      fail("Order not found.", 404);
    return publicOrder(found.data);
  }
  async function notifyOwner(id) {
    if (!/^[a-f0-9]{24}$/.test(id)) fail("Order not found.", 404);
    const found = await store.get("order/" + id);
    if (!found) fail("Order not found.", 404);
    const order = found.data, notification = order.ownerNotification;
    if (order.testMode || !notification || notification.status === "Accepted") return;
    if (!mailer) return;
    // A provider key deduplicates retries for 24h. Never retry an ambiguous old attempt.
    if (notification.firstAttemptAt && clock().getTime() - Date.parse(notification.firstAttemptAt) >= 23 * 3600000) {
      await store.put("order/" + id, {...order, ownerNotification: {...notification, status: "Check provider log — retry window expired"}}, {onlyIfMatch: found.etag});
      return;
    }
    if (notification.status === "Sending" && clock().getTime() - Date.parse(notification.at) < 60000) return;
    const now = clock().toISOString();
    const claimed = {...order, ownerNotification: {status: "Sending", firstAttemptAt: notification.firstAttemptAt || now, at: now}};
    const claim = await store.put("order/" + id, claimed, {onlyIfMatch: found.etag});
    if (!claim.modified) return;
    let result;
    try { result = {status: "Accepted", providerId: await mailer(order)}; }
    catch { result = {status: "Needs retry"}; }
    // Merge notification status without overwriting concurrent fulfillment updates.
    for (let attempt = 0; attempt < 5; attempt++) {
      const latest = await store.get("order/" + id);
      const saved = await store.put("order/" + id, {...latest.data, ownerNotification: {...claimed.ownerNotification, ...result}}, {onlyIfMatch: latest.etag});
      if (saved.modified) break;
    }
  }
  function authorize(key) {
    if (adminKey.length < 24 || !equal(key, adminKey))
      fail("Administrator authentication required.", 401);
  }
  async function update(id, revision, action, note) {
    if (!/^[a-f0-9]{24}$/.test(id)) fail("Order not found.", 404);
    const found = await store.get("order/" + id);
    if (!found) fail("Order not found.", 404);
    if (found.etag !== revision)
      fail("Order changed. Refresh before updating.", 409);
    const order = structuredClone(found.data);
    const reference = text(note || "", "verification note", 300);
    if (order.fulfillmentStatus === "Cancelled")
      fail("This order is cancelled.");
    if (action === "confirm-details") order.detailsStatus = "Confirmed";
    else if (action === "approve-delivery") {
      if (order.fulfillment !== "delivery") fail("Not a delivery order.");
      order.deliveryStatus = "Approved";
    } else if (action === "confirm-payment") {
      if (
        order.detailsStatus !== "Confirmed" ||
        (order.fulfillment === "delivery" &&
          order.deliveryStatus !== "Approved")
      )
        fail("Confirm product details and delivery eligibility first.");
      if (order.paymentStatus === "Paid") fail("Payment is already confirmed.");
      order.paymentStatus = "Paid";
      order.paidAt = clock().toISOString();
    } else if (action === "cancel") {
      if (order.paymentStatus === "Paid")
        fail(
          "Resolve the payment/refund outside the shop before cancelling a paid order.",
        );
      order.fulfillmentStatus = "Cancelled";
    } else {
      const next = {
        "start-production": ["Not started", "In production"],
        ready: ["In production", "Ready"],
        complete: ["Ready", "Completed"],
      }[action];
      if (
        !next ||
        order.paymentStatus !== "Paid" ||
        order.fulfillmentStatus !== next[0]
      )
        fail(
          "Invalid fulfillment transition. Confirm payment before production.",
        );
      order.fulfillmentStatus = next[1];
    }
    order.updatedAt = clock().toISOString();
    order.history.push({ at: order.updatedAt, action, note: reference });
    const saved = await store.put("order/" + id, order, {
      onlyIfMatch: found.etag,
    });
    if (!saved.modified) fail("Order changed. Refresh before updating.", 409);
    return { ...publicOrder(order, true), revision: saved.etag };
  }
  async function list() {
    const keys = await store.list("order/");
    return (await Promise.all(keys.map((key) => store.get(key))))
      .filter(Boolean)
      .map((found) => ({
        ...publicOrder(found.data, true),
        revision: found.etag,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async function rateLimit(ip) {
    const key = "rate/" + hash(ip || "unknown").slice(0, 24),
      window = Math.floor(clock().getTime() / 3600000);
    for (let attempt = 0; attempt < 5; attempt++) {
      const found = await store.get(key),
        count = found?.data.window === window ? found.data.count : 0;
      if (count >= 120) fail("Too many requests. Please try again later.", 429);
      const result = await store.put(
        key,
        { window, count: count + 1 },
        found ? { onlyIfMatch: found.etag } : { onlyIfNew: true },
      );
      if (result.modified) return;
    }
    fail("Please try again shortly.", 429);
  }
  return {
    create,
    lookup,
    authorize,
    update,
    list,
    rateLimit,
    notifyOwner,
    ready,
    setupChecks,
    testMode,
  };
}
