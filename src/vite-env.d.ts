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
