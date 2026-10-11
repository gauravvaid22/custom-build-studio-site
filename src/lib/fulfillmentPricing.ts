import products from "../../commerce/products.json";
import pricing from "../../commerce/pricing.json";
export function pickupDifference(id: string) {
 const product = products.find(p => p.id === id);
 return product && "pickupPriceDifferenceCents" in product ? product.pickupPriceDifferenceCents ?? pricing.pickupPriceDifferenceCents : pricing.pickupPriceDifferenceCents;
}
export function shippingFee(items: {id: string; quantity: number}[], mode: string) {
 if (mode === "pickup") return 0;
 // This collection's single flat fee applies once, including mixed carts.
 return items.reduce((fee, item) => {
  const product = products.find(p => p.id === item.id);
  return Math.max(fee, product && "shippingFeeCents" in product ? product.shippingFeeCents ?? 0 : 0);
 }, 0);
}
export function productShippingFee(id: string) { return shippingFee([{id, quantity:1}], "delivered"); }
