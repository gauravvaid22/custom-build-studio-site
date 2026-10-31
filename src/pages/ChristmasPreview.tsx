import {CUSTOMER_3D_ENABLED} from '../lib/storefrontFeatures';
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import draftProducts from "../../commerce/christmas-preview-products.json";
import allProducts, { CatalogProduct } from "../data/catalog";
import { money } from "../components/Cart";
import { ShopProduct } from "./Shop";
import Christmas3DViewer from "../components/Managed3DViewer";
import { useShopifyCatalog } from "../components/ShopifyCatalog";
import { useCatalogAvailability } from "../lib/catalogAvailability";
import "../christmas.css";

const draftCatalog = draftProducts as CatalogProduct[];
const CHRISTMAS_GRACE_IDS = new Set(["holy-family-embrace", "heavenly-trio", "guiding-star-tree-topper", "evergreen-wreath", "luminous-tree", "village-lights", "christmas-trinket-trays", "stocking-tray", "snowflake-tray", "christmas-tree-tray"]);

// Products that have a real, multi-colored 3D WebGL mesh generated from the studio's .3mf/.stl files
const REAL_3D_MODELS = new Set([
  "endless-swirling-tree",
  "christmas-angel",
  "bright-nativity-table-lamp",
  "village-on-the-moon-table-lamp",
  "santa-s-bonfire-table-lamp",
  "hooked-santa",
  "snow-in-jumper",
  "zou-christmas-baby-axolotl",
  "santa-s-snack-hat-bowl",
  "christmas-gnome-set",
  "christmas-tree-tray",
  "evergreen-wreath",
  "guiding-star-tree-topper",
  "heavenly-trio",
  "holy-family-embrace",
  "luminous-tree",
  "luminous-tree-stars",
  "luminous-tree-spiral",
  "snowflake-tray",
  "stocking-tray",
  "village-lights",
]);

function resolve3DModelId(productId: string, variantId?: string | null): string | null {
  if (!CUSTOMER_3D_ENABLED) return null;
  if (productId === "christmas-character-figurines") {
    const target = variantId && REAL_3D_MODELS.has(variantId) ? variantId : "hooked-santa";
    return target;
  }
  if (productId === "luminous-tree" && variantId && REAL_3D_MODELS.has(variantId)) {
    return variantId;
  }
  if (productId === "christmas-trinket-trays") {
    const target = variantId && REAL_3D_MODELS.has(variantId) ? variantId : "christmas-tree-tray";
    return target;
  }
  if (REAL_3D_MODELS.has(productId)) return productId;
  return null;
}

const PRODUCT_META: Record<string, { heightLabel: string; tag: string; summary: string }> = {
  "endless-swirling-tree": {
    heightLabel: "Approx. 19 cm tall",
    tag: "KINETIC SPIRAL",
    summary: "Two nested helical trees with a gold star that glide smoothly through each other.",
  },
  "christmas-angel": {
    heightLabel: "Approx. 21 cm tall",
    tag: "ILLUMINATED NATIVITY",
    summary: "Graceful angel wings framing a multi-layered nativity silhouette, with warm LED lighting included.",
  },
  "meowy-christmas-tree-topper": {
    heightLabel: "Approx. 27 cm tall",
    tag: "PLAYFUL ACCENT",
    summary: "A playful cat reaching for a golden star to crown your Christmas tree with personality.",
  },
  "christmas-character-figurines": {
    heightLabel: "Approx. 8–10 cm",
    tag: "CHARACTER TRIO",
    summary: "Choose Knit-Look Santa, Cosy Jumper Snowman, or Christmas Baby Axolotl—each crafted individually.",
  },
  "christmas-gnome-set": {
    heightLabel: "Set of 5 · up to 15 cm",
    tag: "COLLECTIBLE SET",
    summary: "Five whimsical holiday gnomes with tall textured hats and braided beards to arrange together.",
  },
  "bright-nativity-table-lamp": {
    heightLabel: "Approx. 19 cm tall",
    tag: "WARM ILLUMINATION",
    summary: "A golden Bethlehem star shining above a sheltered nativity scene, with warm LED lighting included.",
  },
  "village-on-the-moon-table-lamp": {
    heightLabel: "Approx. 14 cm tall",
    tag: "CRESCENT MOON LAMP",
    summary: "A miniature winter village nestled inside a sculpted crescent moon, with warm LED lighting included.",
  },
  "santa-s-bonfire-table-lamp": {
    heightLabel: "Approx. 11 cm tall",
    tag: "CAMPFIRE NIGHT LIGHT",
    summary: "Santa and his reindeer resting beside a glowing campfire, with warm LED lighting included.",
  },
  "santa-s-snack-hat-bowl": {
    heightLabel: "Approx. 8.7 cm tall",
    tag: "FESTIVE SERVING",
    summary: "An upturned Santa hat catch-all dish for individually wrapped holiday sweets or small treasures.",
  },
  "christmas-character-ornaments": {
    heightLabel: "8 character designs · ~5 cm",
    tag: "HANDCRAFTED ORNAMENTS",
    summary: "Sculpted holiday baubles including Santa, sleepy pets, reindeer, snowman and nutcracker—sold individually.",
  },
  "holy-family-embrace": {
    heightLabel: "Approx. 15 cm tall",
    tag: "CHRISTMAS GRACE",
    summary: "Smooth, flowing white-and-gold sculpture depicting Mary, Joseph and baby Jesus for mantel or shelf.",
  },
  "heavenly-trio": {
    heightLabel: "Set of 3 · ~20 cm",
    tag: "CHRISTMAS GRACE",
    summary: "Three graceful angel figurines—Halo, Heart and Star—finished in a soft white-and-gold palette.",
  },
  "guiding-star-tree-topper": {
    heightLabel: "Approx. 12 cm star",
    tag: "CHRISTMAS GRACE",
    summary: "An open geometric Bethlehem star with a sculptural spiral tree-top base in white and gold.",
  },
  "evergreen-wreath": {
    heightLabel: "Approx. 19.5 × 22.3 cm",
    tag: "CHRISTMAS GRACE",
    summary: "Sculpted winter woodland wreath in white and gold with a festive bow for indoor walls or sheltered doors.",
  },
  "luminous-tree": {
    heightLabel: "3 designs · ~12 cm",
    tag: "CHRISTMAS GRACE",
    summary: "Choose Starry Tiers, Lace Tiers or Spiral Stars—each white-and-gold tree includes battery LED lighting.",
  },
  "village-lights": {
    heightLabel: "Set of 2 · ~9 & 14 cm",
    tag: "CHRISTMAS GRACE",
    summary: "Two snowy miniature cottages with warm LED lighting included for a cozy holiday village glow.",
  },
  "christmas-trinket-trays": {
    heightLabel: "Tree, snowflake, stocking",
    tag: "HOLIDAY DISHES",
    summary: "Festive white-and-gold catch-all trays shaped as an Evergreen Tree, Winter Snowflake, or Holiday Stocking.",
  },
};

function FloatingTiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 6, y: -y * 6 });
  }

  function handlePointerLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      ref={cardRef}
      className={`xmas-tilt-card ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        transform: `perspective(900px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
      }}
    >
      {children}
    </div>
  );
}

function ProductDetailWith3D({ product, publicMode = false }: { product: CatalogProduct; publicMode?: boolean }) {
  const [params] = useSearchParams();
  const variantParam = params.get("variant");
  const model3dId = resolve3DModelId(product.id, variantParam);
  const { priceFor, nameFor } = useShopifyCatalog();
  const sourceCatalog = publicMode ? allProducts : draftCatalog;

  const activeFigurine = useMemo(() => {
    if (product.id !== "christmas-character-figurines") return null;
    const figurines = sourceCatalog.filter(p => p.listingGroup === "christmas-character-figurines");
    return figurines.find(f => f.id === variantParam) || figurines[0];
  }, [product.id, variantParam, sourceCatalog]);

  const activeTray = useMemo(() => {
    if (product.id !== "christmas-trinket-trays") return null;
    const trays = sourceCatalog.filter(p => p.listingGroup === "christmas-trinket-trays");
    return trays.find(t => t.id === variantParam) || trays[0];
  }, [product.id, variantParam, sourceCatalog]);

  const currentItem = activeFigurine || activeTray || product;
  const listings = sourceCatalog.filter(p => !p.listingGroup && (p.category === "Christmas décor" || CHRISTMAS_GRACE_IDS.has(p.id) || p.id === "endless-swirling-tree"));
  const itemHref = (id: string) => publicMode ? `/shop/${id}` : `/preview/christmas/${id}?analytics_test=1`;

  return (
    <div className="xmas-detail-wrapper">
      <div className="xmas-detail-subnav">
        <div className="container xmas-detail-subnav-inner">
          <Link className="xmas-subnav-back" to={publicMode ? "/shop/christmas-special" : "/preview/christmas?analytics_test=1"}>
            ← Back to Christmas Collection
          </Link>
          <div className="xmas-subnav-switcher" aria-label="Browse other Christmas products">
            <span>Christmas collection:</span>
            <div className="xmas-subnav-thumbs">
              {listings.map(item => (
                <Link
                  key={item.id}
                  to={itemHref(item.id)}
                  className={item.id === product.id ? "is-active" : ""}
                  title={`${nameFor(item.id, item.name)} — ${money(priceFor(item.id, item.priceCents))} CAD`}
                >
                  <img src={item.images[0].thumb} alt={item.name} width="34" height="34" />
                </Link>
              ))}
            </div>
            {!publicMode && (
              <Link to="/shop/admin" className="xmas-admin-subnav-link" title="Open Studio Admin to edit prices and options">
                ⚙ Admin ↗
              </Link>
            )}
          </div>
        </div>
      </div>

      {model3dId && (
        <section className="xmas-detail-3d-section" aria-label="Interactive 3D Model Inspector">
          <div className="container">
            <div className="xmas-detail-3d-card">
              <div className="xmas-detail-3d-header">
                <div>
                  <span className="xmas-stage-kicker">Interactive 3D Studio Stage</span>
                  <h2>{nameFor(currentItem.id, currentItem.name)}</h2>
                  <p className="xmas-detail-3d-hint">
                    Touch or drag to rotate · Scroll to zoom · Studio lighting enabled
                  </p>
                </div>
                <div className="xmas-detail-3d-badges">
                  <span className="xmas-stage-badge">Crafted in Edmonton</span>
                  <span className="xmas-stage-badge">Real 3D Mesh</span>
                </div>
              </div>

              <div className="xmas-detail-3d-canvas-wrap">
                <Christmas3DViewer
                  modelId={model3dId}
                  poster={currentItem.images[0]?.src}
                  productName={currentItem.name}
                  warmLighting={true}
                  compact={false}
                />
              </div>

              {product.id === "christmas-character-figurines" && (
                <div className="xmas-detail-model-picker" role="tablist" aria-label="Switch figurine 3D model">
                  <span className="xmas-picker-label">Inspect another character in 3D:</span>
                  <div className="xmas-picker-buttons">
                    {[
                      { id: "hooked-santa", label: "Hooked Santa" },
                      { id: "snow-in-jumper", label: "Snow in Jumper" },
                      { id: "zou-christmas-baby-axolotl", label: "Baby Axolotl" },
                    ].map(btn => (
                      <Link
                        key={btn.id}
                        to={`${itemHref("christmas-character-figurines")}${publicMode ? "?" : "&"}variant=${btn.id}`}
                        className={`xmas-picker-chip ${currentItem.id === btn.id ? "is-active" : ""}`}
                      >
                        {btn.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {product.id === "christmas-trinket-trays" && (
                <div className="xmas-detail-model-picker" role="tablist" aria-label="Switch trinket tray 3D model">
                  <span className="xmas-picker-label">Inspect another tray shape in 3D:</span>
                  <div className="xmas-picker-buttons">
                    {[
                      { id: "christmas-tree-tray", label: "Tree Tray" },
                      { id: "snowflake-tray", label: "Snowflake Tray" },
                      { id: "stocking-tray", label: "Stocking Tray" },
                    ].map(btn => (
                      <Link
                        key={btn.id}
                        to={`${itemHref("christmas-trinket-trays")}${publicMode ? "?" : "&"}variant=${btn.id}`}
                        className={`xmas-picker-chip ${currentItem.id === btn.id ? "is-active" : ""}`}
                      >
                        {btn.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="xmas-detail-lower">
        <ShopProduct previewCatalog={publicMode ? undefined : draftCatalog} previewId={product.id} />
      </div>
    </div>
  );
}

export default function ChristmasPreview({ publicMode = false }: { publicMode?: boolean }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState("Everything");
  const [activeHeroId, setActiveHeroId] = useState("endless-swirling-tree");
  const [heroViewTab, setHeroViewTab] = useState<"3d" | "video" | "photo">(CUSTOMER_3D_ENABLED ? "3d" : "photo");
  const [activeOrnamentId, setActiveOrnamentId] = useState("santa-claus-christmas-ornament");
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [tappedVideoId, setTappedVideoId] = useState<string | null>(null);

  const { priceFor, nameFor } = useShopifyCatalog();
  const archived = useCatalogAvailability();

  // If a product ID is requested in public mode, redirect cleanly to canonical /shop/:id
  if (id && publicMode) {
    return <Navigate replace to={`/shop/${id}`} />;
  }

  // Filter listings based on active catalog
  const catalog = useMemo(() => {
    if (!publicMode) return draftCatalog;
    return allProducts.filter(p => !archived.includes(p.id));
  }, [publicMode, archived]);

  const listings = useMemo(() => {
    const rootItems = catalog.filter(p => !p.listingGroup && (p.category === "Christmas décor" || CHRISTMAS_GRACE_IDS.has(p.id) || p.id === "endless-swirling-tree"));
    if (rootItems.length) return rootItems;
    return draftCatalog.filter(p => !p.listingGroup);
  }, [catalog]);

  const ornaments = useMemo(() => {
    const liveOrnaments = catalog.filter(p => p.listingGroup === "christmas-character-ornaments");
    return liveOrnaments.length ? liveOrnaments : draftCatalog.filter(p => p.listingGroup === "christmas-character-ornaments");
  }, [catalog]);

  const get = (targetId: string): CatalogProduct => {
    return catalog.find(p => p.id === targetId) || draftCatalog.find(p => p.id === targetId) || draftCatalog[0];
  };

  const itemHref = (targetId: string, variant?: string) => {
    if (publicMode) {
      return `/shop/${targetId}${variant ? `?variant=${variant}` : ""}`;
    }
    return `/preview/christmas/${targetId}?analytics_test=1${variant ? `&variant=${variant}` : ""}`;
  };

  const baseRoute = publicMode ? "/shop/christmas-special" : "/preview/christmas?analytics_test=1";

  useEffect(() => {
    document.title = id
      ? `${nameFor(id, get(id)?.name || "Christmas")} | Custom Build Studio`
      : "The Christmas Collection · Crafted in Edmonton | Custom Build Studio";
  }, [id, nameFor]);

  const price = (p: CatalogProduct) => {
    const rawPrice = priceFor(p.id, p.priceCents);
    const hasRange = p.variants?.some(v => priceFor(v.id, v.priceCents) !== rawPrice);
    return `${hasRange ? "From " : ""}${money(rawPrice)}`;
  };

  if (id) {
    if (id === "christmas-grace-decorations") return <Navigate replace to={`${baseRoute}?collection=christmas-grace#christmas-pieces`} />;
    if (id === "christmas-tree-tray" || id === "snowflake-tray" || id === "stocking-tray") {
      return <Navigate replace to={`${itemHref("christmas-trinket-trays", id)}`} />;
    }
    const targetProduct = get(id);
    if (targetProduct) return <ProductDetailWith3D product={targetProduct} publicMode={publicMode} />;
    return (
      <div className="xmas-detail-preview">
        <ShopProduct previewCatalog={publicMode ? undefined : draftCatalog} previewId={id} />
      </div>
    );
  }

  const heroShowcases = [
    {
      id: "endless-swirling-tree",
      tag: "KINETIC TWO-PART SPIRAL",
      headline: "Slide & twist the nested spiral tree.",
      blurb: "Two nested helical trees crafted in emerald green and metallic gold that glide smoothly through each other.",
    },
    {
      id: "christmas-angel",
      tag: "ILLUMINATED NATIVITY",
      headline: "A warm golden halo over the manger.",
      blurb: "Porcelain-look angel wings framing a multi-layered nativity silhouette, with warm LED lighting included.",
    },
    {
      id: "village-on-the-moon-table-lamp",
      tag: "CRESCENT MOON LAMP",
      headline: "A winter village cradled in the moon.",
      blurb: "Tiny cottages and alpine trees nestled inside a sculpted lunar crescent, with warm LED lighting included.",
    },
    {
      id: "santa-s-bonfire-table-lamp",
      tag: "CAMPFIRE NIGHT LIGHT",
      headline: "Santa taking a warm rest by the fire.",
      blurb: "Santa and his reindeer resting beside a glowing campfire, with warm LED lighting included.",
    },
    {
      id: "bright-nativity-table-lamp",
      tag: "LAYERED NATIVITY",
      headline: "Bethlehem stars in warm amber silhouette.",
      blurb: "Architectural lantern with layered nativity silhouettes and warm LED lighting included.",
    },
  ];

  const activeHeroMeta = heroShowcases.find(h => h.id === activeHeroId) || heroShowcases[0];
  const activeHeroProduct = get(activeHeroMeta.id);
  const activeHeroLink = itemHref(activeHeroMeta.id);
  const activeOrnament = ornaments.find(o => o.id === activeOrnamentId) || ornaments[0];

  const filteredListings = listings.filter(p => {
    if (filter === "Everything") return true;
    if (filter === "Christmas Grace") return CHRISTMAS_GRACE_IDS.has(p.id);
    if (filter === "Festive lights") {
      return ["christmas-angel", "bright-nativity-table-lamp", "village-on-the-moon-table-lamp", "santa-s-bonfire-table-lamp", "luminous-tree", "village-lights"].includes(p.id);
    }
    if (filter === "Tree & table") {
      return ["endless-swirling-tree", "meowy-christmas-tree-topper", "guiding-star-tree-topper", "evergreen-wreath", "christmas-character-ornaments", "christmas-trinket-trays", "santa-s-snack-hat-bowl"].includes(p.id);
    }
    if (filter === "Under $30") {
      return priceFor(p.id, p.priceCents) <= 3000;
    }
    return true;
  });

  return (
    <div className="xmas-root xmas-page" id="top">
      {/* SNOWFLAKE AMBIENT CANVAS */}
      <div className="xmas-snow-ambient" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => (
          <span
            key={i}
            className="xmas-snowflake"
            style={{
              "--flake-x": `${(i * 4.16).toFixed(2)}%`,
              "--flake-delay": `${(i * 0.45).toFixed(2)}s`,
              "--flake-duration": `${8 + (i % 6) * 1.5}s`,
              "--flake-size": `${4 + (i % 4) * 2}px`,
              "--flake-drift": `${(i % 2 === 0 ? 1 : -1) * (15 + (i % 5) * 6)}px`,
            } as CSSProperties}
          />
        ))}
      </div>

      {/* HERO SECTION */}
      <section className="xmas-hero">
        <div className="container xmas-hero-grid">
          <div className="xmas-hero-copy">
            <div className="xmas-hero-badge-row">
              <span className="xmas-badge xmas-badge-gold">✦ Christmas 2026 Collection</span>
              <span className="xmas-badge xmas-badge-pine">Crafted in Edmonton, Canada</span>
            </div>

            <h1 className="xmas-title">
              Heirloom holiday warmth,<br />
              <em>crafted in Canada.</em>
            </h1>

            <p className="xmas-lead">
              Illuminated table lamps, kinetic spiral trees, intricate nativity scenes, festive character figurines and trinket trays. Crafted in small batches at our Edmonton studio with precision detail and free tracked Canadian shipping.
            </p>

            <div className="xmas-hero-selector" aria-label="Product preview selector">
              <p className="xmas-selector-heading">Choose a piece to explore its photos and video:</p>
              <div className="xmas-selector-pills">
                {heroShowcases.map(item => {
                  const p = get(item.id);
                  const active = item.id === activeHeroId;
                  return (
                    <button
                      type="button"
                      role="tab"
                      key={item.id}
                      aria-selected={active}
                      className={`xmas-hero-pill ${active ? "is-active" : ""}`}
                      onClick={() => setActiveHeroId(item.id)}
                    >
                      <img src={p.images[0].thumb} alt="" width="42" height="42" />
                      <div>
                        <strong>{nameFor(p.id, p.name)}</strong>
                        <small>{price(p)} CAD · Delivered</small>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="xmas-actions">
              <div className="xmas-action-row">
                <Link className="xmas-button" to={activeHeroLink}>
                  View {nameFor(activeHeroProduct.id, activeHeroProduct.name)} Details &amp; Photos <span>↗</span>
                </Link>
                <a className="xmas-button xmas-button-secondary" href="#christmas-pieces">
                  Browse All {listings.length} Collections <span>↓</span>
                </a>
              </div>
            </div>

            <div className="xmas-hero-trust-pills">
              <span><strong>✓ Free Tracked Shipping</strong> across Canada</span>
              <span><strong>✓ Local Pickup Bonus:</strong> 10% promo code for your next order</span>
              <span><strong>✓ Small-Batch Studio Detail:</strong> Hand-finished in Edmonton</span>
            </div>
          </div>

          <div className="xmas-hero-stage">
            <FloatingTiltCard className="xmas-hero-stage-card">
              <div className="xmas-stage-card-header">
                <div>
                  <span className="xmas-stage-kicker">{activeHeroMeta.tag}</span>
                  <h3>{nameFor(activeHeroProduct.id, activeHeroProduct.name)}</h3>
                </div>
                <div className="xmas-stage-mode-switcher" role="tablist" aria-label="Product photos and video">
                  {CUSTOMER_3D_ENABLED && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={heroViewTab === "3d"}
                    className={heroViewTab === "3d" ? "is-active" : ""}
                    onClick={() => setHeroViewTab("3d")}
                  >
                    🧊 Interactive 3D
                  </button>
                  )}
                  {activeHeroProduct.video && (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={heroViewTab === "video"}
                      className={heroViewTab === "video" ? "is-active" : ""}
                      onClick={() => setHeroViewTab("video")}
                    >
                      ▶ Video
                    </button>
                  )}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={heroViewTab === "photo"}
                    className={heroViewTab === "photo" ? "is-active" : ""}
                    onClick={() => setHeroViewTab("photo")}
                  >
                    📷 Studio Photo
                  </button>
                </div>
              </div>

              <div className="xmas-stage-card-body">
                {heroViewTab === "3d" ? (
                  <Christmas3DViewer
                    key={activeHeroMeta.id}
                    modelId={activeHeroMeta.id}
                    poster={activeHeroProduct.images[0].src}
                    productName={nameFor(activeHeroProduct.id, activeHeroProduct.name)}
                    warmLighting={true}
                    compact={true}
                  />
                ) : heroViewTab === "video" && activeHeroProduct.video ? (
                  <div className="xmas-stage-media-box">
                    <video
                      key={activeHeroProduct.video}
                      src={activeHeroProduct.video}
                      poster={activeHeroProduct.images[0].src}
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls
                    />
                  </div>
                ) : (
                  <div className="xmas-stage-media-box">
                    <img
                      src={activeHeroProduct.images[0].src}
                      alt={activeHeroProduct.images[0].alt}
                      width="800"
                      height="1000"
                    />
                  </div>
                )}
              </div>

              <div className="xmas-stage-card-footer">
                <div>
                  <p className="xmas-stage-blurb">{activeHeroMeta.blurb}</p>
                </div>
                <div className="xmas-stage-price-cta">
                  <div className="xmas-stage-price">
                    <strong>{price(activeHeroProduct)} <small>CAD</small></strong>
                    <span>Free shipping included</span>
                  </div>
                  <Link className="xmas-mini-cta" to={activeHeroLink}>
                    Open Listing ↗
                  </Link>
                </div>
              </div>
            </FloatingTiltCard>
          </div>
        </div>
      </section>

      {/* FESTIVE MARQUEE RIBBON */}
      <div className="xmas-ribbon" aria-hidden="true">
        <div>
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i}>
              CRAFTED IN EDMONTON, ALBERTA <b>✦</b> SMALL-BATCH STUDIO PIECES <b>✦</b> FREE TRACKED CANADIAN SHIPPING INCLUDED <b>✦</b> SOUTH EDMONTON APPOINTMENT PICKUP <b>✦</b>
            </span>
          ))}
        </div>
      </div>

      {/* CHRISTMAS PRODUCT COLLECTION GRID */}
      <section className="xmas-products-section" id="christmas-pieces">
        <div className="container">
          <div className="xmas-section-top">
            <div>
              <p className="xmas-eyebrow">THE CHRISTMAS COLLECTION · {listings.length} FESTIVE COLLECTIONS</p>
              <h2>
                Find your<br />
                <em>Christmas kind of joy.</em>
              </h2>
            </div>
            <p className="xmas-section-aside">
              Every price below includes Canadian shipping. Open a collection to explore its options, photos and available videos.
            </p>
          </div>

          <div className="xmas-filter-row" aria-label="Filter Christmas products">
            {["Everything", "Christmas Grace", "Festive lights", "Tree & table", "Under $30"].map(label => (
              <button
                type="button"
                key={label}
                aria-pressed={filter === label}
                onClick={() => setFilter(label)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="xmas-product-grid">
            {filteredListings.map(p => {
              const meta = PRODUCT_META[p.id];
              const hasReal3D = resolve3DModelId(p.id) !== null;
              const cardVideo = p.video || (p.videos && p.videos[0]);
              const isHoverPlaying = hoveredVideoId === p.id || tappedVideoId === p.id;
              const targetLink = itemHref(p.id);

              return (
                <article
                  key={p.id}
                  className={`xmas-product-card ${isHoverPlaying ? "is-playing-video" : ""}`}
                  onPointerEnter={event => {
                    if (event.pointerType === "mouse") {
                      setTappedVideoId(null);
                      setHoveredVideoId(p.id);
                    }
                  }}
                  onPointerLeave={() => setHoveredVideoId(null)}
                >
                  <div className="xmas-card-media">
                    <Link className="xmas-product-image" to={targetLink}>
                      <img
                        src={p.images[0].thumb}
                        srcSet={`${p.images[0].thumb} 480w, ${p.images[0].src} 1200w`}
                        sizes="(max-width:680px) 45vw, (max-width:1060px) 45vw, 31vw"
                        alt={p.images[0].alt}
                        loading="lazy"
                        width="900"
                        height="1000"
                      />
                      {isHoverPlaying && cardVideo ? (
                        <video
                          className="xmas-card-hover-video"
                          src={cardVideo}
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        p.images[1] && (
                          <img
                            className="xmas-product-alternate"
                            src={p.images[1].thumb}
                            alt=""
                            loading="lazy"
                            width="480"
                            height="540"
                          />
                        )
                      )}
                      <div className="xmas-card-top-badges">
                        <span className="xmas-card-badge">
                          {meta?.tag || "Christmas Collection"}
                        </span>
                        {hasReal3D && (
                          <span className="xmas-card-3d-badge" title="Includes interactive 3D model on product page">
                            🧊 Interactive 3D
                          </span>
                        )}
                      </div>
                    </Link>
                    {cardVideo && (
                      <button
                        type="button"
                        className="xmas-video-pill"
                        aria-label={`${isHoverPlaying ? "Stop" : "Play"} video for ${nameFor(p.id, p.name)}`}
                        aria-pressed={isHoverPlaying}
                        onClick={() => {
                          setHoveredVideoId(null);
                          setTappedVideoId(isHoverPlaying ? null : p.id);
                        }}
                      >
                        {isHoverPlaying ? "Ⅱ Stop video" : "▶ Play video"}
                      </button>
                    )}
                  </div>

                  <div className="xmas-product-copy">
                    <p className="xmas-card-kicker">
                      {meta ? `${meta.heightLabel} · Crafted in Edmonton, AB` : "Crafted in Edmonton, AB"}
                    </p>
                    <h3>
                      <Link to={targetLink}>{nameFor(p.id, p.name)}</Link>
                    </h3>
                    <p className="xmas-card-mini-desc">
                      {meta?.summary || p.description}
                    </p>
                    <div className="xmas-card-bottom">
                      <div className="xmas-card-price-block">
                        <strong>{price(p)} <span>CAD</span></strong>
                        <small>Free Canadian shipping</small>
                      </div>
                      <Link className="xmas-card-launch" to={targetLink}>
                        <span className="xmas-card-desktop-action">{hasReal3D ? "3D Model & Photos ↗" : "Photos & Details ↗"}</span>
                        <span className="xmas-card-mobile-action">View details ↗</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* WARM ILLUMINATED LAMPS FEATURE BANNER */}
      <section className="xmas-glow-story">
        <div className="container xmas-glow-layout">
          <FloatingTiltCard className="xmas-glow-stage-col">
            <Christmas3DViewer
              modelId="village-on-the-moon-table-lamp"
              poster={get("village-on-the-moon-table-lamp").images[0].src}
              productName="Moonlit Christmas Village"
              warmLighting={true}
              compact={true}
            />
          </FloatingTiltCard>
          <div className="xmas-glow-copy-col">
            <span className="xmas-stage-kicker">AMBIENT HOLIDAY LIGHTING</span>
            <h2>Warm light for winter evenings.</h2>
            <p className="lead">
              LED lighting is included in the listed price of every illuminated Christmas product. Enjoy the warm glow shown for your selected lamp or lantern, with no extra charge for its lights.
            </p>
            <p>
              Explore the <strong>{nameFor("village-on-the-moon-table-lamp", get("village-on-the-moon-table-lamp").name)}</strong> photos to see the miniature cottages and crescent moon in detail.
            </p>
            <div className="xmas-glow-lamp-links">
              {[
                "village-on-the-moon-table-lamp",
                "christmas-angel",
                "bright-nativity-table-lamp",
                "santa-s-bonfire-table-lamp",
              ].map(lampId => {
                const lamp = get(lampId);
                return (
                  <Link key={lampId} to={itemHref(lampId)} className="xmas-glow-mini-card">
                    <img src={lamp.images[0].thumb} alt="" width="48" height="48" />
                    <div>
                      <strong>{nameFor(lamp.id, lamp.name)}</strong>
                      <span>{price(lamp)} CAD · Photos &amp; details ↗</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CHARACTER ORNAMENTS SHOWCASE */}
      <section className="xmas-ornament-section" id="christmas-ornaments">
        <div className="container">
          <div className="xmas-section-top">
            <div>
              <p className="xmas-eyebrow">CHRISTMAS CHARACTER ORNAMENTS · 8 DESIGNS</p>
              <h2>
                Give your tree<br />
                <em>some personality.</em>
              </h2>
            </div>
            <div className="xmas-section-aside">
              <p>
                Choose Santa, a sleepy pet, a reindeer, a snowman, or a nutcracker. Click any character below to watch its product video and inspect its photos.
              </p>
              <p className="xmas-price-line">
                {price(get("christmas-character-ornaments"))} <span>CAD each · Free tracked Canadian shipping included</span>
              </p>
            </div>
          </div>

          {activeOrnament && (
            <div className="xmas-ornament-spotlight">
              <div className="xmas-ornament-spotlight-media">
                {activeOrnament.video ? (
                  <video
                    key={activeOrnament.video}
                    src={activeOrnament.video}
                    poster={activeOrnament.images[0].src}
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img src={activeOrnament.images[0].src} alt={nameFor(activeOrnament.id, activeOrnament.name)} />
                )}
              </div>
              <div className="xmas-ornament-spotlight-info">
                <p className="xmas-eyebrow">SELECTED ORNAMENT · PRODUCT VIDEO &amp; GALLERY</p>
                <h3>{nameFor(activeOrnament.id, activeOrnament.name)}</h3>
                <p>{activeOrnament.description}</p>
                <div className="xmas-spotlight-meta">
                  <span>📏 Approx. 5 cm tall sculpted bauble</span>
                  <span>🚚 {price(activeOrnament)} CAD delivered</span>
                  <span>🎄 Built-in hanging loop</span>
                </div>
                <div className="xmas-spotlight-actions">
                  <Link className="xmas-button" to={itemHref("christmas-character-ornaments", activeOrnament.id)}>
                    View {nameFor(activeOrnament.id, activeOrnament.name).replace(" Christmas Ornament", "")} Photos &amp; Options <span>↗</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="xmas-ornament-grid">
            {ornaments.map(p => {
              const isSelected = p.id === activeOrnament.id;
              return (
                <div
                  className={`xmas-ornament ${isSelected ? "is-selected" : ""}`}
                  key={p.id}
                >
                  <button
                    type="button"
                    className="xmas-ornament-card-btn"
                    onClick={() => setActiveOrnamentId(p.id)}
                    aria-pressed={isSelected}
                  >
                    <span className="xmas-hanging-thread" aria-hidden="true" />
                    <span className="xmas-ornament-cap" aria-hidden="true" />
                    <img src={p.images[0].thumb} alt={p.name} loading="lazy" width="480" height="600" />
                    <span className="xmas-ornament-live-badge">
                      {isSelected ? "● Playing Video Above" : "▶ Click for Video"}
                    </span>
                  </button>
                  <Link className="xmas-ornament-title-link" to={itemHref("christmas-character-ornaments", p.id)}>
                    <strong>{nameFor(p.id, p.name).replace(" Christmas Ornament", "")}</strong>
                    <small>{price(p)} CAD · View Photos ↗</small>
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="xmas-ornament-note">
            One selected ornament per purchase. Mix your favourites by choosing each character design individually.
          </p>
        </div>
      </section>

      {/* WARM CLOSING BANNER */}
      <section className="xmas-closing">
        <div className="container">
          <span aria-hidden="true">✦</span>
          <h2>Crafted with care in Edmonton, Alberta.</h2>
          <p>
            Every piece is made in small batches, hand-inspected, carefully packed, and shipped directly from our studio. No mass-market warehouse shelves. Just honest craft.
          </p>
          <div className="button-row">
            <Link className="button" to="/shop">
              Shop All Studio Products ↗
            </Link>
            {publicMode && (
              <Link className="button button-outline" to="/shop/christmas">
                Browse Standard Grid View ↗
              </Link>
            )}
            <Link className="button button-outline" to="/contact">
              Ask a Studio Question ↗
            </Link>
          </div>
          <a className="xmas-back-to-top" href="#top">
            Back to All {listings.length} Christmas Collections <span>↑</span>
          </a>
        </div>
      </section>

      {/* OWNER REVIEW TABLE ONLY IN PRIVATE PREVIEW MODE */}
      {!publicMode && (
        <details className="container xmas-owner-review">
          <summary>Owner review · delivered pricing &amp; real 3D model status</summary>
          <p>
            All prices below are unified delivered CAD prices (free tracked shipping included; no separate pickup price toggle). Customers who choose South Edmonton pickup in the cart receive a 10% promo code on their next order.
          </p>
          <div className="xmas-price-table">
            <table>
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Delivered CAD (Shipping Included)</th>
                  <th>3D Model / Media Status</th>
                </tr>
              </thead>
              <tbody>
                {listings.map(p => (
                  <tr key={p.id}>
                    <td><Link to={itemHref(p.id)}>{p.name}</Link></td>
                    <td>{price(p)}</td>
                    <td>
                      {resolve3DModelId(p.id)
                        ? "✓ Real Interactive 3D Model (.3mf/.stl converted) + Studio Photos & Video"
                        : CHRISTMAS_GRACE_IDS.has(p.id)
                          ? "Reviewed reference photos & product video · original STL/3MF archive saved locally"
                          : "Studio Photos & Product Video (add assembled .3mf/.stl to enable 3D viewer)"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
