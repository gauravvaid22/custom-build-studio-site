import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchShopifyCatalog, type ShopifyCatalog } from "../lib/shopify";
import { PICKUP_PRICE_DIFFERENCE, useFulfillment } from "./Fulfillment";
import { fulfillmentSku } from "../lib/shopify";
import { pickupDifference } from "../lib/fulfillmentPricing";
import products from "../data/catalog";

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
}>({ catalog: emptyCatalog, sale: null, refresh: async () => {}, catalogLoaded: false, catalogError: false });

export function ShopifyCatalogProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<ShopifyCatalog>(emptyCatalog);
  const [sale, setSale] = useState<ActiveSale | null>(null);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const refresh = useCallback(async () => {
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
  }, []);
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
  const value = useMemo(() => ({ catalog, sale, refresh, catalogLoaded, catalogError }), [catalog, sale, refresh, catalogLoaded, catalogError]);
  return <ShopifyCatalogContext.Provider value={value}>{children}</ShopifyCatalogContext.Provider>;
}

export function useShopifyCatalog() {
  const { catalog: { prices, compareAtPrices, names }, sale, refresh, catalogLoaded, catalogError } = useContext(ShopifyCatalogContext);
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
    priceFor, compareAtFor,
    onSale: (id: string) => Boolean(sale?.productIds.includes(id)),
    deliveredPriceFor: (id: string, fallback: number) => prices[fulfillmentSku(id, "delivered")] ?? fallback,
    nameFor: (id: string, fallback: string) => names[id] ?? fallback,
  };
}
