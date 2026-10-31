/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOPIFY_STOREFRONT_TOKEN?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_GOOGLE_ADS_ID?: string;
  readonly VITE_GOOGLE_ADS_QUOTE_CONVERSION_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*/commerce/merchandising.mjs" {
  export const merchandisingDefaults: any;
  export const PURE_HALLOWEEN_PRODUCT_IDS: string[];
  export const PURE_CHRISTMAS_PRODUCT_IDS: string[];
  export const SEASONAL_PRESETS: Record<string, any>;
  export function validateMerchandising(input: any): any;
}
