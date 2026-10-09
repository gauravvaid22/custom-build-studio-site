// The catalog and Shopify use the same option SKUs; pickup is a separate
// fulfillment variant for every console choice, never a checkout discount.
export function managedVariantInput(item, pickupDifferenceCents) {
  const choices = item.options?.length ? item.options : [{ id: item.id, priceCents: item.priceCents }];
  return {
    productOptions: [
      ...(item.options?.length ? [{ name: "Console model", position: 1, values: choices.map(choice => ({ name: choice.label })) }] : []),
      { name: "Fulfillment", position: item.options?.length ? 2 : 1, values: [{ name: "Delivery" }, { name: "Edmonton Pickup" }] },
    ],
    variants: choices.flatMap(choice => ["Delivery", "Edmonton Pickup"].map(fulfillment => {
      const pickup = fulfillment === "Edmonton Pickup";
      const cents = choice.priceCents - (pickup ? pickupDifferenceCents : 0);
      if (!Number.isInteger(cents) || cents < 0) throw new Error("Invalid managed variant price.");
      return { optionValues: [
        ...(choice.label ? [{ optionName: "Console model", name: choice.label }] : []),
        { optionName: "Fulfillment", name: fulfillment },
      ], sku: choice.id + (pickup ? "-pickup" : ""), price: (cents / 100).toFixed(2), taxable: false,
      inventoryItem: { tracked: false, requiresShipping: true, countryCodeOfOrigin: "CA" } };
    })),
  };
}
