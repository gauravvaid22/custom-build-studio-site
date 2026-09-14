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
const attributionKey = "cbs-campaign";
const campaignKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
];
function captureCampaign() {
  try {
    const params = new URLSearchParams(window.location.search);
    const campaign: Record<string, string> = {};
    for (const key of campaignKeys) {
      const value = params.get(key);
      if (value && /^[a-zA-Z0-9 _.,~+:/-]{1,200}$/.test(value))
        campaign[key] = value;
    }
    if (Object.keys(campaign).length)
      sessionStorage.setItem(attributionKey, JSON.stringify(campaign));
  } catch {
    /* Tracking must not interrupt the quote experience. */
  }
}
function campaignLocation() {
  const url = new URL(window.location.pathname, window.location.origin);
  try {
    const campaign = JSON.parse(sessionStorage.getItem(attributionKey) || "{}");
    for (const key of campaignKeys)
      if (typeof campaign[key] === "string")
        url.searchParams.set(key, campaign[key]);
  } catch {
    /* Storage can be unavailable in private browsers. */
  }
  return url.href;
}
function load() {
  if (!production() || window.cbsAnalyticsLoaded) return;
  window.cbsAnalyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", "G-8D08Z57Q3S", {
    send_page_view: false,
    page_location: campaignLocation(),
  });
  window.gtag("config", "AW-17678917579", {
    page_location: campaignLocation(),
  });
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
export function trackQuoteStart() {
  if (!production()) return;
  load();
  window.gtag?.("event", "quote_start", { form_name: "contact" });
}
export default function Analytics() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (!production()) return;
    captureCampaign();
  }, [pathname, search]);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest('a[href^="tel:"]')
          : null;
      if (!link || !production()) return;
      load();
      window.gtag?.("event", "phone_click", {
        page_path: window.location.pathname,
      });
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  useEffect(() => {
    if (!production()) return;
    const timer = window.setTimeout(() => {
      load();
      window.gtag?.("event", "page_view", {
        page_path: pathname,
        page_location: campaignLocation(),
        page_title: document.title,
      });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  return null;
}
