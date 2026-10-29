import rawProducts from '../../commerce/products.json';
export type CatalogProduct = {
 bundleOffers?:{quantity:number;sku:string}[];purchaseOnly?:boolean;
 seoTitle?:string;seoDescription?:string;titleSource?:string;searchKeywords?:string[];
 id:string; name:string; priceCents:number; category:string; description:string; included:string; dimensions:string; notes:string;
 images:{src:string;thumb:string;alt:string;sourceFile?:string;mediaId?:string}[];
 seasonal?:boolean; productionReviewed?:boolean; source?:string; video?:string; videos?:string[];
 variants?:{id:string;label:string;priceCents:number;dimensions:string}[]; variantOf?:string; variantLabel?:string; shopifyHandle?:string;
 personalized?:boolean; personalization?:{kind:string;photoCount:number}; listingGroup?:string;
 groupedDesigns?:{id:string;label:string;optionIds:string[]}[]; galleryOverviewCover?:boolean; launchReady?:boolean;
 basePriceCents?:number;deliveryExtraCents?:number;pricingSchemaVersion?:number;
 shippingPriceMode?:"included"|"per-order";pickupPriceDifferenceCents?:number; shippingFeeCents?:number;
};
const products = rawProducts as CatalogProduct[];
export default products;
