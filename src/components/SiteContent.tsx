import { createContext, useContext, useEffect, useState } from "react";
import defaults from "../../commerce/site-content.json";
import defaultProductContent from "../../commerce/product-content.json";

export type SiteContent = typeof defaults;
const SiteContentContext = createContext<SiteContent>(defaults);
export type ProductContent = typeof defaultProductContent;
const ProductContentContext = createContext<ProductContent>(defaultProductContent);

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(defaults);
  const [productContent, setProductContent] = useState<ProductContent>(defaultProductContent);
  useEffect(() => {
    let active = true;
    fetch("/.netlify/functions/shop?action=config", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data?.siteContent)
          setContent({ ...defaults, ...data.siteContent });
        if (active && data?.productContent)
          setProductContent({ ...defaultProductContent, ...data.productContent });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return (
    <SiteContentContext.Provider value={content}>
      <ProductContentContext.Provider value={productContent}>
        {children}
      </ProductContentContext.Provider>
    </SiteContentContext.Provider>
  );
}

export const useSiteContent = () => useContext(SiteContentContext);
export const useProductContent = () => useContext(ProductContentContext);
export const wholeDollars = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-CA", { maximumFractionDigits: 2 })}`;
