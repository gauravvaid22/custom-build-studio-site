import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import products from "../../commerce/products.json";
import settings from "../../commerce/settings.json";
import { PageIntro } from "../components/Shared";
import { useCart, money } from "../components/Cart";
import { NotFound } from "./Studio";
import "../shop.css";

type Product = (typeof products)[number];
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
function useConfig() {
  const [config, setConfig] = useState<{
    ready: boolean;
    testMode: boolean;
    settings: typeof settings;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("config")
      .then(setConfig)
      .catch((e) => setError(e.message));
  }, []);
  return { config, error };
}
export function ShopNav() {
  const { items } = useCart();
  return (
    <nav className="shop-nav container" aria-label="Shop navigation">
      <Link to="/shop">Edmonton gift collection</Link>
      <Link to="/shop/cart">
        Cart ({items.reduce((sum, item) => sum + item.quantity, 0)})
      </Link>
    </nav>
  );
}
function ShopNotice() {
  const { config } = useConfig();
  return (
    <div className="shop-notice container">
      {config?.testMode
        ? "Preview only — test orders, no payments. "
        : settings.pricesAreProvisional
          ? "Collection preview — prices and production details are being reviewed. "
          : ""}
      Finished physical prints. No digital files. Free Edmonton pickup · $5
      local delivery (within 50 km).
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
      alt={`${product.name} — product photo ${index + 1}`}
      loading={large ? "eager" : "lazy"}
      decoding="async"
      width="900"
      height="900"
    />
  ) : (
    <div className="shop-image-pending">Product photography pending</div>
  );
}
function AddProduct({ product }: { product: Product }) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  return (
    <form
      className="shop-add"
      onSubmit={(e) => {
        e.preventDefault();
        add(product.id, quantity);
      }}
    >
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
    </form>
  );
}
export function Shop() {
  const [category, setCategory] = useState("All");
  const { notice } = useCart();
  const categories = [
    "All",
    "Creatures & collectibles",
    "Gaming & desk",
    "Home & planters",
    "Halloween",
  ];
  return (
    <>
      <ShopNav />
      <section className="shop-hero">
        <div className="container shop-hero-grid">
          <div>
            <p className="eyebrow">MADE IN EDMONTON / THE GIFT COLLECTION</p>
            <h1>
              Small prints.
              <br />
              <span>Big personality.</span>
            </h1>
            <p className="lead">
              For the game-night regular, the plant collector and the person who
              already has everything. Discover characterful pieces, printed
              locally.
            </p>
            <a className="button" href="#collection">
              Explore the collection ↘
            </a>
            <p className="small">
              Free local pickup · 2–3 business day production after confirmation
            </p>
          </div>
          <Link to="/shop/basilisk-dice-tower" className="shop-hero-photo">
            <ProductImage product={products[1]} large />
            <span>
              Basilisk Dice Tower · {money(products[1].priceCents)} CAD ↗
            </span>
          </Link>
        </div>
      </section>
      <ShopNotice />
      <section className="section" id="collection">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PRINTED TO ORDER</p>
              <h2>Find your kind of curious.</h2>
            </div>
            <p>
              Ten designs. Physical prints.
              <br />
              Made locally, with a personal touch.
            </p>
          </div>
          <div className="shop-filters" aria-label="Product categories">
            {categories.map((item) => (
              <button
                key={item}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="shop-cart-notice" role="status">
            {notice}
          </p>
          <div className="shop-grid">
            {products
              .filter((p) => category === "All" || p.category === category)
              .map((product) => (
                <article className="shop-card" key={product.id}>
                  <Link className="shop-card-image" to={`/shop/${product.id}`}>
                    <ProductImage product={product} />
                    <span className="shop-badge">{product.category}</span>
                  </Link>
                  <div className="shop-card-body">
                    <p className="eyebrow">PHYSICAL 3D PRINT</p>
                    <h3>
                      <Link to={`/shop/${product.id}`}>{product.name}</Link>
                    </h3>
                    <p>{product.description}</p>
                    <p className="shop-price">
                      {money(product.priceCents)}{" "}
                      <span>
                        CAD
                        {settings.pricesAreProvisional ? " · provisional" : ""}
                      </span>
                    </p>
                    <AddProduct product={product} />
                  </div>
                </article>
              ))}
          </div>
          <div className="shop-reference-note">
            Printed in colours similar to the main photo. Want a different colour?
            Request it at checkout. Props are not included.
          </div>
        </div>
      </section>
      <section className="shop-how section">
        <div className="container detail-columns">
          <div>
            <p className="eyebrow">LOCAL, FROM ORDER TO HANDOFF</p>
            <h2>A little more personal.</h2>
            <p>
              Choose your print. Place your order. Send your e-Transfer.
              Want a different colour or another change? We’ll approve your
              request before you pay.
            </p>
          </div>
          <div>
            <h3>Pick it up. Or let us bring it.</h3>
            <p>
              Free pickup in Edmonton by appointment. Local delivery is $5
              within 50 km of the studio, subject to address review. Exact
              pickup details are shared privately.
            </p>
            <p>
              {settings.productionTime}. We arrange the pickup or delivery time
              with you.
            </p>
            <Link className="text-link" to="/products">
              Explore our studio-designed charging stand ↗
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
export function ShopProduct() {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  const [index, setIndex] = useState(0);
  const { notice } = useCart();
  useEffect(() => setIndex(0), [id]);
  if (!product) return <NotFound />;
  return (
    <>
      <ShopNav />
      <ShopNotice />
      <section className="section">
        <div className="container">
          <Link className="breadcrumb" to="/shop">
            ← All printed gifts
          </Link>
          <div className="shop-detail">
            <div>
              <div className="shop-main-image">
                <ProductImage product={product} index={index} large />
              </div>
              <div className="shop-thumbs" aria-label="Product photographs">
                {product.images.map((image, i) => (
                  <button
                    key={image.src}
                    aria-label={`View product photo ${i + 1}`}
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
                {money(product.priceCents)}{" "}
                <span>
                  CAD
                  {settings.pricesAreProvisional ? " · provisional price" : ""}
                </span>
              </p>
              <AddProduct product={product} />
              <p role="status">{notice}</p>
              <Link className="text-link" to="/shop/cart">
                View cart & checkout ↗
              </Link>
              <dl className="shop-specs">
                <dt>What you receive</dt>
                <dd>{product.included} No STL or digital download.</dd>
                {product.dimensions.startsWith("Source model:") && <>
                  <dt>Approximate size</dt>
                  <dd>{product.dimensions.replace("Source model: approximately", "Approximately").replace("Final printed dimensions require production review.", "Finished size may vary slightly.")}</dd>
                </>}
                <dt>Colour & finish</dt>
                <dd>Similar to the main photo. Request a different colour at checkout.</dd>
                <dt>Timing & handoff</dt>
                <dd>
                  {settings.productionTime}. Free Edmonton pickup or $5 delivery
                  within 50 km after address review.
                </dd>
              </dl>
              <p className="small">
                Printed by Custom Build Studio in Edmonton. Handle small moving
                or separate parts with care.
              </p>
            </div>
          </div>
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
                return (
                  <article className="shop-cart-line" key={item.id}>
                    <Link to={`/shop/${item.id}`}>
                      <ProductImage product={product} />
                    </Link>
                    <div>
                      <h2>
                        <Link to={`/shop/${item.id}`}>{product.name}</Link>
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
              <p>Free pickup or $5 local delivery. No GST charged.</p>
              <p className="small">
                {settings.pricesAreProvisional
                  ? "Prices are provisional pending production review. "
                  : ""}
                Standard print? Pay after ordering. Custom request? Wait for approval.
              </p>
              <Link className="button" to="/shop/checkout">
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
  const { items, clear } = useCart();
  const { config, error: configError } = useConfig();
  const [fulfillment, setFulfillment] = useState("pickup"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [requestMode, setRequestMode] = useState("standard");
  const navigate = useNavigate();
  const key = useRef("");
  const inFlight = useRef(false);
  const lastPayload = useRef("");
  useEffect(() => {
    try {
      key.current =
        sessionStorage.getItem("cbs-checkout-key") || crypto.randomUUID();
      sessionStorage.setItem("cbs-checkout-key", key.current);
    } catch {
      key.current = crypto.randomUUID();
    }
  }, []);
  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      (products.find((p) => p.id === item.id)?.priceCents || 0) * item.quantity,
    0,
  );
  const fee = fulfillment === "delivery" ? settings.deliveryFeeCents : settings.pickupFeeCents,
    tax = Math.round((subtotal + fee) * settings.taxBasisPoints / 10000),
    total = subtotal + fee + tax;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = new FormData(event.currentTarget);
    const body = {
      ...Object.fromEntries(form),
      items,
      fulfillment,
      requestMode,
      accepted: form.get("accepted") === "on",
      deliveryReview: form.get("deliveryReview") === "on",
      expectedTotalCents: total,
    };
    const serialized = JSON.stringify(body);
    // Keep retries identical; deliberate edits receive a new idempotency key.
    if (lastPayload.current && lastPayload.current !== serialized)
      key.current = crypto.randomUUID();
    lastPayload.current = serialized;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api("create", body, {
        "Idempotency-Key": key.current,
      });
      try {
        sessionStorage.setItem("cbs-order-key", result.lookupKey);
        sessionStorage.removeItem("cbs-checkout-key");
      } catch {}
      clear();
      navigate("/shop/order#" + encodeURIComponent(result.lookupKey));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <ShopNav />
      <PageIntro
        eyebrow="PRINTED IN EDMONTON"
        title="Make it yours."
        description="A few details. One order. Pay by Interac e-Transfer."
      />
      <section className="section">
        <div className="container shop-cart-layout">
          <form className="quote-form shop-checkout" onSubmit={submit}>
            <OrderSteps review={requestMode === "custom" || fulfillment === "delivery"} />
            <fieldset>
              <legend>Your print</legend>
              <div className="shop-choices">
                <label className="shop-choice">
                  <input type="radio" name="requestMode" value="standard" checked={requestMode === "standard"} onChange={() => setRequestMode("standard")} />
                  <span><strong>As pictured</strong><small>Similar colours. Ready to order.</small></span>
                </label>
                <label className="shop-choice">
                  <input type="radio" name="requestMode" value="custom" checked={requestMode === "custom"} onChange={() => setRequestMode("custom")} />
                  <span><strong>Request a change</strong><small>Different colour or special request.</small></span>
                </label>
              </div>
              {requestMode === "custom" && <label>What would you like changed?
                <textarea name="customRequest" required maxLength={1000} rows={3} placeholder="Example: the baby dragon in blue. For multiple items, name each print." />
                <small>Wait for approval before paying. We’ll confirm availability and any price difference with you.</small>
              </label>}
            </fieldset>
            <h2>Your details</h2>
            {config?.testMode && (
              <p className="shop-test-banner">
                TEST PREVIEW. Use fictional details. Do not send money.
              </p>
            )}
            <div className="form-grid">
              <label>
                Name
                <input
                  name="name"
                  required
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </label>
              <label>
                Phone
                <input
                  name="phone"
                  type="tel"
                  required
                  maxLength={30}
                  autoComplete="tel"
                />
              </label>
            </div>
            <fieldset>
              <legend>Pickup or delivery</legend>
              <label className="shop-radio">
                <input
                  type="radio"
                  name="fulfillment"
                  value="pickup"
                  checked={fulfillment === "pickup"}
                  onChange={() => setFulfillment("pickup")}
                />
                Free Edmonton pickup
              </label>
              <label className="shop-radio">
                <input
                  type="radio"
                  name="fulfillment"
                  value="delivery"
                  checked={fulfillment === "delivery"}
                  onChange={() => setFulfillment("delivery")}
                />
                $5 local delivery · within 50 km
              </label>
            </fieldset>
            {fulfillment === "pickup" ? (
              <p className="small">We’ll arrange pickup and share the address privately when your order is ready.</p>
            ) : (
              <>
                <p>{settings.deliveryInstructions}</p>
                <label>
                  Street address
                  <input
                    name="street"
                    required
                    maxLength={200}
                    autoComplete="street-address"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    City or community
                    <input
                      name="city"
                      required
                      maxLength={80}
                      autoComplete="address-level2"
                    />
                  </label>
                  <label>
                    Postal code
                    <input
                      name="postal"
                      required
                      maxLength={7}
                      pattern="[Tt][0-9][A-Za-z] ?[0-9][A-Za-z][0-9]"
                      autoComplete="postal-code"
                    />
                  </label>
                </div>
                <label className="shop-radio">
                  <input name="deliveryReview" type="checkbox" required />I
                  understand delivery eligibility must be confirmed before
                  payment.
                </label>
              </>
            )}
            <div hidden>
              <label>
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <label className="shop-radio">
              <input name="accepted" type="checkbox" required />
              {requestMode === "custom" || fulfillment === "delivery"
                ? "I’ll wait for approval before sending my e-Transfer."
                : "I’ve checked my items and will pay by e-Transfer after placing my order."}
            </label>
            <p className="small">
              Your contact and delivery details are stored to manage your order.{" "}
              <Link to="/privacy">Privacy information</Link>. Save your order
              confirmation; an automatic email is not currently sent.
            </p>
            {(error || configError) && (
              <p role="alert">{error || configError}</p>
            )}
            {config && !config.ready && (
              <p role="status">
                The collection is being prepared. Live checkout is not open yet.
              </p>
            )}
            <button
              className="button"
              disabled={busy || !items.length || !config?.ready}
            >
              {busy
                ? "Saving order…"
                : config?.testMode
                  ? "Place test order"
                  : requestMode === "custom" || fulfillment === "delivery" ? "Send order for approval" : "Place order & view payment details"}
            </button>
            {!items.length && (
              <Link to="/shop">Add products before checking out.</Link>
            )}
          </form>
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
              <span>
                {fulfillment === "pickup" ? "Pickup" : "Local delivery"}
              </span>
              <span>{money(fee)}</span>
            </p>
            <p className="shop-total">
              <span>{settings.taxLabel}</span>
              <span>{money(tax)}</span>
            </p>
            <p className="shop-total">
              <strong>Total CAD</strong>
              <strong>{money(total)}</strong>
            </p>
            <p>{requestMode === "custom" ? "Your request will be reviewed before payment." : fulfillment === "delivery" ? "We’ll check your delivery address before payment." : "Your e-Transfer details appear immediately after ordering."}</p>
            <p className="small">Production: 2–3 business days after payment is verified.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
function OrderSteps({review = false}: {review?: boolean}) {
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
