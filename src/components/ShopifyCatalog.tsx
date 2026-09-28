import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchShopifyPrices } from "../lib/shopify";

type CatalogPrices = Record<string, number>;
const ShopifyCatalogContext = createContext<CatalogPrices>({});

export function ShopifyCatalogProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = useState<CatalogPrices>({});
  useEffect(() => {
    let active = true;
    fetchShopifyPrices()
      .then((next) => active && setPrices(next))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const value = useMemo(() => prices, [prices]);
  return (
    <ShopifyCatalogContext.Provider value={value}>
      {children}
    </ShopifyCatalogContext.Provider>
  );
}

export function useShopifyCatalog() {
  const prices = useContext(ShopifyCatalogContext);
  return {
    prices,
    priceFor: (id: string, fallback: number) => prices[id] ?? fallback,
  };
}
