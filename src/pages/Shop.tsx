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
import { createShopifyCheckout, shopifyConfigured } from "../lib/shopify";

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
export function ShopNav() {
  const { items } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <nav className="shop-nav container" aria-label="Gift and decor navigation">
      <Link className="shop-nav-home" to="/shop">Gifts &amp; Décor</Link>
      <div className="shop-nav-collections">
        {collections.map((collection) => (
          <Link key={collection.id} to={`/shop/${collection.id}`}>
            {collection.shortName}
          </Link>
        ))}
      </div>
      <Link className="shop-cart-link" to="/shop/cart">
        <span aria-hidden="true">Cart</span>
        <span className="sr-only">Cart items:</span>
        <span className="shop-cart-count" key={itemCount}>{itemCount}</span>
      </Link>
    </nav>
  );
}
function ShopNotice() {
  return (
    <div className="shop-notice container">
      {settings.pricesAreProvisional
        ? "Collection preview — prices and production details are being reviewed. "
        : ""}
      Finished physical products. No digital files. $10 standard tracked
      shipping across Canada. Secure checkout by Shopify.
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
        setConfirmation(`${quantity} × ${orderProduct.name}`);
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
            aria-label={`${variantLabel} for ${product.name}`}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label} · {money(variant.priceCents)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Quantity
        <input
          aria-label={`Quantity for ${product.name}`}
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
  const alternate = product.images[1];
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
        <h3><Link to={`/shop/${product.id}`}>{product.name}</Link></h3>
        <p className="shop-price">
          {variantsFor(product).length ? "From " : ""}{money(product.priceCents)}{" "}
          <span>CAD</span>
        </p>
        {variantsFor(product).length ? (
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
  return (
    <div className="shop-benefits" aria-label="Shopping benefits">
      <div><BenefitIcon type="local"/><span><strong>Made in Edmonton</strong><small>Printed locally</small></span></div>
      <div><BenefitIcon type="made"/><span><strong>Made to order</strong><small>Prepared for you</small></span></div>
      <div><BenefitIcon type="checkout"/><span><strong>Secure checkout</strong><small>Powered by Shopify</small></span></div>
      <div><BenefitIcon type="shipping"/><span><strong>Tracked shipping</strong><small>$10 across Canada</small></span></div>
    </div>
  );
}

export function Shop() {
  const featuredProduct = catalogProduct("basilisk-dice-tower")!;
  const primaryCollections = collections.filter((collection) => collection.id !== "gifts-under-25");
  const under25 = collections.find((collection) => collection.id === "gifts-under-25")!;
  const featuredIds = ["octopus-wine-bottle-holder", "night-owl-wall-light", "basilisk-dice-tower", "mood-ghost", "skeleton-chameleon", "ghost-arch-wreath"];
  return (
    <>
      <ShopNav />
      <section className="shop-hero">
        <div className="container shop-hero-grid">
          <div>
            <p className="eyebrow">MADE IN EDMONTON / GIFTS WITH CHARACTER</p>
            <h1>
              Unique Gifts &amp; Décor,
              <br />
              <span>Made in Edmonton.</span>
            </h1>
            <p className="lead">
              Find the right gift by interest: collectible creatures, gaming accessories,
              home décor and playful seasonal pieces.
            </p>
            <a className="button" href="#collections">
              Shop by collection ↘
            </a>
            <p className="small">
              Physical products · Secure payment · Tracked Canadian shipping
            </p>
          </div>
          <Link to={`/shop/${featuredProduct.id}/`} className="shop-hero-photo">
            <ProductImage product={featuredProduct} large />
            <span>
              {featuredProduct.name} · {money(featuredProduct.priceCents)} CAD ↗
            </span>
          </Link>
        </div>
      </section>
      <ShopNotice />
      <section className="section shop-collections-section" id="collections">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SHOP BY INTEREST</p>
              <h2>See it. Choose it. Make it yours.</h2>
            </div>
            <p>Four clear collections make it easy to find the right piece.</p>
          </div>
          <div className="shop-collection-grid">
            {primaryCollections.map((collection, index) => {
              const cover = catalogProduct(collection.coverProduct)!;
              return (
                <Link className="shop-collection-card shop-reveal" style={{"--delay": `${index * 70}ms`} as React.CSSProperties} key={collection.id} to={`/shop/${collection.id}`}>
                  <ProductImage product={cover} />
                  <span className="shop-collection-overlay">
                    <small>{collection.products.length} products</small>
                    <strong>{collection.name}</strong>
                    <span>Explore collection ↗</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <section className="container shop-seasonal-banner">
        <div>
          <p className="eyebrow">SEASONAL COLLECTION</p>
          <h2>Halloween has arrived.</h2>
          <p>Playful ghosts, a graveyard wreath and small spooky details—printed locally for the season.</p>
          <Link className="button" to="/shop/halloween">Shop Halloween ↗</Link>
        </div>
        <Link to="/shop/halloween" aria-label="Explore Halloween decor">
          <ProductImage product={catalogProduct("ghost-arch-wreath")!} large />
        </Link>
      </section>
      <section className="section shop-under-section">
        <div className="container">
          <div className="section-heading">
            <div><p className="eyebrow">{under25.eyebrow}</p><h2>Small gifts. Easy choices.</h2></div>
            <Link className="text-link" to="/shop/gifts-under-25">See every gift under $25 →</Link>
          </div>
          <div className="shop-product-strip">
            {under25.products.slice(0, 4).map((id) => {
              const product = catalogProduct(id)!;
              return <Link key={id} to={`/shop/${id}`}><ProductImage product={product}/><span>{product.name}<strong>{money(product.priceCents)}</strong></span></Link>;
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
            <h3>Tracked shipping, clearly priced.</h3>
            <p>
              Standard tracked shipping is $10 across Canada and is itemized
              before you pay. Contact us first for colour changes or custom work.
            </p>
            <p>{settings.productionTime}.</p>
            <Link className="text-link" to="/products">
              Explore our studio-designed charging stand ↗
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export function ShopCollection({ id }: { id: string }) {
  const collection = collections.find((item) => item.id === id);
  const [sort, setSort] = useState("featured");
  if (!collection) return <NotFound />;
  const listed = collection.products.map((productId) => catalogProduct(productId)!).filter(Boolean);
  const sorted = [...listed].sort((a, b) =>
    sort === "price-low" ? a.priceCents - b.priceCents :
    sort === "price-high" ? b.priceCents - a.priceCents : 0,
  );
  const cover = catalogProduct(collection.coverProduct)!;
  return (
    <>
      <ShopNav />
      <nav className="container shop-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/shop">Gifts &amp; Décor</Link><span aria-hidden="true">/</span><span>{collection.name}</span>
      </nav>
      <section className="shop-collection-hero">
        <div className="container shop-hero-grid">
          <div>
            <p className="eyebrow">{collection.eyebrow}</p>
            <h1>{collection.heading}</h1>
            <p className="lead">{collection.description}</p>
            <a className="button" href="#products">View {collection.products.length} products ↘</a>
          </div>
          <div className="shop-collection-hero-image"><ProductImage product={cover} large/></div>
        </div>
      </section>
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
            {collections.filter((item) => item.id !== collection.id).slice(0, 4).map((item) => (
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
  const video = "video" in product ? product.video : undefined;
  const showingVideo = Boolean(video && index === product.images.length);
  const variants = variantsFor(product);
  const selectedVariant = catalogProduct(selectedVariantId || variants[0]?.id || product.id) || product;
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
          <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link> / <Link to="/shop/">Gifts & Décor</Link> / {product.name}</nav>
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
                    aria-label={`${product.name} product video`}
                  >
                    <source src={video} type="video/webm" />
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
                {video && (
                  <button
                    className="shop-video-thumb"
                    aria-label="View product video"
                    aria-pressed={showingVideo}
                    onClick={() => setIndex(product.images.length)}
                  >
                    <img src={product.images[0].thumb} alt="" loading="lazy" width="90" height="90" />
                    <span aria-hidden="true">▶</span>
                  </button>
                )}
              </div>
              <p className="small">
                Colours will be similar to the main photo; shades may vary.
                Props are not included.
              </p>
            </div>
            <div className="shop-detail-info">
              <p className="eyebrow">{product.category} / MADE IN EDMONTON</p>
              <h1>{product.name}</h1>
              <p className="lead">{product.description}</p>
              <p className="shop-price">
                {money(selectedVariant.priceCents)}{" "}
                <span>
                  CAD
                  {settings.pricesAreProvisional ? " · provisional price" : ""}
                </span>
              </p>
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
                {variants.length > 0 && !("variantLabel" in product && product.variantLabel === "Design") && <>
                  <dt>Size guide</dt>
                  <dd>
                    Choose by the widest diameter of your bottle. A typical 750 mL
                    Bordeaux-style bottle is close to 3 in wide. Burgundy-style
                    bottles are often wider, around 3.2 in or more. Bottle shapes
                    vary, so measure your bottle at its widest point before ordering.
                  </dd>
                </>}
                <dt>Colour & finish</dt>
                <dd>Similar to the main photo. Contact us before checkout to request a different colour.</dd>
                <dt>Timing & handoff</dt>
                <dd>
                  {settings.productionTime}. $10 standard tracked shipping
                  across Canada through Shopify checkout.
                </dd>
                <dt>Ordering & payment</dt>
                <dd>Made to order. Secure payment and shipping are handled through Shopify. Contact us before checkout for special requests.</dd>
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
                <Link key={p.id} className="text-link" to={`/shop/${p.id}/`}>{p.name} · {money(p.priceCents)} CAD →</Link>
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
  const { items, setQuantity } = useCart();
  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      (products.find((p) => p.id === item.id)?.priceCents || 0) * item.quantity,
    0,
  );
  return (
    <>
      <ShopNav />
      <PageIntro
        eyebrow="YOUR COLLECTION"
        title="Your cart."
        description="Review your physical prints. Pickup or delivery is selected at checkout."
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
                  <article className="shop-cart-line" key={item.id}>
                    <Link to={`/shop/${productRoute}`}>
                      <ProductImage product={product} />
                    </Link>
                    <div>
                      <h2>
                        <Link to={`/shop/${productRoute}`}>{product.name}</Link>
                      </h2>
                      <p>{money(product.priceCents)} CAD each</p>
                      <label>
                        Quantity
                        <CartQuantity id={item.id} name={product.name} quantity={item.quantity}/>
                      </label>
                      <button
                        className="text-link"
                        onClick={() => setQuantity(item.id, 0)}
                      >
                        Remove {product.name}
                      </button>
                    </div>
                    <strong>{money(product.priceCents * item.quantity)}</strong>
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
              <p>$10 standard tracked shipping across Canada. No GST charged.</p>
              <p className="small">
                {settings.pricesAreProvisional
                  ? "Prices are provisional pending production review. "
                  : ""}
                Need a different colour or another change? Contact us before checkout.
              </p>
              <Link className="button" to="/shop/checkout" onClick={() => trackShop("begin_checkout", items)}>
                Continue to checkout ↗
              </Link>
            </aside>
          )}
        </div>
      </section>
    </>
  );
}
export function Checkout() {
  const { items } = useCart();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      (products.find((p) => p.id === item.id)?.priceCents || 0) * item.quantity,
    0,
  );

  async function beginCheckout() {
    if (busy || !items.length) return;
    setBusy(true);
    setError("");
    trackShop("begin_checkout", items);
    try {
      const checkoutUrl = await createShopifyCheckout(items);
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      setError((checkoutError as Error).message);
      setBusy(false);
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
            <h2>Secure payment and tracked shipping.</h2>
            <p>
              Shopify collects your contact information, Canadian shipping
              address and payment securely. Standard tracked shipping is
              itemized at checkout.
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
              <p className="shop-total" key={item.id}>
                <span>
                  {products.find((p) => p.id === item.id)?.name} ×{" "}
                  {item.quantity}
                </span>
                <strong>
                  {money(
                    (products.find((p) => p.id === item.id)?.priceCents || 0) *
                      item.quantity,
                  )}
                </strong>
              </p>
            ))}
            <p className="shop-total">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </p>
            <p className="shop-total">
              <span>Standard tracked shipping</span>
              <span>{money(settings.shippingFeeCents)}</span>
            </p>
            <p className="shop-total">
              <strong>Estimated total CAD</strong>
              <strong>{money(subtotal + settings.shippingFeeCents)}</strong>
            </p>
            <p className="small">
              Final delivery options and total are confirmed in Shopify
              checkout. Production: 2–3 business days after payment is
              confirmed.
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
  const [key, setKey] = useState(""),
    [orders, setOrders] = useState<Order[]>([]),
    [error, setError] = useState(""),
    [logged, setLogged] = useState(false),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const data = await api("list", {}, { Authorization: "Bearer " + key });
      setOrders(data.orders);
      setLogged(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
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
        title="Orders."
        description="Verify e-Transfers in your banking account before confirming payment. Customer claims do not count as payment verification."
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
              <div className="button-row">
                <button className="button" onClick={load}>
                  Refresh orders
                </button>
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
              {!orders.length && <p>No orders yet.</p>}
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
              ))}
            </>
          )}
          {error && <p role="alert">{error}</p>}
        </div>
      </section>
    </>
  );
}
