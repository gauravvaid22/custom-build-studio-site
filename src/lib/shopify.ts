import type { CartItem } from "../components/Cart";
import type { FulfillmentMode } from "../components/Fulfillment";
import products from "../../commerce/products.json";

const storeDomain = "aqk73w-k2.myshopify.com";
const apiVersion = "2026-07";
const storefrontToken = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN?.trim();

type CatalogVariant = {
  id: string;
  sku: string | null;
  availableForSale: boolean;
  price: { amount: string; currencyCode: string };
};

type CatalogProduct = {
  handle: string;
  title: string;
  variants: { nodes: CatalogVariant[] };
};

export type ShopifyCatalog = {
  prices: Record<string, number>;
  names: Record<string, string>;
};

type GraphResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export const shopifyConfigured = Boolean(storefrontToken);

export function fulfillmentSku(id: string, mode: FulfillmentMode) {
  const product = products.find(item => item.id === id);
  const sku = product && "variants" in product && product.variants?.length ? product.variants[0].id : id;
  return mode === "pickup" ? `${sku}-pickup` : sku;
}

function shopifyHandleFor(product: (typeof products)[number]) {
  if ("shopifyHandle" in product && product.shopifyHandle) return product.shopifyHandle;
  return "variantOf" in product ? product.variantOf : product.id;
}

export async function fetchShopifyCatalog(): Promise<ShopifyCatalog> {
  if (!storefrontToken) return { prices: {}, names: {} };
  const handles = [
    ...new Set(
      products
        .filter((product) => !("variantOf" in product))
        .map(shopifyHandleFor),
    ),
  ];
  const variableDefinitions = handles
    .map((_, index) => `$handle${index}: String!`)
    .join(", ");
  const fields = handles
    .map(
      (_, index) =>
        `product${index}: product(handle: $handle${index}) { handle title variants(first: 100) { nodes { sku price { amount currencyCode } } } }`,
    )
    .join("\n");
  const variables = Object.fromEntries(
    handles.map((handle, index) => [`handle${index}`, handle]),
  );
  const catalog = await storefront<Record<string, CatalogProduct | null>>(
    `query CatalogPrices(${variableDefinitions}) { ${fields} }`,
    variables,
  );
  const prices: Record<string, number> = {};
  const names: Record<string, string> = {};
  Object.values(catalog).forEach((product) => {
    if (product?.handle && product.title) names[product.handle] = product.title;
    product?.variants.nodes.forEach((variant) => {
      if (
        variant.sku &&
        variant.price.currencyCode === "CAD" &&
        Number.isFinite(Number(variant.price.amount))
      ) {
        prices[variant.sku] = Math.round(Number(variant.price.amount) * 100);
      }
    });
  });
  return { prices, names };
}

function productHandle(id: string) {
  const product = products.find((item) => item.id === id);
  if (!product) throw new Error("A cart item is no longer available.");
  return shopifyHandleFor(product);
}

async function storefront<T>(query: string, variables: Record<string, unknown>) {
  if (!storefrontToken) {
    throw new Error("Shopify checkout is being connected. Please try again shortly.");
  }

  const response = await fetch(
    `https://${storeDomain}/api/${apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20000),
    },
  );
  const payload = (await response.json()) as GraphResponse<T>;
  if (!response.ok || payload.errors?.length || !payload.data) {
    throw new Error(
      payload.errors?.[0]?.message ||
        "Shopify checkout is temporarily unavailable. Please try again.",
    );
  }
  return payload.data;
}

async function merchandiseFor(items: CartItem[], mode: FulfillmentMode, expectedPrices: Record<string, number>) {
  const handles = [...new Set(items.map((item) => productHandle(item.id)))];
  const variableDefinitions = handles
    .map((_, index) => `$handle${index}: String!`)
    .join(", ");
  const fields = handles
    .map(
      (_, index) =>
        `product${index}: product(handle: $handle${index}) { handle variants(first: 100) { nodes { id sku availableForSale price { amount currencyCode } } } }`,
    )
    .join("\n");
  const variables = Object.fromEntries(
    handles.map((handle, index) => [`handle${index}`, handle]),
  );
  const catalog = await storefront<Record<string, CatalogProduct | null>>(
    `query CatalogForCheckout(${variableDefinitions}) { ${fields} }`,
    variables,
  );

  const variants = new Map<string, CatalogVariant>();
  Object.values(catalog).forEach((product) =>
    product?.variants.nodes.forEach((variant) => {
      if (variant.sku) variants.set(variant.sku, variant);
    }),
  );

  return items.map((item) => {
    const variant = variants.get(fulfillmentSku(item.id, mode));
    if (!variant || !variant.availableForSale) {
      const name = products.find((product) => product.id === item.id)?.name;
      throw new Error(`${name || "A product"} is not available at checkout.`);
    }
    const cents = Math.round(Number(variant.price.amount) * 100);
    if (variant.price.currencyCode !== "CAD" || !Number.isSafeInteger(cents) || cents <= 0 ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      throw new Error("This item cannot be checked out. Please review your cart.");
    }
    if (expectedPrices[item.id] !== cents) {
      throw new Error("A product price has changed. Refresh this page to review the updated total before paying.");
    }
    return {
      merchandiseId: variant.id,
      quantity: item.quantity,
      ...(item.attributes?.length
        ? {
            attributes: item.attributes
              .filter((attribute) => attribute.key && attribute.value)
              .slice(0, 10)
              .map((attribute) => ({
                key: attribute.key.slice(0, 80),
                value: attribute.value.slice(0, 500),
              })),
          }
        : {}),
    };
  });
}

export async function createShopifyCheckout(items: CartItem[], mode: FulfillmentMode, expectedPrices: Record<string, number>) {
  if (!items.length) throw new Error("Your cart is empty.");
  const lines = await merchandiseFor(items, mode, expectedPrices);
  const result = await storefront<{
    cartCreate: {
      cart: { checkoutUrl: string } | null;
      userErrors: { message: string }[];
      warnings: { message: string }[];
    };
  }>(
    `mutation CreateCart($input: CartInput!) {
      cartCreate(input: $input) {
        cart { checkoutUrl }
        userErrors { message }
        warnings { message }
      }
    }`,
    {
      input: {
        lines,
        buyerIdentity: { countryCode: "CA" },
        attributes: [{ key: "Storefront", value: "custombuildstudio.ca" }, { key: "Order handoff", value: mode === "pickup" ? "Edmonton pickup by appointment — no delivery" : "Delivered — free Canadian tracked shipping" }],
        ...(mode === "pickup" ? { note: "EDMONTON PICKUP ONLY. Arrange a time and privately send the address after ordering. Do not ship this order." } : {}),
      },
    },
  );
  const error = result.cartCreate.userErrors[0]?.message;
  if (error || result.cartCreate.warnings?.length || !result.cartCreate.cart?.checkoutUrl) {
    throw new Error(error || result.cartCreate.warnings?.[0]?.message || "Shopify could not start checkout. Please try again.");
  }
  return result.cartCreate.cart.checkoutUrl;
}
