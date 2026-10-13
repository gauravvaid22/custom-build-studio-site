// The catalog and Shopify use the same option SKUs; pickup is a separate
// fulfillment variant for every console choice, never a checkout discount.
export function managedVariantInput(item, pickupDifferenceCents) {
  if (item.unifiedFulfillment) {
    const choices=item.options?.length?item.options:[{id:item.id,priceCents:item.priceCents}];
    const optionName=item.optionName || 'Size';
    return {productOptions:[{name:item.options?.length?optionName:'Title',position:1,values:choices.map(c=>({name:c.label || 'Default Title'}))}],variants:choices.map(c=>({sku:c.id,price:(c.priceCents/100).toFixed(2),taxable:false,optionValues:[{optionName:item.options?.length?optionName:'Title',name:c.label || 'Default Title'}],inventoryItem:{tracked:false,requiresShipping:true,countryCodeOfOrigin:'CA'}}))};
  }
  const optionName = item.optionName || 'Console model';
  const choices = item.options?.length ? item.options : [{ id: item.id, priceCents: item.priceCents }];
  return {
    productOptions: [
      ...(item.options?.length ? [{ name: optionName, position: 1, values: choices.map(choice => ({ name: choice.label })) }] : []),
      { name: "Fulfillment", position: item.options?.length ? 2 : 1, values: [{ name: "Delivery" }, { name: "Edmonton Pickup" }] },
    ],
    variants: choices.flatMap(choice => ["Delivery", "Edmonton Pickup"].map(fulfillment => {
      const pickup = fulfillment === "Edmonton Pickup";
      const cents = choice.priceCents - (pickup ? (item.pickupPriceDifferenceCents ?? pickupDifferenceCents) : 0);
      if (!Number.isInteger(cents) || cents < 0) throw new Error("Invalid managed variant price.");
      return { optionValues: [
        ...(choice.label ? [{ optionName, name: choice.label }] : []),
        { optionName: "Fulfillment", name: fulfillment },
      ], sku: choice.id + (pickup ? "-pickup" : ""), price: (cents / 100).toFixed(2), taxable: false,
      inventoryItem: { tracked: false, requiresShipping: true, countryCodeOfOrigin: "CA" } };
    })),
  };
}
