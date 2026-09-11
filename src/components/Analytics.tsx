import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    cbsAnalyticsLoaded?: boolean;
  }
}
const production = () =>
  window.location.hostname === "custombuildstudio.ca" ||
  window.location.hostname === "www.custombuildstudio.ca";
function load() {
  if (!production() || window.cbsAnalyticsLoaded) return;
  window.cbsAnalyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", "G-8D08Z57Q3S", { send_page_view: false });
  window.gtag("config", "AW-17678917579");
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=G-8D08Z57Q3S";
  document.head.appendChild(script);
}
export function trackQuote() {
  if (!production()) return;
  load();
  window.gtag?.("event", "generate_lead", { form_name: "contact" });
  window.gtag?.("event", "conversion", {
    send_to: "AW-17678917579/L2otCKraw7QbEMu_--1B",
  });
}
export default function Analytics() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!production()) return;
    const timer = window.setTimeout(() => {
      load();
      window.gtag?.("event", "page_view", {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  return null;
}
