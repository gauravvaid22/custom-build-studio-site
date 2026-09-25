import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import products from "../../commerce/products.json";

type ShopEvent = "view_item" | "add_to_cart" | "begin_checkout";
type ShopLine = { id: string; quantity: number };

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
const googleAdsId = import.meta.env.VITE_GOOGLE_ADS_ID?.trim();
const quoteConversionId =
  import.meta.env.VITE_GOOGLE_ADS_QUOTE_CONVERSION_ID?.trim();

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
    cbsAnalyticsLoaded?: boolean;
  }
}

const production = () =>
  window.location.hostname === "custombuildstudio.ca" ||
  window.location.hostname === "www.custombuildstudio.ca";

// These routes can contain private order or administration data. The public
// Shopify handoff page remains tracked so the full customer funnel is visible.
const privateRoute = () =>
  /^\/shop\/(order|admin)(\/|$)/.test(window.location.pathname);
const validMeasurementId = () => Boolean(measurementId?.match(/^G-[A-Z0-9]+$/));
const validAdsId = () => Boolean(googleAdsId?.match(/^AW-\d+$/));
const analyticsDisabledKey = () =>
  measurementId ? `ga-disable-${measurementId}` : "ga-disable-unconfigured";

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
    /* Tracking must never interrupt the customer experience. */
  }
}

function campaignLocation() {
  // Rebuild the URL from the path and approved campaign keys so arbitrary
  // query-string content is never copied into analytics.
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

function loadAnalytics() {
  if (!production() || privateRoute() || !validMeasurementId()) return false;
  if (window.cbsAnalyticsLoaded) return true;

  window.cbsAnalyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
    page_location: campaignLocation(),
  });
  if (validAdsId()) {
    window.gtag("config", googleAdsId, {
      page_location: campaignLocation(),
    });
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId!)}`;
  script.dataset.cbsAnalytics = "true";
  document.head.appendChild(script);
  return true;
}

function shopItems(lines: ShopLine[]) {
  return lines.flatMap((line) => {
    const product = products.find((item) => item.id === line.id);
    if (!product) return [];
    return [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.priceCents / 100,
        quantity: line.quantity,
      },
    ];
  });
}

/** Tracks a GA4 ecommerce action after the corresponding shop action succeeds. */
export function trackShop(event: ShopEvent, lines: ShopLine[]) {
  if (!loadAnalytics()) return;
  const items = shopItems(lines);
  if (!items.length) return;
  window.gtag?.("event", event, {
    send_to: measurementId,
    currency: "CAD",
    value: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    items,
    page_location: campaignLocation(),
  });
}

export function trackQuote() {
  if (!loadAnalytics()) return;
  window.gtag?.("event", "generate_lead", { form_name: "contact" });
  if (quoteConversionId)
    window.gtag?.("event", "conversion", { send_to: quoteConversionId });
}

export function trackQuoteStart() {
  if (!loadAnalytics()) return;
  window.gtag?.("event", "quote_start", { form_name: "contact" });
}

export default function Analytics() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const disabled = privateRoute();
    (window as unknown as Record<string, boolean>)[analyticsDisabledKey()] =
      disabled;
    if (disabled || !production()) return;
    captureCampaign();
    if (!loadAnalytics()) return;
    window.gtag?.("event", "page_view", {
      send_to: measurementId,
      page_path: `${pathname}${search}`,
      page_location: campaignLocation(),
      page_title: document.title,
    });
  }, [pathname, search]);

  useEffect(() => {
    const productId = pathname.match(/^\/shop\/([^/]+)\/?$/)?.[1];
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    const requestedVariant = new URLSearchParams(search).get("variant");
    const selectedVariant = products.find(
      (item) =>
        item.id === requestedVariant &&
        "variantOf" in item &&
        item.variantOf === product.id,
    );
    trackShop("view_item", [
      { id: selectedVariant?.id || product.id, quantity: 1 },
    ]);
  }, [pathname, search]);

  useEffect(() => {
    const click = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest('a[href^="tel:"]')
          : null;
      if (!link || !loadAnalytics()) return;
      window.gtag?.("event", "phone_click", {
        page_path: window.location.pathname,
      });
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);

  return null;
}
