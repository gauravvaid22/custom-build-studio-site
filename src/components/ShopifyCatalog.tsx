import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchShopifyCatalog, type ShopifyCatalog } from "../lib/shopify";

import { useFulfillment } from "./Fulfillment";
import { fulfillmentSku } from "../lib/shopify";

const emptyCatalog: ShopifyCatalog = { prices: {}, names: {} };
const ShopifyCatalogContext = createContext<ShopifyCatalog>(emptyCatalog);

export function ShopifyCatalogProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<ShopifyCatalog>(emptyCatalog);
  useEffect(() => {
    let active = true;
    fetchShopifyCatalog()
      .then((next) => active && setCatalog(next))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const value = useMemo(() => catalog, [catalog]);
  return (
    <ShopifyCatalogContext.Provider value={value}>
      {children}
    </ShopifyCatalogContext.Provider>
  );
}

export function useShopifyCatalog() {
  const { prices, names } = useContext(ShopifyCatalogContext);
  const { mode } = useFulfillment();
  return {
    prices,
    names,
    priceFor: (id: string, fallback: number) => prices[fulfillmentSku(id, mode)] ?? Math.max(0, fallback - (mode === "pickup" ? 1000 : 0)),
    deliveredPriceFor: (id: string, fallback: number) => prices[fulfillmentSku(id, "delivered")] ?? fallback,
    nameFor: (id: string, fallback: string) => names[id] ?? fallback,
  };
}
