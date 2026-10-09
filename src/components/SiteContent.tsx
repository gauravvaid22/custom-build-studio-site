import { createContext, useContext, useEffect, useState } from "react";
import merchandisingDefaults from "../../commerce/shop-merchandising.json";
import { activeShopFeature, type Merchandising } from "../lib/shopDiscovery";
import defaults from "../../commerce/site-content.json";
import defaultProductContent from "../../commerce/product-content.json";

export type SiteContent = typeof defaults;
const SiteContentContext = createContext<SiteContent>(defaults);
export type ProductContent = typeof defaultProductContent;
const ProductContentContext = createContext<ProductContent>(defaultProductContent);

const MerchandisingContext = createContext<Merchandising>(merchandisingDefaults);

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [merchandising, setMerchandising] = useState<Merchandising>(merchandisingDefaults);
  const [content, setContent] = useState<SiteContent>(defaults);
  const [productContent, setProductContent] = useState<ProductContent>(defaultProductContent);
  useEffect(() => {
    let active = true;
    const updated = (event: Event) => setMerchandising((event as CustomEvent<Merchandising>).detail);
    window.addEventListener("cbs-merchandising-updated", updated);
    fetch("/.netlify/functions/shop?action=config", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data?.merchandising) setMerchandising({ ...merchandisingDefaults, ...data.merchandising });
        if (active && data?.siteContent)
          setContent({ ...defaults, ...data.siteContent });
        if (active && data?.productContent)
          setProductContent({ ...defaultProductContent, ...data.productContent });
      })
      .catch(() => undefined);
    return () => {
      active = false;
      window.removeEventListener("cbs-merchandising-updated", updated);
    };
  }, []);
  return (
    <MerchandisingContext.Provider value={merchandising}>
    <SiteContentContext.Provider value={content}>
      <ProductContentContext.Provider value={productContent}>
        {children}
      </ProductContentContext.Provider>
    </SiteContentContext.Provider>
    </MerchandisingContext.Provider>
  );
}

export const useSiteContent = () => useContext(SiteContentContext);
export const useProductContent = () => useContext(ProductContentContext);
export const wholeDollars = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-CA", { maximumFractionDigits: 2 })}`;

export const useShopMerchandising = () => useContext(MerchandisingContext);
export function useShopFeature() {
  const config = useShopMerchandising();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  return activeShopFeature(config, now);
}
