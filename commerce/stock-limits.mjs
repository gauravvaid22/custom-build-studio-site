export function stockLimit(stock,enabled,sku) {
 if(!enabled)return 20;
 const value=stock[sku];
 return value && !value.unknown && value.sellable && Number.isInteger(value.available)?Math.max(0,value.available):0;
}
export function stockRequested(items,skuFor) {
 const requested=new Map();
 for(const item of items) {
  if(!Number.isInteger(item.quantity)||item.quantity<1)throw Error('Choose a whole-number quantity.');
  const sku=skuFor(item.id);requested.set(sku,(requested.get(sku)||0)+item.quantity);
 }
 return requested;
}
export function assertStockQuantities(items,stock,enabled,skuFor) {
 if(!enabled)return;
 for(const [sku,quantity] of stockRequested(items,skuFor)) {
  const value=stock[sku];
  if(!value || value.unknown || !Number.isInteger(value.available))throw Error('Stock could not be confirmed. Refresh your cart and try again.');
  if(!value.sellable || value.available<=0)throw Error('An item in your cart has sold out. Please review your selection.');
  if(quantity>value.available)throw Error(`Only ${value.available} of this item ${value.available===1?'is':'are'} available. Please update your cart quantity.`);
 }
}
