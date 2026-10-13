export function orderShippingFee(items:{id:string;quantity:number}[],products:{id:string;shippingPriceMode?:string;shippingFeeCents?:number}[],options?:{active?:boolean;mode?:string}):number;
