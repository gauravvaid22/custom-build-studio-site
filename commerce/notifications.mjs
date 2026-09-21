import settings from "./settings.json" with { type: "json" };

export function ownerEmail(order) {
  const money = cents => `$${(cents / 100).toFixed(2)} CAD`;
  const review = order.requiresApproval || order.fulfillment === "delivery";
  const text = [
    `New order: ${order.number}`,
    review ? "ACTION: Review request / delivery eligibility before payment." : "STANDARD ORDER: Customer has e-Transfer instructions. Verify receipt in your bank before printing.",
    "", `${order.customer.name} · ${order.customer.email} · ${order.customer.phone}`,
    ...order.lines.map(line => `${line.quantity} × ${line.name} — ${money(line.lineTotalCents)}`),
    `Total: ${money(order.totalCents)} (delivery ${money(order.fulfillmentCents)}, tax ${money(order.taxCents)})`,
    `Fulfillment: ${order.fulfillment}`,
    order.address ? `${order.address.street}, ${order.address.city}, ${order.address.postal}` : "Arrange pickup privately when ready.",
    `Special request: ${order.customRequest || order.notes || "None — similar colours to main photo"}`,
    "", `Transfer reference: ${order.number}`,
    "Payment status at placement: Awaiting payment. This email is not a payment receipt.",
    "Manage orders: https://custombuildstudio.ca/shop/admin",
  ].join("\n");
  return {to: [settings.paymentEmail], reply_to: order.customer.email,
    subject: `[Custom Build Studio] ${order.number} — ${review ? "approval needed" : "awaiting e-Transfer"}`, text};
}

export function resendMailer({apiKey, from, fetcher = fetch}) {
  if (!apiKey || !from) return null;
  return async order => {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(8000),
      headers: {Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `shop-order-${order.id}`},
      body: JSON.stringify({from, ...ownerEmail(order)}),
    });
    if (!response.ok) throw Error("Order email could not be accepted by the sending service.");
    const result = await response.json();
    if (!result.id) throw Error("Missing email receipt.");
    return result.id;
  };
}
