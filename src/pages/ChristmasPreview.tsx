import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import draftProducts from "../../commerce/christmas-preview-products.json";
import { CatalogProduct } from "../data/catalog";
import { money } from "../components/Cart";
import { ShopProduct } from "./Shop";
import Christmas3DViewer from "../components/Christmas3DViewer";
import "../christmas.css";

const catalog = draftProducts as CatalogProduct[];
const listings = catalog.filter(product => !product.listingGroup);
const ornaments = catalog.filter(product => product.listingGroup === "christmas-character-ornaments");
const figurines = catalog.filter(product => product.listingGroup === "christmas-character-figurines");
const trays = catalog.filter(product => product.listingGroup === "christmas-trinket-trays");
const href = (id: string) => `/preview/christmas/${id}?analytics_test=1`;
const get = (id: string) => catalog.find(product => product.id === id)!;
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
    heightLabel: "19 cm tall",
    tag: "Kinetic Two-Part Spiral",
    summary: "Two interlocking spiral trees that slide and twist through each other, topped with a golden star.",
  },
  "christmas-angel": {
    heightLabel: "21 cm tall",
    tag: "Illuminated Nativity",
    summary: "Sculpted porcelain-look angel wings framing a layered Bethlehem nativity silhouette.",
  },
  "meowy-christmas-tree-topper": {
    heightLabel: "27 cm tall",
    tag: "Cat & Star Tree Topper",
    summary: "A playful grey cat stretching high to catch the golden Christmas star atop your tree.",
  },
  "christmas-character-figurines": {
    heightLabel: "8.3–10 cm",
    tag: "3 Individual Designs",
    summary: "Choose Knit-Look Santa, Cosy Jumper Snowman, or the articulated Christmas Baby Axolotl.",
  },
  "christmas-gnome-set": {
    heightLabel: "Up to 14.9 cm",
    tag: "Complete Set of 5",
    summary: "All five festive woodland gnomes included to arrange across your mantel, table, or windowsill.",
  },
  "bright-nativity-table-lamp": {
    heightLabel: "19 cm tall",
    tag: "Tealight Lantern Scene",
    summary: "A golden star and arched shelter over the Holy Family, designed for a warm battery LED tealight.",
  },
  "village-on-the-moon-table-lamp": {
    heightLabel: "14 cm tall",
    tag: "Crescent Moon Lamp",
    summary: "Miniature alpine cottages and pine trees nestled inside a textured lunar crescent.",
  },
  "santa-s-bonfire-table-lamp": {
    heightLabel: "11 cm tall",
    tag: "Fireside Tealight Scene",
    summary: "Santa and his reindeer taking a cosy Christmas Eve break beside a glowing campfire.",
  },
  "santa-s-snack-hat-bowl": {
    heightLabel: "8.7 cm tall",
    tag: "Festive Treat Bowl",
    summary: "An upturned Santa hat with textured white trim—made for wrapped chocolates, candy canes, or keys.",
  },
  "christmas-character-ornaments": {
    heightLabel: "Approx. 5 cm",
    tag: "8 Character Baubles",
    summary: "Pick your favourite holiday character or sleepy pet bauble, each printed with a built-in hanging loop.",
  },
  "christmas-trinket-trays": {
    heightLabel: "3 Holiday Shapes",
    tag: "Trinket Catch-All Trays",
    summary: "Choose between the festive Evergreen Tree, Winter Snowflake, or Holiday Stocking trinket catch-all.",
  },
  "christmas-tree-tray": {
    heightLabel: "Trinket Catch-All",
    tag: "Dual-Tone Holiday Tray",
    summary: "A festive tiered evergreen dish with silk metallic gold fluted accents for jewellery, desk treasures or sweets.",
  },
  "evergreen-wreath": {
    heightLabel: "Wall & Door Art",
    tag: "Sculptural Winter Wreath",
    summary: "Multi-layered spruce boughs adorned with silk champagne gold stars, baubles, and a satin crimson bow.",
  },
  "guiding-star-tree-topper": {
    heightLabel: "Star Tree Topper",
    tag: "Architectural Tree Topper",
    summary: "An open geometric star with a spiral branch mount in warm pearl white and radiant gold lattice.",
  },
  "heavenly-trio": {
    heightLabel: "Set of 3 Angels",
    tag: "Graceful Angel Figurines",
    summary: "Three porcelain-look angels with feathered wings holding a golden halo, sacred heart, and guiding star.",
  },
  "holy-family-embrace": {
    heightLabel: "Nativity Centerpiece",
    tag: "Contemporary Nativity Sculpture",
    summary: "A flowing alabaster embrace of Mary, Joseph, and baby Jesus with warm cedar cradle and polished gold halos.",
  },
  "luminous-tree": {
    heightLabel: "Glowing Lantern",
    tag: "Internal LED Tea Light Tree",
    summary: "A hollow translucent pine tree lantern with pierced star cutouts designed to glow warmly from within.",
  },
  "snowflake-tray": {
    heightLabel: "Trinket Catch-All",
    tag: "Crystalline Catch-All",
    summary: "A six-pointed crystalline snowflake dish with silver-white geometric facets and festive alpine basin.",
  },
  "stocking-tray": {
    heightLabel: "Trinket Catch-All",
    tag: "Holiday Stocking Catch-All",
    summary: "A festive crimson stocking-shaped tray with fluffy snow-white cuff, heel, and toe accents.",
  },
  "village-lights": {
    heightLabel: "Set of 2 Chalets",
    tag: "Illuminated Village Houses",
    summary: "Two snowy alpine chalets with window openings designed to glow warmly with internal LED tealights.",
  },
};

function FloatingTiltCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 35, active: false });
  const touchTilt = useRef<{ pointerId: number; rect: DOMRect } | null>(null);
  const resetTilt = () => {
    touchTilt.current = null;
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 35, active: false });
  };
  const updateTilt = (x: number, y: number, rect: DOMRect, touch: boolean) => {
    const nx = Math.max(-.5, Math.min(.5, (x - rect.left) / Math.max(1, rect.width) - .5));
    const ny = Math.max(-.5, Math.min(.5, (y - rect.top) / Math.max(1, rect.height) - .5));
    setTilt({ rx: -ny * (touch ? 7 : 9.5), ry: nx * (touch ? 14 : 11.5), gx: (nx + .5) * 100, gy: (ny + .5) * 100, active: true });
  };

  return (
    <div
      className={`${className || ""} xmas-floating-tilt-card ${tilt.active ? "is-tilting" : ""}`}
      style={
        {
          "--rx": `${tilt.rx.toFixed(2)}deg`,
          "--ry": `${tilt.ry.toFixed(2)}deg`,
          "--gx": `${tilt.gx.toFixed(1)}%`,
          "--gy": `${tilt.gy.toFixed(1)}%`,
        } as CSSProperties
      }
      onPointerDown={e => {
        if (e.pointerType === "mouse" || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if ((e.target as Element).closest('button, a, input, select, textarea, canvas, video')) return;
        const rect = e.currentTarget.getBoundingClientRect();
        touchTilt.current = { pointerId: e.pointerId, rect };
        updateTilt(e.clientX, e.clientY, rect, true);
      }}
      onPointerMove={e => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (e.pointerType === "mouse") {
          if ((e.target as Element).closest('canvas, input, select, video')) return;
          updateTilt(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect(), false);
        } else if (touchTilt.current?.pointerId === e.pointerId) {
          updateTilt(e.clientX, e.clientY, touchTilt.current.rect, true);
        }
      }}
      onPointerUp={resetTilt}
      onPointerCancel={resetTilt}
      onPointerLeave={resetTilt}
    >
      <div className="xmas-touch-tilt-hint" aria-hidden="true"><span>↔</span> Slide here to tilt the card</div>
      {children}
    </div>
  );
}

function ProductDetailWith3D({ product }: { product: CatalogProduct }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const variantParam = searchParams.get("variant");
  const model3dId = resolve3DModelId(product.id, variantParam);

  const activeFigurine = useMemo(() => {
    if (product.id !== "christmas-character-figurines") return null;
    return figurines.find(f => f.id === variantParam) || figurines[0];
  }, [product.id, variantParam]);

  const activeTray = useMemo(() => {
    if (product.id !== "christmas-trinket-trays") return null;
    return trays.find(t => t.id === variantParam) || trays[0];
  }, [product.id, variantParam]);

  const currentItem = activeFigurine || activeTray || product;

  return (
    <div className="xmas-detail-wrapper">
      <div className="xmas-detail-subnav">
        <div className="container xmas-detail-subnav-inner">
          <Link className="xmas-subnav-back" to="/preview/christmas?analytics_test=1">
            ← Back to Christmas Collection
          </Link>
          <div className="xmas-subnav-switcher" aria-label="Browse other Christmas products">
            <span>Christmas collection:</span>
            <div className="xmas-subnav-thumbs">
              {listings.map(item => (
                <Link
                  key={item.id}
                  to={href(item.id)}
                  className={item.id === product.id ? "is-active" : ""}
                  title={`${item.name} — ${money(item.priceCents)} CAD`}
                >
                  <img src={item.images[0].thumb} alt={item.name} width="34" height="34" />
                </Link>
              ))}
            </div>
            <Link to="/shop/admin" className="xmas-admin-subnav-link" title="Open Studio Admin to edit prices and options">
              ⚙ Admin ↗
            </Link>
          </div>
        </div>
      </div>

      {model3dId && (
        <section className="xmas-detail-3d-section" aria-label="Interactive 3D Model Inspector">
          <div className="container">
            <FloatingTiltCard className="xmas-detail-3d-card">
              <div className="xmas-detail-3d-info">
                <p className="xmas-eyebrow">INTERACTIVE 3D MODEL · ACTUAL PRODUCTION GEOMETRY</p>
                <h2>
                  Inspect <em>{currentItem.name}</em> in real 3D.
                </h2>
                <p className="xmas-detail-3d-lead">
                  This is the actual multi-part 3D model we print in our Edmonton studio—colored to match our reference finish. Drag in any direction to rotate 360°, use the zoom buttons to see details, and switch back to the photo whenever you like.
                </p>

                {product.id === "christmas-character-figurines" && (
                  <div className="xmas-figurine-3d-picker">
                    <p className="xmas-picker-title">Switch 3D Figurine Model:</p>
                    <div className="xmas-figurine-buttons">
                      {figurines.map(fig => {
                        const active = (activeFigurine?.id || "hooked-santa") === fig.id;
                        return (
                          <button
                            type="button"
                            key={fig.id}
                            className={active ? "is-active" : ""}
                            onClick={() => setSearchParams({ variant: fig.id, analytics_test: "1" }, { replace: true, preventScrollReset: true })}
                          >
                            <img src={fig.images[0].thumb} alt="" width="36" height="36" />
                            <span>{fig.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {product.id === "luminous-tree" && (
                  <div className="xmas-figurine-3d-picker">
                    <p className="xmas-picker-title">Switch Tree Pattern in 3D:</p>
                    <div className="xmas-figurine-buttons">
                      {[
                        { id: "luminous-tree", label: "Classic Star Pierced" },
                        { id: "luminous-tree-stars", label: "Snowflake Baubles" },
                        { id: "luminous-tree-spiral", label: "Spiral Ribbons" },
                      ].map(pat => {
                        const active = (variantParam || "luminous-tree") === pat.id;
                        return (
                          <button
                            type="button"
                            key={pat.id}
                            className={active ? "is-active" : ""}
                            onClick={() => setSearchParams({ variant: pat.id, analytics_test: "1" }, { replace: true, preventScrollReset: true })}
                          >
                            <span>{pat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {product.id === "christmas-trinket-trays" && (
                  <div className="xmas-figurine-3d-picker">
                    <p className="xmas-picker-title">Switch 3D Tray Shape:</p>
                    <div className="xmas-figurine-buttons">
                      {trays.map(tray => {
                        const active = (variantParam || "christmas-tree-tray") === tray.id;
                        return (
                          <button
                            type="button"
                            key={tray.id}
                            className={active ? "is-active" : ""}
                            onClick={() => setSearchParams({ variant: tray.id, analytics_test: "1" }, { replace: true, preventScrollReset: true })}
                          >
                            <img src={tray.images[0].thumb} alt="" width="36" height="36" />
                            <span>{tray.name.replace(" Christmas Trinket Tray", "").replace(" Trinket Tray", "")}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <ul className="xmas-detail-3d-tips">
                  <li><strong>Drag left / right / up / down:</strong> Rotate the real 3D model 360° in any direction.</li>
                  <li><strong>＋ / －:</strong> Zoom in or out. Use the arrow keys to rotate when the viewer is focused.</li>
                  
                  {model3dId === "endless-swirling-tree" && (
                    <li><strong>Kinetic Spiral Slider:</strong> Slide and twist the gold cone along the sage green spiral grooves in real 3D space.</li>
                  )}
                  {(model3dId.includes("lamp") || model3dId === "christmas-angel" || model3dId.includes("luminous-tree") || model3dId === "village-lights") && (
                    <li><strong>Tealight Controls:</strong> Toggle between Daylight (Off) and Cosy Tealight (On), or slide the brightness slider to see how light radiates from within the internal chamber.</li>
                  )}
                </ul>

                <a className="xmas-scroll-to-photos" href="#real-photos-and-specs">
                  ↓ View Actual Studio Photos, Video & Full Specifications
                </a>
              </div>

              <div className="xmas-detail-3d-stage">
                <Christmas3DViewer
                  modelId={model3dId}
                  poster={currentItem.images[0].src}
                  productName={currentItem.name}
                  warmLighting={true}
                />
              </div>
            </FloatingTiltCard>
          </div>
        </section>
      )}

      <div id="real-photos-and-specs" className="xmas-detail-preview">
        <ShopProduct previewCatalog={catalog} previewId={product.id} />
      </div>
    </div>
  );
}

export default function ChristmasPreview({ publicMode = false }: { publicMode?: boolean } = {}) {
  const { id } = useParams();
  const [collectionParams] = useSearchParams();
  const [filter, setFilter] = useState("Everything");
  const [motion, setMotion] = useState(true);
  const [activeHeroId, setActiveHeroId] = useState("endless-swirling-tree");
  const [heroViewTab, setHeroViewTab] = useState<"3d" | "video" | "photo">("3d");
  const [activeOrnamentId, setActiveOrnamentId] = useState(ornaments[0]?.id || "santa-claus-christmas-ornament");
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [tappedVideoId, setTappedVideoId] = useState<string | null>(null);
  const baseRoute = publicMode ? "/shop/christmas-special" : "/preview/christmas";
  const pageHref = (targetId: string) =>
    publicMode ? `${baseRoute}/${targetId}` : `/preview/christmas/${targetId}?analytics_test=1`;
  useEffect(() => {
    if (collectionParams.get("collection") === "christmas-grace") setFilter("Christmas Grace");
  }, [collectionParams]);

  useEffect(() => {
    document.title = id
      ? `${get(id)?.name || "Christmas"} | Custom Build Studio`
      : "The Christmas Collection · Warm Holiday Showcase | Custom Build Studio";
  }, [id]);

  const price = (p: CatalogProduct) => `${p.variants?.some(v => v.priceCents !== p.priceCents) ? "From " : ""}${money(p.priceCents)}`;

  if (id) {
    if (id === "christmas-grace-decorations") return <Navigate replace to={`${baseRoute}?collection=christmas-grace#christmas-pieces`} />;
    if (id === "christmas-tree-tray" || id === "snowflake-tray" || id === "stocking-tray") return <Navigate replace to={`${pageHref("christmas-trinket-trays")}${publicMode ? "?" : "&"}variant=${id}`} />;
    const targetProduct = get(id);
    if (targetProduct) return <ProductDetailWith3D product={targetProduct} />;
    return (
      <div className="xmas-detail-preview">
        <ShopProduct previewCatalog={catalog} previewId={id} />
      </div>
    );
  }

  const heroShowcases = [
    {
      id: "endless-swirling-tree",
      tag: "KINETIC TWO-PART SPIRAL",
      headline: "Slide & twist the real 3D spiral tree.",
      blurb: "Two nested helical trees printed in emerald green and metallic gold that glide smoothly through each other.",
    },
    {
      id: "christmas-angel",
      tag: "ILLUMINATED NATIVITY",
      headline: "A warm golden halo over the manger.",
      blurb: "Porcelain-look angel wings framing a multi-layered nativity silhouette with warm interior lighting.",
    },
    {
      id: "village-on-the-moon-table-lamp",
      tag: "CRESCENT MOON LAMP",
      headline: "A winter village cradled in the moon.",
      blurb: "Tiny cottages and alpine trees nestled inside a sculpted lunar crescent.",
    },
    {
      id: "santa-s-bonfire-table-lamp",
      tag: "FIRESIDE TEALIGHT SCENE",
      headline: "Santa & Rudolph warming by the fire.",
      blurb: "A full-color Christmas Eve campfire scene designed for a flickering LED tealight.",
    },
    {
      id: "hooked-santa",
      listingId: "christmas-character-figurines",
      tag: "KNIT-LOOK 3D FIGURINE",
      headline: "Carved knit-stitch texture you can feel.",
      blurb: "Every cable-knit stitch is sculpted directly into the 3D model and printed in vibrant multi-color PLA.",
    },
    {
      id: "holy-family-embrace",
      tag: "NATIVITY SCULPTURE",
      headline: "Contemporary flowing Holy Family.",
      blurb: "Alabaster white flowing embrace of Mary and Joseph with warm cedar cradle and polished gold halos.",
    },
    {
      id: "luminous-tree",
      tag: "GLOWING LED TREE LANTERN",
      headline: "Warm amber glow from within.",
      blurb: "A translucent pine tree with pierced star lattice designed for an internal LED tealight candle.",
    },
    {
      id: "village-lights",
      tag: "SNOWY VILLAGE CHALETS",
      headline: "Alpine chalets with glowing windows.",
      blurb: "Two snow-frosted cottages with door garlands and internal tea light illumination.",
    },
    {
      id: "guiding-star-tree-topper",
      tag: "GEOMETRIC TREE TOPPER",
      headline: "Architectural star with spiral base.",
      blurb: "Dual-tone ivory white and radiant gold lattice star designed to crown your Christmas tree.",
    },
    {
      id: "evergreen-wreath",
      tag: "SCULPTURAL PINE WREATH",
      headline: "Spruce boughs, stars & crimson ribbon.",
      blurb: "Rich multi-layered holiday wreath with baubles and a silk crimson bow.",
    },
    {
      id: "christmas-trinket-trays",
      tag: "FESTIVE TRINKET TRAYS",
      headline: "Tree, snowflake & stocking catch-alls.",
      blurb: "Festive catch-all dishes in three holiday shapes with silk metallic gold and snow-white accents.",
    },
  ];

  const activeHeroMeta = heroShowcases.find(h => h.id === activeHeroId) || heroShowcases[0];
  const activeHeroProduct = get(activeHeroId) || get("endless-swirling-tree");
  const activeHeroLink = href(activeHeroMeta.listingId || activeHeroProduct.id);
  const activeOrnament = ornaments.find(o => o.id === activeOrnamentId) || ornaments[0];

  const visible = listings.filter(
    product =>
      filter === "Everything" ||
      (filter === "Christmas Grace" && CHRISTMAS_GRACE_IDS.has(product.id)) ||
      (filter === "Under $30" && product.priceCents <= 3000) ||
      (filter === "Festive lights" &&
        ["christmas-angel", "bright-nativity-table-lamp", "village-on-the-moon-table-lamp", "santa-s-bonfire-table-lamp", "luminous-tree", "village-lights"].includes(product.id)) ||
      (filter === "Tree & table" &&
        (["endless-swirling-tree", "meowy-christmas-tree-topper", "christmas-gnome-set", "santa-s-snack-hat-bowl", "christmas-character-figurines", "christmas-character-ornaments"].includes(product.id) || (CHRISTMAS_GRACE_IDS.has(product.id) && !["luminous-tree", "village-lights"].includes(product.id))))
  );

  return (
    <div className={`xmas-page ${motion ? "xmas-motion" : "xmas-still"}`}>
      <div className="xmas-review-strip">
        <span>
          <strong>{publicMode ? "THE CHRISTMAS COLLECTION" : "UNPUBLISHED CHRISTMAS PREVIEW"}</strong> · All prices include Free Tracked Canadian Shipping · South Edmonton pickup gives 10% off your next order
        </span>
        <div className="xmas-strip-controls">
          {!publicMode && (
            <Link to="/shop/admin" className="xmas-admin-link" title="Open Studio Admin Control Panel">
              ⚙ Studio Admin ↗
            </Link>
          )}
          <button type="button" onClick={() => setMotion(!motion)} aria-pressed={motion}>
            {motion ? "Pause background snow Ⅱ" : "Play background snow ▷"}
          </button>
        </div>
      </div>

      {/* WARM FESTIVE HERO WITH REAL 3D MODEL VIEWER */}
      <section className="xmas-hero">
        <div className="xmas-warm-bokeh" aria-hidden="true">
          {Array.from({ length: 22 }, (_, i) => (
            <span
              key={i}
              className="xmas-bokeh-orb"
              style={{
                "--x": `${(i * 37 + 7) % 96}%`,
                "--y": `${(i * 29 + 11) % 88}%`,
                "--size": `${28 + (i % 5) * 26}px`,
                "--d": `${6 + (i % 5) * 2}s`,
                "--delay": `${-(i * 0.9)}s`,
              } as CSSProperties}
            />
          ))}
        </div>

        {motion && (
          <div className="xmas-snow-layer" aria-hidden="true">
            {Array.from({ length: 28 }, (_, i) => (
              <span
                key={i}
                className="xmas-snowflake"
                style={{
                  "--x": `${(i * 31 + 5) % 100}%`,
                  "--d": `${9 + (i % 6) * 2}s`,
                  "--delay": `${-(i * 0.7)}s`,
                  "--size": `${4 + (i % 4) * 2}px`,
                } as CSSProperties}
              />
            ))}
          </div>
        )}

        <div className="container xmas-hero-layout">
          <div className="xmas-hero-copy">
            <nav className="xmas-breadcrumb" aria-label="Breadcrumb">
              <Link to="/shop">Gifts & décor</Link>
              <span>/</span>
              <span>The Christmas Edit</span>
            </nav>

            <p className="xmas-eyebrow">
              <span aria-hidden="true">✦</span> HAND-FINISHED IN EDMONTON · CHRISTMAS 2026 COLLECTION
            </p>
            <h1>
              Warm light,<br />
              festive colour &amp;<br />
              <em>real 3D craft.</em>
            </h1>
            <p className="xmas-intro">
              Thoughtful little gifts, glowing winter scenes and festive favourites. Find your favourite, then explore its photos, video and interactive 3D view.
            </p>

            <div className="xmas-hero-selector" role="tablist" aria-label="Select a Christmas piece to inspect in 3D">
              <p className="xmas-selector-heading">Select a piece to load into the live 3D stage:</p>
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
                        <strong>{p.name}</strong>
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
                  View {activeHeroProduct.name} Details &amp; Photos <span>↗</span>
                </Link>
                <a className="xmas-button xmas-button-secondary" href="#christmas-pieces">
                  Browse All {listings.length} Collections <span>↓</span>
                </a>
              </div>
            </div>

            <div className="xmas-hero-trust-pills">
              <span><strong>✓ Free Tracked Shipping</strong> across Canada</span>
              <span><strong>✓ Local Pickup Bonus:</strong> 10% promo code for your next order</span>
              <span><strong>✓ Real 3D Models + Real Photos</strong> on every piece</span>
            </div>
          </div>

          <div className="xmas-hero-stage">
            <FloatingTiltCard className="xmas-hero-stage-card">
              <div className="xmas-stage-card-header">
                <div>
                  <span className="xmas-stage-kicker">{activeHeroMeta.tag}</span>
                  <h3>{activeHeroProduct.name}</h3>
                </div>
                <div className="xmas-stage-mode-switcher" role="tablist" aria-label="Switch between Real 3D Model, Product Video, and Studio Photo">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={heroViewTab === "3d"}
                    className={heroViewTab === "3d" ? "is-active" : ""}
                    onClick={() => setHeroViewTab("3d")}
                  >
                    🧊 Interactive 3D Model
                  </button>
                  {activeHeroProduct.video && (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={heroViewTab === "video"}
                      className={heroViewTab === "video" ? "is-active" : ""}
                      onClick={() => setHeroViewTab("video")}
                    >
                      ▶ Product Video
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
                    modelId={activeHeroId}
                    poster={activeHeroProduct.images[0].src}
                    productName={activeHeroProduct.name}
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
              CRAFTED IN EDMONTON, ALBERTA <b>✦</b> REAL INTERACTIVE 3D MODELS <b>✦</b> FREE TRACKED CANADIAN SHIPPING INCLUDED <b>✦</b> SOUTH EDMONTON PICKUP GIVES 10% OFF YOUR NEXT ORDER <b>✦</b>
            </span>
          ))}
        </div>
      </div>

      {/* SYMMETRICAL, BRIGHT, GLOWING CHRISTMAS PRODUCT COLLECTION GRID */}
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
              Every price below includes Canadian shipping. Open a collection to explore its designs, photos and available videos or interactive 3D previews.
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
                {label === "Everything" ? ` (${listings.length})` : ""}
              </button>
            ))}
            <span>Showing {visible.length} of {listings.length} collections · Prices in CAD</span>
          </div>
          <p className="xmas-grid-shipping">Free shipping across Canada</p>

          <div className="xmas-product-grid">
            {visible.map(p => {
              const meta = PRODUCT_META[p.id];
              const hasReal3D = Boolean(resolve3DModelId(p.id));
              const cardVideo =
                p.video ||
                (p.id === "christmas-character-figurines" ? get("hooked-santa")?.video : undefined) ||
                (p.id === "christmas-character-ornaments" ? ornaments[0]?.video : undefined);
              const isHoverPlaying = (hoveredVideoId === p.id || tappedVideoId === p.id) && Boolean(cardVideo);

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
                  <Link className="xmas-product-image" to={href(p.id)}>
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
                          🧊 Interactive 3D Model
                        </span>
                      )}
                    </div>
                  </Link>
                  {cardVideo && (
                    <button type="button" className="xmas-video-pill" aria-label={`${isHoverPlaying ? "Stop" : "Play"} video for ${p.name}`} aria-pressed={isHoverPlaying}
                      onClick={() => {
                        setHoveredVideoId(null);
                        setTappedVideoId(isHoverPlaying ? null : p.id);
                      }}>
                      {isHoverPlaying ? "Ⅱ Stop video" : "▶ Play video"}
                    </button>
                  )}
                  </div>

                  <div className="xmas-product-copy">
                    <p className="xmas-card-kicker">
                      {meta ? `${meta.heightLabel} · Printed in Edmonton` : "Printed in Edmonton"}
                    </p>
                    <h3>
                      <Link to={href(p.id)}>{p.name}</Link>
                    </h3>
                    <p className="xmas-card-mini-desc">
                      {meta?.summary || p.description}
                    </p>
                    <div className="xmas-card-bottom">
                      <div className="xmas-card-price-block">
                        <strong>{price(p)} <span>CAD</span></strong>
                        <small>Free Canadian shipping</small>
                      </div>
                      <Link className="xmas-card-launch" to={href(p.id)}>
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
            />
          </FloatingTiltCard>
          <div className="xmas-glow-copy">
            <p className="xmas-eyebrow">ILLUMINATED CHRISTMAS SCULPTURES · REAL 3D PREVIEW</p>
            <h2>
              Let the season<br />
              <em>glow a little warmer.</em>
            </h2>
            <p>
              Try dragging the <strong>Moonlit Christmas Village</strong> 3D model right here on the left, and slide its <strong>Tealight Brightness</strong> control to see how warm light fills the miniature cottages and crescent moon.
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
                  <Link key={lampId} to={href(lampId)} className="xmas-glow-mini-card">
                    <img src={lamp.images[0].thumb} alt="" width="48" height="48" />
                    <div>
                      <strong>{lamp.name}</strong>
                      <span>{price(lamp)} CAD · Inspect in 3D ↗</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* DROP 175 CHARACTER ORNAMENTS SHOWCASE */}
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
                  <img src={activeOrnament.images[0].src} alt={activeOrnament.name} />
                )}
              </div>
              <div className="xmas-ornament-spotlight-info">
                <p className="xmas-eyebrow">SELECTED ORNAMENT · PRODUCT VIDEO &amp; GALLERY</p>
                <h3>{activeOrnament.name}</h3>
                <p>{activeOrnament.description}</p>
                <div className="xmas-spotlight-meta">
                  <span>📏 Approx. 5 cm tall sculpted bauble</span>
                  <span>🚚 {price(activeOrnament)} CAD delivered</span>
                  <span>🎄 Built-in hanging loop</span>
                </div>
                <div className="xmas-spotlight-actions">
                  <Link className="xmas-button" to={`${href("christmas-character-ornaments")}&variant=${activeOrnament.id}`}>
                    View {activeOrnament.name.replace(" Christmas Ornament", "")} Photos &amp; Options <span>↗</span>
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
                  <Link className="xmas-ornament-title-link" to={`${href("christmas-character-ornaments")}&variant=${p.id}`}>
                    <strong>{p.name.replace(" Christmas Ornament", "")}</strong>
                    <small>{price(p)} CAD · View 6 Photos ↗</small>
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
          <p className="xmas-eyebrow">MADE TO ORDER IN EDMONTON, ALBERTA</p>
          <h2>
            Small pieces.<br />
            <em>Warm holiday memories.</em>
          </h2>
          <p>
            Every Christmas piece includes free tracked Canadian shipping—or select South Edmonton pickup in your cart to receive a 10% promo code for your next order.
          </p>
          <a className="xmas-button" href="#christmas-pieces">
            Back to All {listings.length} Christmas Collections <span>↑</span>
          </a>
        </div>
      </section>

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
                  <td><Link to={href(p.id)}>{p.name}</Link></td>
                  <td>{money(p.priceCents)}</td>
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
    </div>
  );
}
