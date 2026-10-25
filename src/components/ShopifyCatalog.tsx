import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchShopifyCatalog, type ShopifyCatalog } from "../lib/shopify";
import { PICKUP_PRICE_DIFFERENCE, useFulfillment } from "./Fulfillment";
import { fulfillmentSku } from "../lib/shopify";
import { pickupDifference } from "../lib/fulfillmentPricing";
import products from "../data/catalog";
import {stockLimit, type StockRecord} from "../../commerce/stock-limits.mjs";

export type ActiveSale = {
  status: "active";
  title: string;
  percentage: number;
  endAt?: string;
  scope: string;
  productIds: string[];
  collectionId: string | null;
  variants: Record<string, { priceCents: number; compareAtCents: number }>;
};

const emptyCatalog: ShopifyCatalog = { prices: {}, compareAtPrices: {}, names: {} };
const ShopifyCatalogContext = createContext<{
  catalog: ShopifyCatalog;
  sale: ActiveSale | null;
  refresh: () => Promise<void>;
  catalogLoaded: boolean;
  catalogError: boolean;
  inventory: {enabled:boolean;stock:StockRecord;checkedAt?:string};
  inventoryLoaded: boolean;
}>({ catalog: emptyCatalog, sale: null, refresh: async () => {}, catalogLoaded: false, catalogError: false, inventory:{enabled:false,stock:{}},inventoryLoaded:false });

export function ShopifyCatalogProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<ShopifyCatalog>(emptyCatalog);
  const [sale, setSale] = useState<ActiveSale | null>(null);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [inventory,setInventory]=useState<{enabled:boolean;stock:StockRecord;checkedAt?:string}>({enabled:false,stock:{}});
  const [inventoryLoaded,setInventoryLoaded]=useState(false);
  const inventoryPending=useRef<Promise<void>|null>(null);
  const refreshInventory=useCallback(()=>{if(inventoryPending.current)return inventoryPending.current;const pending=(async()=>{try{const r=await fetch("/.netlify/functions/shop-inventory?action=status",{cache:"no-store",signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error();const data=await r.json();if(typeof data.enabled!=="boolean"||!data.stock)throw Error();setInventory(data);}catch{setInventory({enabled:true,stock:{}});}finally{setInventoryLoaded(true);inventoryPending.current=null;}})();inventoryPending.current=pending;return pending;},[]);
  useEffect(()=>{void refreshInventory();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refreshInventory();},30000);const onFocus=()=>void refreshInventory();window.addEventListener("focus",onFocus);return()=>{window.clearInterval(timer);window.removeEventListener("focus",onFocus);};},[refreshInventory]);
  const refresh = useCallback(async () => {
    void refreshInventory();
    const [nextCatalog, saleResult] = await Promise.all([
      fetchShopifyCatalog(),
      fetch("/.netlify/functions/shop-sale?action=status", { cache: "no-store", signal: AbortSignal.timeout(12000) })
        .then((response) => response.ok ? response.json() : null).catch(() => null),
    ]);
    setCatalog(nextCatalog);
    setCatalogLoaded(true);
    setCatalogError(false);
    const candidate: ActiveSale | null = saleResult?.sale?.status === "active" && (!saleResult.sale.endAt || Date.parse(saleResult.sale.endAt) > Date.now()) ? saleResult.sale : null;
    // Never advertise a sale until every scoped Shopify variant reflects its verified price.
    const verified = candidate && Object.entries(candidate.variants).every(([sku, variant]) =>
      nextCatalog.prices[sku] === variant.priceCents && nextCatalog.compareAtPrices[sku] === variant.compareAtCents,
    );
    setSale(verified ? candidate : null);
  }, [refreshInventory]);
  useEffect(() => {
    void refresh().catch(() => { setSale(null); setCatalogError(true); });
    const interval = window.setInterval(() => { void refresh().catch(() => setSale(null)); }, 180000);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh().catch(() => setSale(null)); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);
  useEffect(() => {
    if (!sale?.endAt) return;
    const remaining = Date.parse(sale.endAt) - Date.now();
    if (remaining <= 0) { setSale(null); return; }
    const timeout = window.setTimeout(() => setSale(null), Math.min(remaining, 2147483647));
    return () => window.clearTimeout(timeout);
  }, [sale]);
  const value = useMemo(() => ({ catalog, sale, refresh, catalogLoaded, catalogError, inventory,inventoryLoaded }), [catalog, sale, refresh, catalogLoaded, catalogError,inventory,inventoryLoaded]);
  return <ShopifyCatalogContext.Provider value={value}>{children}</ShopifyCatalogContext.Provider>;
}

export function useShopifyCatalog() {
  const { catalog: { prices, compareAtPrices, names }, sale, refresh, catalogLoaded, catalogError,inventory,inventoryLoaded } = useContext(ShopifyCatalogContext);
  const { mode } = useFulfillment();
  const priceFor = (id: string, fallback: number) => {
    const product = products.find(item => item.id === id);
    // Unreleased previews show the proposed item price, never an unconfirmed pickup price.
    if (product && "launchReady" in product && product.launchReady === false) return fallback;
    return prices[fulfillmentSku(id, mode)] ?? Math.max(0, fallback - (mode === "pickup" ? pickupDifference(id) : 0));
  };
  const compareAtFor = (id: string) => {
    if (!sale) return null;
    const sku = fulfillmentSku(id, mode);
    const old = compareAtPrices[sku];
    return old && old > prices[sku] && sale.variants[sku] ? old : null;
  };
  return {
    prices, compareAtPrices, names, sale, refresh, catalogLoaded, catalogError,
    inventoryEnabled:inventory.enabled,inventoryLoaded,stock:inventory.stock,
    stockFor:(id:string)=>inventory.stock[fulfillmentSku(id,mode)],
    stockLimitFor:(id:string)=>inventoryLoaded?stockLimit(inventory.stock,inventory.enabled,fulfillmentSku(id,mode)):0,
    priceFor, compareAtFor,
    onSale: (id: string) => Boolean(sale?.productIds.includes(id)),
    deliveredPriceFor: (id: string, fallback: number) => prices[fulfillmentSku(id, "delivered")] ?? fallback,
    nameFor: (id: string, fallback: string) => names[id] ?? fallback,
  };
}
