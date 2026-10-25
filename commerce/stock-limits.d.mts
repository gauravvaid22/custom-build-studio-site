export type StockRecord=Record<string,{available:number|null;sellable:boolean;unknown?:boolean}>;
export function stockLimit(stock:StockRecord,enabled:boolean,sku:string):number;
export function stockRequested(items:{id:string;quantity:number}[],skuFor:(id:string)=>string):Map<string,number>;
export function assertStockQuantities(items:{id:string;quantity:number}[],stock:StockRecord,enabled:boolean,skuFor:(id:string)=>string):void;
