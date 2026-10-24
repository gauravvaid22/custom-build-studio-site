import { useShopifyCatalog } from "./ShopifyCatalog";
import { useFulfillment } from "./Fulfillment";
import { useEffect, useRef } from "react";
import { analyticsTestMode } from "../lib/analyticsPreferences";
import { useLocation } from "react-router-dom";
import products from "../data/catalog";

type ShopEvent = "view_item" | "add_to_cart" | "begin_checkout" | "view_item_list" | "select_item" | "view_cart";
type ShopLine = { id: string; quantity: number; priceCents?: number };

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
  /^\/shop\/(order|admin|photo)(\/|$)/.test(window.location.pathname);
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
  if (!production() || privateRoute() || analyticsTestMode() || !validMeasurementId()) return false;
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

/** Preserve the anonymous storefront session at the hosted-checkout handoff.
 * Never include uploaded photos, email, phone, names or addresses. Analytics
 * failure/blocked scripts must not prevent someone from paying. */
export async function checkoutAnalyticsAttributes(): Promise<{ key: string; value: string }[]> {
  if (analyticsTestMode()) return [{ key: "_cbs_analytics_test", value: "1" }];
  if (!loadAnalytics()) return [];
  const read = (field: string) => new Promise<string | null>(resolve => {
    const timeout = window.setTimeout(() => resolve(null), 700);
    window.gtag?.("get", measurementId, field, (value: unknown) => {
      window.clearTimeout(timeout);
      resolve(typeof value === "string" || typeof value === "number" ? String(value) : null);
    });
  });
  const [clientId, sessionId] = await Promise.all([read("client_id"), read("session_id")]);
  const attributes: { key: string; value: string }[] = [];
  if (clientId && /^[a-zA-Z0-9._-]{1,100}$/.test(clientId)) attributes.push({ key: "_cbs_ga_client_id", value: clientId });
  if (sessionId && /^\d{1,20}$/.test(sessionId)) attributes.push({ key: "_cbs_ga_session_id", value: sessionId });
  try {
    const campaign = JSON.parse(sessionStorage.getItem(attributionKey) || "{}");
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"])
      if (typeof campaign[key] === "string" && /^[a-zA-Z0-9 _.,~+:/-]{1,200}$/.test(campaign[key]))
        attributes.push({ key: `_cbs_${key}`, value: campaign[key] });
  } catch { /* Checkout works without attribution storage. */ }
  return attributes;
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
        price: (line.priceCents ?? product.priceCents) / 100,
        quantity: line.quantity,
      },
    ];
  });
}

/** Tracks a GA4 ecommerce action after the corresponding shop action succeeds. */
export function trackShop(event: ShopEvent, lines: ShopLine[], fulfillment?: string, listId?: string) {
  if (!loadAnalytics()) return;
  const items = shopItems(lines);
  if (!items.length) return;
  window.gtag?.("event", event, {
    send_to: measurementId,
    currency: "CAD",
    ...(fulfillment ? { fulfillment_method: fulfillment } : {}),
    value: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    ...(listId ? { item_list_id: listId } : {}),
    items: items.map((item, index) => ({ ...item, ...(listId ? { item_list_id: listId, index } : {}) })),
    page_location: campaignLocation(),
    transport_type: "beacon",
  });
}

/** Only catalog identifiers, counts and controlled reason codes belong here. */
export function trackShopInteraction(event: "search" | "select_fulfillment" | "product_media" | "select_variant" | "checkout_error" | "personalization_upload", details: { item_id?: string; media_type?: "photo" | "video"; media_index?: number; fulfillment_method?: string; search_term?: string; result_count?: number; reason?: "price_changed" | "checkout_unavailable" }) {
  if (!loadAnalytics()) return;
  window.gtag?.("event", event, { send_to: measurementId, ...details, page_location: campaignLocation() });
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

/** Only controlled library IDs and starting-point labels; never customer/model links. */
export function trackModelDiscovery(event: "model_library_click" | "model_quote_start" | "model_quote_sent", details: { library_id?: string; starting_point?: "link" | "file" | "idea" } = {}) {
  if (!loadAnalytics()) return;
  window.gtag?.("event", event, { send_to: measurementId, ...details, page_location: campaignLocation() });
}

export default function Analytics() {
  const { pathname, search, key: navigationKey } = useLocation();
  const { mode } = useFulfillment();
  const { priceFor, catalogLoaded } = useShopifyCatalog();
  const viewed = useRef("");

  useEffect(() => {
    const disabled = privateRoute() || analyticsTestMode();
    (window as unknown as Record<string, boolean>)[analyticsDisabledKey()] =
      disabled;
    if (disabled || !production()) return;
    captureCampaign();
    if (!loadAnalytics()) return;
    window.gtag?.("event", "page_view", {
      send_to: measurementId,
      page_path: pathname,
      page_location: campaignLocation(),
      page_title: document.title,
    });
  }, [pathname, search]);

  useEffect(() => {
    if (!catalogLoaded) return;
    const productId = pathname.match(/^\/shop\/([^/]+)\/?$/)?.[1];
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    const requestedVariant = new URLSearchParams(search).get("variant");
    const selectedVariant = products.find(
      (item) =>
        item.id === requestedVariant &&
        (("variantOf" in item && item.variantOf === product.id) || ("variants" in product && product.variants?.some(variant => variant.id === item.id))),
    );
    const signature = `${navigationKey}:${selectedVariant?.id || product.id}:${mode}`;
    if (viewed.current === signature) return;
    viewed.current = signature;
    trackShop("view_item", [
      { id: selectedVariant?.id || product.id, quantity: 1, priceCents: priceFor(selectedVariant?.id || product.id, selectedVariant?.priceCents || product.priceCents) },
    ], mode);
  }, [pathname, search, navigationKey, mode, catalogLoaded, priceFor]);

  useEffect(() => {
    const click = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest('a[href^="tel:"], a[href^="mailto:"]')
          : null;
      if (!link || !loadAnalytics()) return;
      // Contact intent is diagnostic; never count an email click as a sent enquiry.
      // Keep addresses, phone numbers, mail subjects and body text out of analytics.
      const eventName = link.getAttribute("href")?.startsWith("mailto:") ? "email_click" : "phone_click";
      window.gtag?.("event", eventName, {
        send_to: measurementId,
        page_path: window.location.pathname,
        page_location: campaignLocation(),
      });
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);

  return null;
}
