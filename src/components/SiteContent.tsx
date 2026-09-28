import { createContext, useContext, useEffect, useState } from "react";
import defaults from "../../commerce/site-content.json";

export type SiteContent = typeof defaults;
const SiteContentContext = createContext<SiteContent>(defaults);

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(defaults);
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
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return (
    <SiteContentContext.Provider value={content}>
      {children}
    </SiteContentContext.Provider>
  );
}

export const useSiteContent = () => useContext(SiteContentContext);
export const wholeDollars = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-CA", { maximumFractionDigits: 2 })}`;
