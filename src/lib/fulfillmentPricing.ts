import {orderShippingFee} from "../../commerce/order-shipping.mjs";
import delivery from "../../commerce/delivery-policy.json" with {type:"json"};
import products from "../data/catalog";
import pricing from "../../commerce/pricing.json";
export function pickupDifference(id: string) {
 const product = products.find(p => p.id === id);
 return product && "pickupPriceDifferenceCents" in product ? product.pickupPriceDifferenceCents ?? pricing.pickupPriceDifferenceCents : pricing.pickupPriceDifferenceCents;
}
export function shippingFee(items: {id: string; quantity: number}[], mode: string) {
 return orderShippingFee(items,products,{active:delivery.active,mode});
}
export function productShippingFee(id: string) { return shippingFee([{id, quantity:1}], "delivered"); }
