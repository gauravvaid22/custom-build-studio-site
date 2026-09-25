import type { CartItem } from "../components/Cart";
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
  variants: { nodes: CatalogVariant[] };
};

type GraphResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export const shopifyConfigured = Boolean(storefrontToken);

function productHandle(id: string) {
  const product = products.find((item) => item.id === id);
  if (!product) throw new Error("A cart item is no longer available.");
  return "variantOf" in product ? product.variantOf : product.id;
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

async function merchandiseFor(items: CartItem[]) {
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
    const variant = variants.get(item.id);
    if (!variant || !variant.availableForSale) {
      const name = products.find((product) => product.id === item.id)?.name;
      throw new Error(`${name || "A product"} is not available at checkout.`);
    }
    return { merchandiseId: variant.id, quantity: item.quantity };
  });
}

export async function createShopifyCheckout(items: CartItem[]) {
  if (!items.length) throw new Error("Your cart is empty.");
  const lines = await merchandiseFor(items);
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
        attributes: [{ key: "Storefront", value: "custombuildstudio.ca" }],
      },
    },
  );
  const error = result.cartCreate.userErrors[0]?.message;
  if (error || !result.cartCreate.cart?.checkoutUrl) {
    throw new Error(error || "Shopify could not start checkout. Please try again.");
  }
  return result.cartCreate.cart.checkoutUrl;
}
