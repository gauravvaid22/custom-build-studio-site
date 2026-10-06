import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import products from "../../commerce/products.json";
import settings from "../../commerce/settings.json";
import collections from "../../commerce/collections.json";
import { PageIntro } from "../components/Shared";
import { useCart, money } from "../components/Cart";
import { NotFound } from "./Studio";
import "../shop.css";
import { trackShop } from "../components/Analytics";
import { createShopifyCheckout, fulfillmentSku, shopifyConfigured } from "../lib/shopify";
import { useShopifyCatalog } from "../components/ShopifyCatalog";
import { type ProductContent, type SiteContent, useProductContent, useSiteContent } from "../components/SiteContent";
import { LithophaneProduct } from "../components/LithophaneProduct";
import { FulfillmentSelector, useFulfillment } from "../components/Fulfillment";
import { LithophaneAdmin } from "../components/LithophaneAdmin";

type Product = (typeof products)[number];
type ProductVariant = {
  id: string;
  label: string;
  priceCents: number;
  dimensions: string;
};
const variantsFor = (product: Product): ProductVariant[] =>
  "variants" in product ? product.variants || [] : [];
const isVariant = (product: Product) => "variantOf" in product;
const catalogProduct = (id: string) => products.find((product) => product.id === id);
const halloweenSpecialIds =
  collections.find((collection) => collection.id === "halloween")?.products || [];
const departmentCollections = collections.filter((collection) => collection.kind === "department");
const evergreenProducts = products.filter((product) => !("variantOf" in product));
type Order = {
  id: string;
  number: string;
  createdAt: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  detailsStatus: string;
  deliveryStatus: string;
  fulfillment: string;
  testMode: boolean;
  canPay: boolean;
  paymentEligible: boolean;
  customRequest?: string;
  ownerNotification?: {status: string};
  notificationPreview?: string;
  revision?: string;
  paymentEmail: string;
  productionTime: string;
  pickupInstructions: string;
  customer: { name: string; email: string; phone: string };
  address: null | { street: string; city: string; postal: string };
  notes: string;
  subtotalCents: number;
  fulfillmentCents: number;
  taxCents: number;
  totalCents: number;
  lines: {
    id: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }[];
  history: { at: string; action: string; note?: string }[];
};
async function api(
  action: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const result = await fetch(`/.netlify/functions/shop?action=${action}`, {
    signal: AbortSignal.timeout(20000),
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try {
    data = await result.json();
  } catch {
    throw Error("The order service is unavailable. Please try again later.");
  }
  if (!result.ok) throw Error(data.error || "Unable to complete this request.");
  return data;
}
export function ShopNav({ showFulfillment = true }: { showFulfillment?: boolean } = {}) {
  return (
    <>
    <nav className="shop-nav container" aria-label="Shop categories">
      <Link className="shop-nav-home" to="/shop">Shop</Link>
      <div className="shop-nav-collections">
        <Link to="/shop/all">Shop all</Link>
        {departmentCollections.map((collection) => (
          <Link key={collection.id} to={`/shop/${collection.id}`}>
            {collection.shortName}
          </Link>
        ))}
        <Link to="/shop/halloween">Halloween</Link>
        <Link to="/shop/gifts-under-25">$25 &amp; under</Link>
      </div>
    </nav>
    {showFulfillment && <FulfillmentSelector />}
    </>
  );
}
function ShopNotice() {
  const { mode } = useFulfillment();
  const content = useSiteContent();
  return (
    <div className="shop-notice container">
      {settings.pricesAreProvisional
        ? "Collection preview — prices and production details are being reviewed. "
        : ""}
      Finished physical products <span aria-hidden="true">·</span> No digital files{" "}
      <span aria-hidden="true">·</span> {mode === "pickup" ? "Edmonton pickup by appointment" : content.shippingMessage}{" "}
      <span aria-hidden="true">·</span> Secure Shopify checkout
    </div>
  );
}
function ProductImage({
  product,
  index = 0,
  large = false,
}: {
  product: Product;
  index?: number;
  large?: boolean;
}) {
  const image = product.images[index];
  return image ? (
    <img
      src={large ? image.src : image.thumb}
      srcSet={`${image.thumb} 480w, ${image.src} 1200w`}
      sizes={large ? "(max-width: 700px) 90vw, 45vw" : "(max-width: 700px) 90vw, (max-width: 1000px) 45vw, 30vw"}
      alt={image.alt}
      loading={large ? "eager" : "lazy"}
      decoding="async"
      width="900"
      height="900"
    />
  ) : (
    <div className="shop-image-pending">Product photography pending</div>
  );
}
function AddProduct({
  product,
  variantId,
  onVariantChange,
}: {
  product: Product;
  variantId?: string;
  onVariantChange?: (id: string) => void;
}) {
  const { add } = useCart();
  const { priceFor, nameFor } = useShopifyCatalog();
  const [quantity, setQuantity] = useState(1);
  const [confirmation, setConfirmation] = useState("");
  const [confirmationKey, setConfirmationKey] = useState(0);
  const confirmationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (confirmationTimer.current) clearTimeout(confirmationTimer.current);
    },
    [],
  );
  const variants = variantsFor(product);
  const variantLabel =
    "variantLabel" in product && typeof product.variantLabel === "string"
      ? product.variantLabel
      : "Bottle diameter";
  const selectedId = variantId || variants[0]?.id;
  const orderProduct = selectedId ? catalogProduct(selectedId) || product : product;
  return (
    <form
      className="shop-add"
      onSubmit={(e) => {
        e.preventDefault();
        if (!add(orderProduct.id, quantity)) { setConfirmation(""); return; }
        setConfirmation(`${quantity} × ${nameFor(orderProduct.id, orderProduct.name)}`);
        setConfirmationKey((current) => current + 1);
        if (confirmationTimer.current) clearTimeout(confirmationTimer.current);
        confirmationTimer.current = setTimeout(() => setConfirmation(""), 4200);
      }}
    >
      {variants.length > 0 && (
        <label className="shop-variant-select">
          {variantLabel}
          <select
            value={selectedId}
            onChange={(event) => onVariantChange?.(event.target.value)}
            aria-label={`${variantLabel} for ${nameFor(product.id, product.name)}`}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label} · {money(priceFor(variant.id, variant.priceCents))}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Quantity
        <input
          aria-label={`Quantity for ${nameFor(product.id, product.name)}`}
          type="number"
          min="1"
          max="20"
          step="1"
          required
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </label>
      <button className="button" type="submit">
        Add to Cart <span aria-hidden="true">+</span>
      </button>
      {confirmation && (
        <div
          className="shop-added-confirmation"
          key={confirmationKey}
          role="status"
          aria-live="polite"
        >
          <span className="shop-added-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H7" />
              <circle cx="10" cy="19" r="1.25" />
              <circle cx="17" cy="19" r="1.25" />
              <path d="m10 10 1.6 1.6L15 8.2" />
            </svg>
          </span>
          <span>
            <strong>Added to cart</strong>
            <small>{confirmation}</small>
          </span>
          <Link to="/shop/cart">View cart →</Link>
        </div>
      )}
    </form>
  );
}
function ShopProductCard({ product }: { product: Product }) {
  const { priceFor, nameFor } = useShopifyCatalog();
  const managedProducts = useProductContent();
  const managed = product.id === "lithophane-table-lamp" ? managedProducts["lithophane-table-lamp"] : null;
  const displayName = managed?.name || nameFor(product.id, product.name);
  const displayPrice = priceFor(product.id, managed?.priceCents ?? product.priceCents);
  const alternate = product.images[1];
  const variants = variantsFor(product);
  const hasPriceRange = variants.length > 1 && variants.some(
    (variant) => priceFor(variant.id, variant.priceCents) !== priceFor(variants[0].id, variants[0].priceCents),
  );
  return (
    <article className="shop-card">
      <Link className="shop-card-image" to={`/shop/${product.id}`}>
        <ProductImage product={product} />
        {alternate && (
          <img
            className="shop-card-alternate"
            src={alternate.thumb}
            srcSet={`${alternate.thumb} 480w, ${alternate.src} 1200w`}
            sizes="(max-width: 700px) 90vw, (max-width: 1000px) 45vw, 30vw"
            alt=""
            loading="lazy"
            decoding="async"
            width="900"
            height="900"
            aria-hidden="true"
          />
        )}
        <span className="shop-badge">{product.category}</span>
      </Link>
      <div className="shop-card-body">
        <p className="eyebrow">MADE IN EDMONTON</p>
        <h3><Link to={`/shop/${product.id}`}>{displayName}</Link></h3>
        <p className="shop-price">
          {hasPriceRange ? "From " : ""}{money(displayPrice)}{" "}
          <span>CAD</span>
        </p>
        {managed ? (
          <Link className="button" to={`/shop/${product.id}`}>{managed.available ? "Personalize yours ↗" : "View details ↗"}</Link>
        ) : variantsFor(product).length ? (
          <Link className="button" to={`/shop/${product.id}`}>
            {"variantLabel" in product && product.variantLabel === "Design"
              ? "Choose design ↗"
              : "Choose size ↗"}
          </Link>
        ) : <AddProduct product={product} />}
      </div>
    </article>
  );
}

function BenefitIcon({ type }: { type: string }) {
  const paths: Record<string, React.ReactNode> = {
    local: <><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></>,
    made: <><path d="M4 17 17 4l3 3L7 20H4v-3Z"/><path d="m14 7 3 3"/></>,
    checkout: <><rect x="4" y="7" width="16" height="11" rx="2"/><path d="M4 11h16M8 15h3"/></>,
    shipping: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>;
}

function ShopBenefits() {
  const { mode } = useFulfillment();
  return (
    <div className="shop-benefits" aria-label="Shopping benefits">
      <div><BenefitIcon type="local"/><span><strong>Made in Edmonton</strong><small>Prepared locally</small></span></div>
      <div><BenefitIcon type="made"/><span><strong>Made to order</strong><small>Prepared for you</small></span></div>
      <div><BenefitIcon type="checkout"/><span><strong>Secure checkout</strong><small>Powered by Shopify</small></span></div>
      <div><BenefitIcon type="shipping"/><span><strong>{mode === "pickup" ? "Edmonton pickup" : "Free tracked shipping"}</strong><small>{mode === "pickup" ? "By appointment" : "Across Canada"}</small></span></div>
    </div>
  );
}

export function Shop() {
  const { mode } = useFulfillment();
  const { priceFor, nameFor } = useShopifyCatalog();
  const content = useSiteContent();
  const featuredProduct = catalogProduct("pumpkin-head-halloween-mask")!;
  const pumpkinMask = catalogProduct("pumpkin-head-halloween-mask")!;
  const carvedMask = catalogProduct("carved-in-fear-halloween-mask")!;
  const primaryCollections = departmentCollections;
  const under25 = collections.find((collection) => collection.id === "gifts-under-25")!;
  const featuredIds = ["lithophane-table-lamp", "dinosaur-skeleton-collection", "octopus-wine-bottle-holder", "night-owl-wall-light", "basilisk-dice-tower", "mood-ghost"];
  useEffect(() => {
    const section = document.getElementById("collections");
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const cards = section.querySelectorAll<HTMLElement>(".shop-collection-card");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("shop-card-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -5% 0px" });
    cards.forEach((card) => {
      if (card.getBoundingClientRect().top < window.innerHeight * 0.85) card.classList.add("shop-card-visible");
      else observer.observe(card);
    });
    section.classList.add("shop-scroll-ready");
    return () => {
      observer.disconnect();
      section.classList.remove("shop-scroll-ready");
    };
  }, []);
  return (
    <>
      <ShopNav showFulfillment={false} />
      <section className="shop-hero shop-hub-hero">
        <div className="container shop-hero-grid">
          <div>
            <p className="eyebrow">MADE IN EDMONTON / SHOP ONLINE</p>
            <h1>
              Find something
              <br />
              <span>made for you.</span>
            </h1>
            <p className="lead">
              Explore finished products, from personalized lights and home décor
              to gaming accessories, character gifts and Halloween masks.
            </p>
            <div className="button-row">
              <a className="button" href="#collections">Shop by category ↘</a>
              <Link className="button button-outline" to="/shop/all">See every product ↗</Link>
            </div>
            <p className="small">
              Physical products · Secure Shopify checkout · {mode === "pickup" ? "Edmonton pickup by appointment" : "Free tracked Canadian shipping"}
            </p>
          </div>
          <Link to={`/shop/${featuredProduct.id}/`} className="shop-hero-photo">
            <ProductImage product={featuredProduct} large />
            <span>
              {nameFor(featuredProduct.id, featuredProduct.name)} · {money(priceFor(featuredProduct.id, featuredProduct.priceCents))} CAD ↗
            </span>
          </Link>
        </div>
      </section>
      <ShopNotice />
      <section className="section shop-collections-section" id="collections">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">FIND YOUR KIND OF PRODUCT</p>
              <h2>Shop by category.</h2>
            </div>
            <p>Start with what you are looking for, then explore the details.</p>
          </div>
          <div className="shop-collection-grid">
            {primaryCollections.map((collection, index) => {
              const cover = catalogProduct(collection.coverProduct)!;
              return (
                <Link className="shop-collection-card" style={{"--delay": `${(index % 2) * 90}ms`} as React.CSSProperties} key={collection.id} to={`/shop/${collection.id}`}>
                  <ProductImage product={cover} />
                  <span className="shop-collection-overlay">
                    <small>{collection.products.length} {collection.products.length === 1 ? "product" : "products"}</small>
                    <strong>{collection.name}</strong>
                    <span>View products</span>
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="shop-collection-shortcuts">
            <Link to="/shop/all">See all {evergreenProducts.length} products ↗</Link>
            <Link to="/shop/halloween">Halloween collection ↗</Link>
          </div>
        </div>
      </section>
      <FulfillmentSelector />
      <section className="container shop-mask-feature" aria-labelledby="shop-mask-feature-title">
        <div className="shop-mask-feature-copy">
          <p className="eyebrow">HALLOWEEN / MADE IN EDMONTON</p>
          <h2 id="shop-mask-feature-title">Meet the masks.</h2>
          <p>Choose a full pumpkin head with connecting magnets, or a front-face mask that ties behind your head. Both arrive finished and wearable.</p>
          <Link className="button halloween-button" to="/shop/masks-costumes">Shop wearable masks ↗</Link>
        </div>
        <div className="shop-mask-feature-images">
          <Link to={`/shop/${pumpkinMask.id}/`} aria-label="Explore the Pumpkin Head full-head mask">
            <ProductImage product={pumpkinMask} large />
            <span><strong>Pumpkin Head</strong><small>Full-head mask ↗</small></span>
          </Link>
          <Link to={`/shop/${carvedMask.id}/`} aria-label="Explore the Carved in Fear front-face mask">
            <ProductImage product={carvedMask} large />
            <span><strong>Carved in Fear</strong><small>Front-face mask ↗</small></span>
          </Link>
        </div>
      </section>
      <section className="section shop-under-section">
        <div className="container">
          <div className="section-heading">
            <div><p className="eyebrow">{under25.eyebrow}</p><h2>Small gifts. Easy choices.</h2></div>
            <Link className="text-link" to="/shop/gifts-under-25">See every gift at $25 or less →</Link>
          </div>
          <div className="shop-product-strip">
            {products.filter(p => !isVariant(p) && priceFor(p.id, p.priceCents) <= 2500).slice(0, 4).map(({id}) => {
              const product = catalogProduct(id)!;
              return <Link key={id} to={`/shop/${id}`}><ProductImage product={product}/><span>{nameFor(product.id, product.name)}<strong>{money(priceFor(product.id, product.priceCents))}</strong></span></Link>;
            })}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-heading">
            <div><p className="eyebrow">FEATURED RIGHT NOW</p><h2>Pieces worth a closer look.</h2></div>
            <p>Made-to-order physical prints. No digital files.</p>
          </div>
          <div className="shop-grid">
            {featuredIds.map((id) => <ShopProductCard key={id} product={catalogProduct(id)!}/>) }
          </div>
        </div>
      </section>
      <section className="container"><ShopBenefits/></section>
      <section className="shop-how section">
        <div className="container detail-columns">
          <div>
            <p className="eyebrow">FROM YOUR CART TO YOUR DOOR</p>
            <h2>Simple from the first click.</h2>
            <p>
              Choose a product, add it to your cart and continue to Shopify
              for your shipping address and secure payment.
            </p>
          </div>
          <div>
            <h3>{mode === "pickup" ? "Your pickup. Your schedule." : "Tracked shipping is included."}</h3>
            <p>
              {mode === "pickup" ? "Collect in Southeast Edmonton by appointment. We email the private address after ordering." : "Standard tracked shipping is free across Canada."} Contact us first
              for colour changes or custom work.
            </p>
            <p>{content.productionTime}.</p>
            <Link className="text-link" to="/products">
              Explore our studio-designed charging stand ↗
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export function HalloweenSpecial() {
  const { mode } = useFulfillment();
  const featured = halloweenSpecialIds.map((id) => catalogProduct(id)!).filter(Boolean);
  const masks = ["pumpkin-head-halloween-mask", "carved-in-fear-halloween-mask"]
    .map((id) => catalogProduct(id)!).filter(Boolean);
  const otherPieces = featured.filter((product) => !masks.some((mask) => mask.id === product.id));
  return (
    <div className="halloween-special">
      <ShopNav showFulfillment={false} />
      <section className="halloween-special-hero">
        <div className="halloween-fog halloween-fog-one" aria-hidden="true" />
        <div className="halloween-fog halloween-fog-two" aria-hidden="true" />
        <span className="halloween-ember halloween-ember-one" aria-hidden="true" />
        <span className="halloween-ember halloween-ember-two" aria-hidden="true" />
        <div className="container halloween-special-hero-content">
          <nav className="halloween-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/shop">Gifts &amp; Décor</Link>
            <span aria-hidden="true">/</span>
            <span>Halloween Special</span>
          </nav>
          <p className="eyebrow">LIMITED SEASON / MADE IN EDMONTON</p>
          <h1>Dark details.<br /><span>Built to haunt.</span></h1>
          <p className="lead">
            Explore the complete seasonal collection: sculptural ghosts,
            pumpkin lights, wearable masks, skeleton characters, dishes and graveyard details.
          </p>
          <div className="button-row">
            <a className="button halloween-button" href="#halloween-masks">
              Explore the masks ↘
            </a>
            <Link className="button button-dark" to="/shop/halloween">
              Shop all Halloween ↗
            </Link>
          </div>
          <ul className="halloween-special-facts" aria-label="Collection details">
            <li><strong>{featured.length}</strong><span>Halloween pieces</span></li>
            <li><strong>{mode === "pickup" ? "Local" : "Free"}</strong><span>{mode === "pickup" ? "Edmonton pickup" : "tracked Canadian shipping"}</span></li>
            <li><strong>Edmonton</strong><span>printed locally</span></li>
          </ul>
        </div>
      </section>
      <FulfillmentSelector />
      <ShopNotice />
      <section className="section halloween-special-products halloween-mask-section" id="halloween-masks" aria-labelledby="halloween-mask-heading">
        <div className="container">
          <div className="section-heading halloween-special-heading">
            <div>
              <p className="eyebrow">FINISHED & WEARABLE</p>
              <h2 id="halloween-mask-heading">Two masks. Two ways to haunt.</h2>
            </div>
            <p>Pick your style, then choose a size. See the full gallery and video on each product page.</p>
          </div>
          <div className="shop-grid halloween-special-grid">
            {masks.map((product, index) => (
              <div className="halloween-product-reveal" style={{ "--halloween-delay": `${index * 90}ms` } as React.CSSProperties} key={product.id}>
                <ShopProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section halloween-special-products" id="halloween-special-products">
        <div className="container">
          <div className="section-heading halloween-special-heading">
            <div>
              <p className="eyebrow">THE HALLOWEEN SPECIAL</p>
              <h2>More Halloween character.</h2>
            </div>
            <p>Explore the rest of the seasonal collection, made locally in Edmonton.</p>
          </div>
          <div className="shop-grid halloween-special-grid">
            {otherPieces.map((product, index) => (
              <div
                className="halloween-product-reveal"
                style={{ "--halloween-delay": `${index * 90}ms` } as React.CSSProperties}
                key={product.id}
              >
                <ShopProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section halloween-special-process">
        <div className="container detail-columns">
          <div>
            <p className="eyebrow">SEASONAL / STRUCTURAL / LOCAL</p>
            <h2>Halloween character, made with precision.</h2>
          </div>
          <div>
            <p>
              Each piece is printed to order by Custom Build Studio in Edmonton.
              Product pages show the finished dimensions, included items, full
              image galleries and video where available.
            </p>
            <Link className="text-link" to="/shop/halloween">
              Browse the full Halloween collection →
            </Link>
          </div>
        </div>
      </section>
      <section className="container"><ShopBenefits /></section>
    </div>
  );
}

export function ShopCollection({ id }: { id: string }) {
  const collection = id === "all" ? {
    id: "all",
    name: "Shop All Products",
    shortName: "Shop all",
    eyebrow: "THE COMPLETE COLLECTION",
    heading: "Find your next favourite.",
    description: "Explore every finished product made by Custom Build Studio, from useful accessories to personalized gifts and seasonal pieces.",
    seoDescription: "Browse all finished Custom Build Studio products made in Edmonton, including gifts, home décor, gaming accessories, figurines and Halloween masks.",
    coverProduct: "lithophane-table-lamp",
    products: evergreenProducts.map((product) => product.id),
    kind: "curated",
  } : collections.find((item) => item.id === id);
  const { priceFor } = useShopifyCatalog();
  const [sort, setSort] = useState("featured");
  if (!collection) return <NotFound />;
  const listed = id === "gifts-under-25" ? products.filter(p => !isVariant(p) && priceFor(p.id, p.priceCents) <= 2500) : collection.products.map((productId) => catalogProduct(productId)!).filter(Boolean);
  const sorted = [...listed].sort((a, b) =>
    sort === "price-low" ? priceFor(a.id, a.priceCents) - priceFor(b.id, b.priceCents) :
    sort === "price-high" ? priceFor(b.id, b.priceCents) - priceFor(a.id, a.priceCents) : 0,
  );
  const cover = catalogProduct(collection.coverProduct)!;
  return (
    <>
      <ShopNav showFulfillment={false} />
      <nav className="container shop-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/shop">Shop</Link><span aria-hidden="true">/</span><span>{collection.name}</span>
      </nav>
      <section className="shop-collection-hero shop-category-hero">
        <div className="container shop-hero-grid">
          <div>
            <p className="eyebrow">{collection.eyebrow}</p>
            <h1>{collection.heading}</h1>
            <p className="lead">{collection.description}</p>
            <a className="button" href="#products">View {listed.length} {listed.length === 1 ? "product" : "products"} ↘</a>
          </div>
          <div className="shop-collection-hero-image"><ProductImage product={cover} large/></div>
        </div>
      </section>
      <FulfillmentSelector />
      <ShopNotice/>
      <section className="section" id="products">
        <div className="container">
          <div className="shop-collection-toolbar">
            <div><p className="eyebrow">THE COLLECTION</p><h2>{collection.name}</h2></div>
            <label>Sort products
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
          </div>
          <div className="shop-grid">{sorted.map((product) => <ShopProductCard key={product.id} product={product}/>)}</div>
        </div>
      </section>
      <section className="section shop-related-collections">
        <div className="container">
          <div className="section-heading"><div><p className="eyebrow">KEEP EXPLORING</p><h2>Another kind of curious.</h2></div></div>
          <div className="shop-related-links">
            {departmentCollections.filter((item) => item.id !== collection.id).slice(0, 4).map((item) => (
              <Link key={item.id} to={`/shop/${item.id}`}>{item.name}<span>↗</span></Link>
            ))}
          </div>
        </div>
      </section>
      <section className="container"><ShopBenefits/></section>
      <section className="section shop-collection-copy">
        <div className="container detail-columns">
          <div><p className="eyebrow">LOCALLY MADE</p><h2>{collection.name} in Edmonton</h2></div>
          <p>{collection.seoDescription} Every listing is for a finished physical product. Product pages show what is included, available options and the details to check before ordering.</p>
        </div>
      </section>
    </>
  );
}
export function ShopProduct() {
  const { mode } = useFulfillment();
  const { priceFor, nameFor } = useShopifyCatalog();
  const content = useSiteContent();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const product = products.find((p) => p.id === id);
  const [index, setIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  useEffect(() => {
    setIndex(0);
    const requested = searchParams.get("variant") || "";
    const valid = product && variantsFor(product).some(v => v.id === requested);
    setSelectedVariantId(valid ? requested : "");
    if (valid && product) {
      const label = variantsFor(product).find(v => v.id === requested)?.label;
      const photo = product.images.findIndex(image => "design" in image && image.design === label);
      if (photo >= 0) setIndex(photo);
    }
  }, [id, searchParams]);
  if (!product) return <NotFound />;
  if (product.id === "lithophane-table-lamp") return <><ShopNav /><ShopNotice /><LithophaneProduct /></>;
  const videos =
    "videos" in product && Array.isArray(product.videos)
      ? product.videos
      : "video" in product && product.video
        ? [product.video]
        : [];
  const showingVideo =
    index >= product.images.length &&
    index < product.images.length + videos.length;
  const activeVideo = showingVideo ? videos[index - product.images.length] : undefined;
  const variants = variantsFor(product);
  const selectedVariant = catalogProduct(selectedVariantId || variants[0]?.id || product.id) || product;
  const isHalloweenMask = product.id === "pumpkin-head-halloween-mask" || product.id === "carved-in-fear-halloween-mask";
  const productionMessage = content.productionTime.replace(/ready to ship/gi, mode === "pickup" ? "ready for pickup" : "ready to ship");
  const deliveryEstimate = "Estimated delivery: about one week for most Canadian addresses; remote areas may take longer.";
  const selectedImage = !showingVideo ? product.images[index] : undefined;
  const selectedDesign =
    selectedImage && "design" in selectedImage && typeof selectedImage.design === "string"
      ? selectedImage.design
      : undefined;
  const chooseVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    setSearchParams({ variant: variantId }, { replace: true, preventScrollReset: true });
    const label = variants.find((variant) => variant.id === variantId)?.label;
    const imageIndex = product.images.findIndex(
      (image) => "design" in image && image.design === label,
    );
    if (imageIndex >= 0) setIndex(imageIndex);
  };
  return (
    <>
      <ShopNav />
      <ShopNotice />
      <section className="section">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link> / <Link to="/shop/">Gifts & Décor</Link> / {nameFor(product.id, product.name)}</nav>
          <div className="shop-detail">
            <div>
              <div className="shop-main-image">
                {showingVideo ? (
                  <video
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    poster={product.images[0].src}
                    aria-label={`${nameFor(product.id, product.name)} product video`}
                  >
                    <source src={activeVideo} type="video/webm" />
                    Your browser does not support product video.
                  </video>
                ) : (
                  <ProductImage product={product} index={index} large />
                )}
              </div>
              {selectedDesign && (
                <p className="shop-design-indicator" role="status">
                  Viewing <strong>{selectedDesign}</strong>
                </p>
              )}
              <div className="shop-thumbs" aria-label="Product media">
                {product.images.map((image, i) => (
                  <button
                    key={image.src}
                    aria-label={`View ${"design" in image ? `${image.design} ` : ""}product photo ${i + 1}`}
                    aria-pressed={index === i}
                    onClick={() => setIndex(i)}
                  >
                    <img
                      src={image.thumb}
                      alt=""
                      loading="lazy"
                      width="90"
                      height="90"
                    />
                  </button>
                ))}
                {videos.map((video, videoIndex) => {
                  const mediaIndex = product.images.length + videoIndex;
                  return (
                    <button
                      className="shop-video-thumb"
                      key={video}
                      aria-label={`View product video ${videoIndex + 1}`}
                      aria-pressed={index === mediaIndex}
                      onClick={() => setIndex(mediaIndex)}
                    >
                      <img
                        src={product.images[Math.min(videoIndex + 1, product.images.length - 1)].thumb}
                        alt=""
                        loading="lazy"
                        width="90"
                        height="90"
                      />
                      <span aria-hidden="true">▶</span>
                    </button>
                  );
                })}
              </div>
              <p className="small">
                Colours will be similar to the main photo; shades may vary.
                Props are not included.
              </p>
            </div>
            <div className="shop-detail-info">
              <p className="eyebrow">{product.category} / MADE IN EDMONTON</p>
              <h1>{nameFor(product.id, product.name)}</h1>
              <p className="lead">{product.description}</p>
              <p className="shop-price">
                {money(priceFor(selectedVariant.id, selectedVariant.priceCents))}{" "}
                <span>
                  CAD
                  {settings.pricesAreProvisional ? " · provisional price" : ""}
                </span>
              </p>
              <ul className="shop-purchase-facts" aria-label="Purchase details">
                <li>{mode === "pickup" ? "Pickup in Southeast Edmonton by appointment" : "Free tracked shipping in Canada"}</li>
                <li>{mode === "pickup" ? productionMessage : deliveryEstimate}</li>
                <li>Secure payment through Shopify</li>
              </ul>
              <div className="shop-trust-links">
                <a href="https://share.google/r0qV4iw8FxD8SLkLL" target="_blank" rel="noreferrer">
                  Read customer reviews on Google ↗
                </a>
                <a href="tel:+17802030081">Questions? Call or text 780-203-0081</a>
              </div>
              <AddProduct
                product={product}
                variantId={selectedVariant.id}
                onVariantChange={chooseVariant}
              />
              <Link className="text-link" to="/shop/cart">
                View cart & checkout ↗
              </Link>
              <dl className="shop-specs">
                <dt>What you receive</dt>
                <dd>{selectedVariant.included} No STL or digital download.</dd>
                {!selectedVariant.dimensions.startsWith("Final dimensions") && <>
                  <dt>Approximate size</dt>
                  <dd>{selectedVariant.dimensions.replace("Source model: approximately", "Approximately").replace("Finished size: approximately", "Approximately").replace("Final printed dimensions require production review.", "Finished size may vary slightly.")}</dd>
                </>}
                {variants.length > 0 && product.id === "octopus-wine-bottle-holder" && <>
                  <dt>Size guide</dt>
                  <dd>
                    Choose by the widest diameter of your bottle. A typical 750 mL
                    Bordeaux-style bottle is close to 3 in wide. Burgundy-style
                    bottles are often wider, around 3.2 in or more. Bottle shapes
                    vary, so measure your bottle at its widest point before ordering.
                  </dd>
                </>}
                {isHalloweenMask && <>
                  <dt>Fit guide</dt>
                  <dd>The listed inner measurement comes from the model designer. It is not a head-circumference measurement and does not guarantee fit. Contact us before checkout if you are unsure which size to choose.</dd>
                </>}
                <dt>Colour & finish</dt>
                <dd>{isHalloweenMask ? "Orange and green colouring will be similar to the reference photos; exact shades and hand-finished details may vary. Contact us before checkout with colour questions." : "Similar to the main photo. Contact us before checkout to request a different colour."}</dd>
                <dt>Timing & handoff</dt>
                <dd>
                  {`${productionMessage.replace(/\.$/, "")}. ${mode === "pickup" ? "Pickup by appointment in Southeast Edmonton. We email your private pickup details after ordering." : `${deliveryEstimate} Free standard tracked shipping across Canada through Shopify checkout.`}`}
                </dd>
                <dt>Ordering & payment</dt>
                <dd>Secure payment is handled through Shopify. Contact us before checkout for special requests.</dd>
                <dt>Material</dt>
                <dd>Decorative pieces are generally made in PLA. We use PETG where extra toughness or moisture resistance is useful. Contact us before ordering if the exact material matters for your use.</dd>
                <dt>Care</dt>
                <dd>Handle small moving or separate parts gently. Contact us for material-specific cleaning and care advice.</dd>
              </dl>
              <p className="small">
                Printed by Custom Build Studio in Edmonton. Handle small moving
                or separate parts with care.
              </p>
            </div>
          </div>
          <aside className="shop-reference-note" aria-label="Related gifts">
            <h2>More to explore</h2>
            <div className="shop-filters">
              {products.filter(p => !isVariant(p) && p.id !== product.id && p.category === product.category).slice(0, 3).map(p => (
                <Link key={p.id} className="text-link" to={`/shop/${p.id}/`}>{nameFor(p.id, p.name)} · {money(priceFor(p.id, p.priceCents))} CAD →</Link>
              ))}
              <Link to="/shop/">Browse all gifts & décor →</Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
function CartQuantity({id,name,quantity}:{id:string;name:string;quantity:number}) {
  const {setQuantity}=useCart();
  const [draft,setDraft]=useState(String(quantity));
  useEffect(()=>setDraft(String(quantity)),[quantity]);
  return <input aria-label={`Quantity for ${name}`} type="number" min="1" max={settings.maxQuantityPerProduct} step="1" value={draft}
    onChange={event=>{const value=event.target.value;setDraft(value);const number=Number(value);if(Number.isInteger(number)&&number>=1&&number<=settings.maxQuantityPerProduct)setQuantity(id,number);}}
    onBlur={()=>setDraft(String(quantity))}/>;
}
export function ShopCart() {
  const { mode, lock } = useFulfillment();
  const { items, setQuantity } = useCart();
  const { priceFor, nameFor } = useShopifyCatalog();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      (() => { const product = products.find((p) => p.id === item.id); return product ? priceFor(product.id, product.priceCents) : 0; })() * item.quantity,
    0,
  );
  async function beginCheckout() {
    if (busy || !items.length) return;
    setBusy(true);
    setError("");
    lock(true);
    try {
      const expectedPrices = Object.fromEntries(items.map(item => { const product = catalogProduct(item.id)!; return [item.id, priceFor(item.id, product.priceCents)]; }));
      const checkoutUrl = await createShopifyCheckout(items, mode, expectedPrices);
      trackShop("begin_checkout", items.map(item => ({ ...item, priceCents: expectedPrices[item.id] })), mode);
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      setError((checkoutError as Error).message);
      setBusy(false);
      lock(false);
    }
  }
  return (
    <>
      <ShopNav />
      <PageIntro
        eyebrow="YOUR COLLECTION"
        title="Your cart."
        description={mode === "pickup" ? "Review your pickup order, then pay securely through Shopify. We’ll arrange your collection time after ordering." : "Review your items, then pay securely through Shopify. Free tracked shipping is included across Canada."}
      />
      <section className="section">
        <div className="container shop-cart-layout">
          <div>
            {!items.length ? (
              <div className="note-panel">
                <h2>Your next favourite is waiting.</h2>
                <p>Your cart is empty.</p>
                <Link className="button" to="/shop">
                  Browse the collection ↗
                </Link>
              </div>
            ) : (
              items.map((item) => {
                const product = products.find((p) => p.id === item.id)!;
                const productRoute = "variantOf" in product ? product.variantOf : product.id;
                return (
                  <article className="shop-cart-line" key={item.lineId || item.id}>
                    <Link to={`/shop/${productRoute}`}>
                      <ProductImage product={product} />
                    </Link>
                    <div>
                      <h2>
                        <Link to={`/shop/${productRoute}`}>{nameFor(product.id, product.name)}</Link>
                      </h2>
                      <p>{money(priceFor(product.id, product.priceCents))} CAD each</p>
                      {item.attributes?.length ? (
                        <p className="shop-personalization-summary">
                          ✓ Personalization photo attached
                          {item.attributes.find((attribute) => attribute.key === "Original filename")?.value
                            ? ` · ${item.attributes.find((attribute) => attribute.key === "Original filename")?.value}`
                            : ""}
                        </p>
                      ) : null}
                      <label>
                        Quantity
                        <CartQuantity id={item.lineId || item.id} name={nameFor(product.id, product.name)} quantity={item.quantity}/>
                      </label>
                      <button
                        className="text-link"
                        onClick={() => setQuantity(item.lineId || item.id, 0)}
                      >
                        Remove {nameFor(product.id, product.name)}
                      </button>
                    </div>
                    <strong>{money(priceFor(product.id, product.priceCents) * item.quantity)}</strong>
                  </article>
                );
              })
            )}
          </div>
          {!!items.length && (
            <aside className="note-panel">
              <h2>Order summary</h2>
              <p className="shop-total">
                <span>Items</span>
                <strong>{money(subtotal)} CAD</strong>
              </p>
              <p className="shop-total">
                <span>{mode === "pickup" ? "Edmonton pickup by appointment" : "Tracked shipping across Canada"}</span>
                <strong>Free</strong>
              </p>
              <p className="shop-total shop-cart-total">
                <strong>Total</strong>
                <strong>{money(subtotal)} CAD</strong>
              </p>
              <p className="small">
                {settings.pricesAreProvisional
                  ? "Prices are provisional pending production review. "
                  : ""}
                Need a different colour or another change? Contact us before checkout.
              </p>
              {error && <p className="shop-checkout-error" role="alert">{error}</p>}
              <button
                className="button shopify-checkout-button"
                type="button"
                disabled={busy || !shopifyConfigured}
                onClick={beginCheckout}
              >
                {busy ? "Opening secure checkout…" : "Secure checkout ↗"}
              </button>
              <p className="small">{mode === "pickup" ? "Choose Edmonton pickup at Shopify checkout. Your contact address does not request delivery. We’ll email your pickup arrangements after ordering." : "Delivered to your Canadian address. Shipping included."}</p>
              <p className="shop-secure-note">Shop Pay · Credit card · PayPal · Google Pay</p>
            </aside>
          )}
        </div>
      </section>
    </>
  );
}
export function Checkout() {
  const { mode, lock } = useFulfillment();
  const { items } = useCart();
  const { priceFor, nameFor } = useShopifyCatalog();
  const content = useSiteContent();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      (() => { const product = products.find((p) => p.id === item.id); return product ? priceFor(product.id, product.priceCents) : 0; })() * item.quantity,
    0,
  );

  async function beginCheckout() {
    if (busy || !items.length) return;
    setBusy(true);
    setError("");
    lock(true);
    try {
      const expectedPrices = Object.fromEntries(items.map(item => { const product = catalogProduct(item.id)!; return [item.id, priceFor(item.id, product.priceCents)]; }));
      const checkoutUrl = await createShopifyCheckout(items, mode, expectedPrices);
      trackShop("begin_checkout", items.map(item => ({ ...item, priceCents: expectedPrices[item.id] })), mode);
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      setError((checkoutError as Error).message);
      setBusy(false);
      lock(false);
    }
  }

  return (
    <>
      <ShopNav />
      <PageIntro
        eyebrow="SECURE CHECKOUT"
        title="Ready when you are."
        description="Review your order, then continue to Shopify for delivery and secure payment."
      />
      <section className="section">
        <div className="container shop-cart-layout">
          <div className="note-panel shopify-checkout-panel">
            <span className="eyebrow">POWERED BY SHOPIFY</span>
            <h2>{mode === "pickup" ? "Secure payment. Local pickup." : "Secure payment and free tracked shipping."}</h2>
            <p>
              {mode === "pickup" ? "Pay securely through Shopify, then we’ll email to arrange your pickup time and private address. Choose Edmonton pickup at checkout. Shopify asks for your contact address; this order will not be delivered." : "Shopify collects your contact information, Canadian shipping address and payment securely. Standard tracked shipping is free."}
            </p>
            <ol className="shop-steps" aria-label="Checkout steps">
              {["Review", "Address", "Payment"].map((step, index) => (
                <li key={step}>
                  <span aria-hidden="true">{index + 1}</span>
                  <strong>{step}</strong>
                </li>
              ))}
            </ol>
            <p className="small">
              Ordering a different colour or requesting a change?{" "}
              <Link to="/contact?service=3d-printing">
                Contact us before paying
              </Link>{" "}
              so we can confirm availability and pricing.
            </p>
            {error && <p role="alert">{error}</p>}
            {!shopifyConfigured && (
              <p role="status">Secure checkout is being connected.</p>
            )}
            <button
              type="button"
              className="button shopify-checkout-button"
              onClick={beginCheckout}
              disabled={busy || !items.length || !shopifyConfigured}
            >
              {busy
                ? "Opening secure checkout…"
                : "Continue to secure checkout ↗"}
            </button>
            {!items.length && (
              <Link to="/shop">Add products before checking out.</Link>
            )}
          </div>
          <aside className="note-panel">
            <h2>Your order</h2>
            {items.map((item) => (
              <div className="shop-checkout-line" key={item.lineId || item.id}><p className="shop-total">
                <span>
                  {(() => { const product = products.find((p) => p.id === item.id); return product ? nameFor(product.id, product.name) : "Product"; })()} ×{" "}
                  {item.quantity}
                </span>
                <strong>
                  {money(
                    (() => { const product = products.find((p) => p.id === item.id); return product ? priceFor(product.id, product.priceCents) : 0; })() * item.quantity,
                  )}
                </strong>
              </p>{item.attributes?.length ? <small>Personalization photo attached to this item.</small> : null}</div>
            ))}
            <p className="shop-total">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </p>
            <p className="shop-total">
              <span>{mode === "pickup" ? "Edmonton pickup" : "Free tracked shipping"}</span>
              <span>Free</span>
            </p>
            <p className="shop-total">
              <strong>Estimated total CAD</strong>
              <strong>{money(subtotal + settings.shippingFeeCents)}</strong>
            </p>
            <p className="small">
              Final delivery options and total are confirmed in Shopify
              checkout. Production: {content.productionTime}.
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}function OrderSteps({review = false}: {review?: boolean}) {
  const steps = review ? ["Place order", "Get approval", "e-Transfer", "We print"] : ["Place order", "e-Transfer", "We print"];
  return <ol className="shop-steps" aria-label="How your order works">{steps.map((step, index) => <li key={step}><span aria-hidden="true">{index + 1}</span><strong>{step}</strong></li>)}</ol>;
}
function CopyDetail({label, value}: {label: string; value: string}) {
  const [message, setMessage] = useState("");
  return <div className="shop-payment-row"><div><small>{label}</small><strong>{value}</strong></div>
    <button type="button" className="text-link" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setMessage("Copied"); }
      catch { setMessage("Select and copy the text above"); }
    }} aria-label={`Copy ${label}`}>Copy</button><span className="small" role="status">{message}</span></div>;
}
function OrderSummary({ order }: { order: Order }) {
  return (
    <>
      <div className="shop-order-status">
        <span>{order.paymentStatus === "Awaiting payment" && !order.paymentEligible && order.fulfillmentStatus !== "Cancelled" ? "Awaiting approval" : order.paymentStatus}</span>
        {order.fulfillmentStatus !== "Not started" && <span>{order.fulfillmentStatus}</span>}
      </div>
      {order.testMode && (
        <p className="shop-test-banner">
          TEST PREVIEW — do not send money.
        </p>
      )}
      {order.paymentEligible ? (
        <div className="note-panel">
          <h2>{order.testMode ? "Preview: payment instructions" : "Next: send your e-Transfer"}</h2>
          <CopyDetail label="Amount (CAD)" value={money(order.totalCents)} />
          <CopyDetail label="Send to" value={order.paymentEmail} />
          <CopyDetail label="Transfer message / order number" value={order.number} />
          <p>Use your banking app. Paste the order number into the transfer message.</p>
          <p className="small">We verify your payment, then print your order. No need to request approval again.</p>
          <details><summary>Bank asking for a security question?</summary><p>Call or text <a href="tel:+17802030081">{settings.phone}</a> before sending.</p></details>
        </div>
      ) : order.fulfillmentStatus === "Cancelled" ? (
        <p>This order has been cancelled. Do not send payment.</p>
      ) : order.paymentStatus === "Paid" ? (
        <p>
          Payment verified by the studio. Your fulfillment status is shown
          above.
        </p>
      ) : (
        <div className="note-panel">
          <h2>Order received. Hold off on payment.</h2>
          <p>{order.detailsStatus !== "Confirmed" ? "We’ll review your requested changes and contact you." : "We’ll check your delivery address and contact you."} Once approved, your payment details will appear here.</p>
          {order.customRequest && <p><strong>Your request:</strong> {order.customRequest}</p>}
          <OrderSteps review />
        </div>
      )}
      <dl className="shop-specs">
        <dt>Items</dt>
        <dd>
          {order.lines.map((line) => (
            <p className="shop-total" key={line.id}>
              <span>
                {line.name} × {line.quantity}
              </span>
              <strong>{money(line.lineTotalCents)}</strong>
            </p>
          ))}
        </dd>
        <dt>Fulfillment</dt>
        <dd>
          {order.fulfillment === "pickup"
            ? "Free Edmonton pickup"
            : `Local delivery: ${money(order.fulfillmentCents)} · ${order.deliveryStatus}`}
        </dd>
        <dt>Total</dt>
        <dd>
          {money(order.totalCents)} CAD · GST {money(order.taxCents)}
        </dd>
        <dt>Production</dt>
        <dd>{order.productionTime}</dd>
      </dl>
      {order.fulfillment === "pickup" && <p>{order.pickupInstructions}</p>}
    </>
  );
}
export function OrderConfirmation() {
  const [order, setOrder] = useState<Order | null>(null),
    [error, setError] = useState(""),
    [key, setKey] = useState("");
  async function load(value: string) {
    try {
      const data = await api("lookup", { key: value });
      setOrder(data.order);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    let value = window.location.hash.slice(1);
    if (!value)
      try {
        value = sessionStorage.getItem("cbs-order-key") || "";
      } catch {}
    setKey(value);
    if (value) void load(value);
  }, []);
  return (
    <>
      <ShopNav />
      <PageIntro
        eyebrow="ORDER CONFIRMATION"
        title={order ? order.number : "Your order."}
        description="Keep this private confirmation link to check your order. It is not a payment receipt."
      />
      <section className="section">
        <div className="container narrow">
          {error && <p role="alert">{error}</p>}
          {order ? (
            <>
              <OrderSummary order={order} />
              <div className="button-row">
                <button className="button" onClick={() => load(key)}>
                  Refresh order status
                </button>
                <button
                  className="button button-dark"
                  onClick={() => window.print()}
                >
                  Print / save confirmation
                </button>
              </div>
              <p className="small">
                Keep this link private. No automatic confirmation email is sent;
                contact the studio if you lose it.
              </p>
            </>
          ) : !key ? (
            <p>
              Open the private confirmation link shown after checkout, or
              contact the studio with your order number.
            </p>
          ) : (
            <p>Loading your order…</p>
          )}
        </div>
      </section>
    </>
  );
}
export function ShopAdmin() {
  const publicContent = useSiteContent();
  const publicProductContent = useProductContent();
  const { prices, deliveredPriceFor: priceFor, nameFor } = useShopifyCatalog();
  const [key, setKey] = useState(""),
    [orders, setOrders] = useState<Order[]>([]),
    [error, setError] = useState(""),
    [logged, setLogged] = useState(false),
    [busy, setBusy] = useState(false),
    [content, setContent] = useState<SiteContent>(publicContent),
    [productContent, setProductContent] = useState<ProductContent>(publicProductContent),
    [tab, setTab] = useState<"orders" | "website" | "products" | "lithophane">("orders"),
    [saved, setSaved] = useState("");
  async function load() {
    try {
      const [orderData, contentData, productData] = await Promise.all([
        api("list", {}, { Authorization: "Bearer " + key }),
        api("get-content", {}, { Authorization: "Bearer " + key }),
        api("get-product-content", {}, { Authorization: "Bearer " + key }),
      ]);
      setOrders(orderData.orders);
      setContent(contentData.siteContent);
      setProductContent(productData.productContent);
      setLogged(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function saveWebsite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dollars = (name: string) => Math.round(Number(form.get(name)) * 100);
    const next: SiteContent = {
      fdmStartingPriceCents: dollars("fdmStartingPrice"),
      resinStartingPriceCents: dollars("resinStartingPrice"),
      cadHourlyRateCents: dollars("cadHourlyRate"),
      scanningHourlyRateCents: dollars("scanningHourlyRate"),
      cncStartingPriceCents: dollars("cncStartingPrice"),
      fdmBuildVolume: String(form.get("fdmBuildVolume") || ""),
      resinBuildVolume: String(form.get("resinBuildVolume") || ""),
      productionTime: String(form.get("productionTime") || ""),
      shippingMessage: String(form.get("shippingMessage") || ""),
    };
    setBusy(true);
    setSaved("");
    try {
      const data = await api(
        "save-content",
        { siteContent: next },
        { Authorization: "Bearer " + key },
      );
      setContent(data.siteContent);
      setSaved("Website settings saved. Refresh the public page to see the update.");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function update(event: FormEvent<HTMLFormElement>, order: Order) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api(
        "update",
        {
          id: order.id,
          revision: order.revision,
          action: form.get("action"),
          note: form.get("note"),
        },
        { Authorization: "Bearer " + key },
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageIntro
        eyebrow="PRIVATE / STUDIO ADMINISTRATION"
        title="Studio control panel."
        description="Review legacy orders, update website service details and open Shopify product pricing from one private page."
      />
      <section className="section">
        <div className="container">
          {!logged ? (
            <form
              className="quote-form narrow"
              onSubmit={(e) => {
                e.preventDefault();
                void load();
              }}
            >
              <label>
                Administrator key
                <input
                  type="password"
                  required
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button className="button">Open orders</button>
            </form>
          ) : (
            <>
              <div className="shop-admin-tabs" role="tablist" aria-label="Administration sections">
                <button className={tab === "orders" ? "button" : "button button-dark"} onClick={() => setTab("orders")}>Orders</button>
                <button className={tab === "website" ? "button" : "button button-dark"} onClick={() => setTab("website")}>Website settings</button>
                <button className={tab === "products" ? "button" : "button button-dark"} onClick={() => setTab("products")}>Product prices</button>
                <button className={tab === "lithophane" ? "button" : "button button-dark"} onClick={() => setTab("lithophane")}>Lithophane product</button>
                <button
                  className="button button-dark"
                  onClick={() => {
                    setKey("");
                    setOrders([]);
                    setLogged(false);
                  }}
                >
                  Sign out
                </button>
              </div>
              {tab === "orders" && <>
              <button className="text-link" onClick={load}>Refresh orders</button>
              {!orders.length && <p>No legacy orders yet. New Shopify orders appear in Shopify Admin.</p>}
              {orders.map((order) => (
                <article className="shop-admin-order" key={order.id}>
                  <h2>{order.number}</h2>
                  <p>
                    {new Date(order.createdAt).toLocaleString("en-CA")} ·{" "}
                    {order.testMode ? "TEST" : "LIVE"}
                  </p>
                  <OrderSummary order={order} />
                  <p>
                    {order.customer.name} · {order.customer.email} ·{" "}
                    {order.customer.phone}
                  </p>
                  {order.address && (
                    <p>
                      {order.address.street}, {order.address.city},{" "}
                      {order.address.postal}
                    </p>
                  )}
                  <p>Special request: {order.customRequest || order.notes || "None — standard print, similar colours to photo"}</p>
                  <p>Owner email: {order.ownerNotification?.status || "Not queued (older order)"}</p>
                  {order.ownerNotification && ["Needs retry", "Pending", "Sending"].includes(order.ownerNotification.status) && <button type="button" className="text-link" onClick={async () => {
                    try { await api("retry-email", {id: order.id}, {Authorization: "Bearer " + key}); await load(); }
                    catch (e) {setError((e as Error).message);}
                  }}>Retry owner notification</button>}
                  <details><summary>Order email preview</summary><pre style={{whiteSpace:"pre-wrap", overflowWrap:"anywhere"}}>{order.notificationPreview}</pre></details>
                  <p>
                    Details: {order.detailsStatus} · Delivery:{" "}
                    {order.deliveryStatus}
                  </p>
                  <form
                    className="shop-admin-actions"
                    onSubmit={(event) => update(event, order)}
                  >
                    <label>
                      Action
                      <select name="action">
                        <option value="confirm-details">
                          Approve request at the displayed total
                        </option>
                        {order.fulfillment === "delivery" && (
                          <option value="approve-delivery">
                            Confirm address within 50 km delivery area
                          </option>
                        )}
                        <option value="confirm-payment">
                          Confirm e-Transfer received in bank
                        </option>
                        <option value="start-production">
                          Start production
                        </option>
                        <option value="ready">
                          Mark ready for pickup / delivery
                        </option>
                        <option value="complete">
                          Mark collected / delivered
                        </option>
                        <option value="cancel">Cancel unpaid order</option>
                      </select>
                    </label>
                    <label>
                      Verification / fulfillment note
                      <input
                        name="note"
                        required
                        maxLength={300}
                        placeholder="Bank receipt reference or confirmed details"
                      />
                    </label>
                    <button className="button" disabled={busy}>
                      Save verified update
                    </button>
                  </form>
                  <details>
                    <summary>Order history</summary>
                    {order.history.map((entry, i) => (
                      <p key={i}>
                        {entry.at} · {entry.action} {entry.note}
                      </p>
                    ))}
                  </details>
                </article>
              ))}</>}
              {tab === "website" && (
                <form className="quote-form shop-admin-settings" onSubmit={saveWebsite} key={JSON.stringify(content)}>
                  <div className="section-heading"><div><p className="eyebrow">PUBLIC WEBSITE SETTINGS</p><h2>Services and shop details</h2></div><p>These values are stored securely in Netlify and appear after the next page refresh.</p></div>
                  <div className="shop-admin-field-grid">
                    <label>FDM minimum job price (CAD)<input name="fdmStartingPrice" type="number" min="0" step="0.01" required defaultValue={(content.fdmStartingPriceCents / 100).toFixed(2)} /></label>
                    <label>Resin minimum job price (CAD)<input name="resinStartingPrice" type="number" min="0" step="0.01" required defaultValue={(content.resinStartingPriceCents / 100).toFixed(2)} /></label>
                    <label>CAD hourly rate (CAD)<input name="cadHourlyRate" type="number" min="0" step="0.01" required defaultValue={(content.cadHourlyRateCents / 100).toFixed(2)} /></label>
                    <label>Scanning hourly rate (CAD)<input name="scanningHourlyRate" type="number" min="0" step="0.01" required defaultValue={(content.scanningHourlyRateCents / 100).toFixed(2)} /></label>
                    <label>CNC minimum project price (CAD)<input name="cncStartingPrice" type="number" min="0" step="0.01" required defaultValue={(content.cncStartingPriceCents / 100).toFixed(2)} /></label>
                    <label>FDM maximum build volume<input name="fdmBuildVolume" maxLength={160} required defaultValue={content.fdmBuildVolume} /></label>
                    <label>Resin maximum build volume<input name="resinBuildVolume" maxLength={160} required defaultValue={content.resinBuildVolume} /></label>
                    <label>Production timing<input name="productionTime" maxLength={160} required defaultValue={content.productionTime} /></label>
                  </div>
                  <label>Shipping message<input name="shippingMessage" maxLength={160} required defaultValue={content.shippingMessage} /></label>
                  <button className="button" disabled={busy}>{busy ? "Saving…" : "Save website settings"}</button>
                  {saved && <p role="status">{saved}</p>}
                </form>
              )}
              {tab === "products" && (
                <section className="shop-admin-products">
                  <div className="section-heading"><div><p className="eyebrow">SHOPIFY IS THE CATALOG SOURCE</p><h2>Product names &amp; prices</h2></div><p>Change a product title or price in Shopify. The website refreshes both automatically, so checkout and product pages stay aligned.</p></div>
                  <a className="button" href="https://admin.shopify.com/store/aqk73w-k2/products" target="_blank" rel="noreferrer">Open Shopify products ↗</a>
                  <div className="shop-admin-product-grid">
                    {products.filter((product) => !isVariant(product)).map((product) => (
                      <article key={product.id}>
                        <ProductImage product={product} />
                        <div><h3>{nameFor(product.id, product.name)}</h3><p>Delivered: {money(priceFor(product.id, product.priceCents))} CAD</p><p>Pickup: {money(prices[fulfillmentSku(product.id, "pickup")] ?? Math.max(0, priceFor(product.id, product.priceCents) - 1000))} CAD</p>{Object.keys(prices).length > 0 && prices[fulfillmentSku(product.id, "pickup")] !== priceFor(product.id, product.priceCents) - 1000 && <p role="status">Check Shopify: pickup price must be $10 below the delivered price.</p>}<a className="text-link" href={`https://admin.shopify.com/store/aqk73w-k2/products?query=${encodeURIComponent(product.id)}`} target="_blank" rel="noreferrer">Edit in Shopify →</a></div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {tab === "lithophane" && (
                <LithophaneAdmin
                  adminKey={key}
                  initial={productContent["lithophane-table-lamp"]}
                  onSaved={(value) => setProductContent({ ...productContent, "lithophane-table-lamp": value })}
                />
              )}
            </>
          )}
          {error && <p role="alert">{error}</p>}
        </div>
      </section>
    </>
  );
}
