import { useShopMerchandising } from "./SiteContent";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import imageData from "../data/images.json";
import { business } from "../data/business";
import projects from "../data/projects.json";
import { useCart } from "./Cart";
import collections from "../../commerce/collections.json";

const images: Record<string, { base: string; width: number; height: number }> =
  imageData;
export function Photo({
  src,
  alt,
  className = "",
  priority = false,
  sizes = "(max-width: 700px) 100vw, 50vw",
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const image = images[src];
  const widths = image
    ? [480, 960, 1600].filter(
        (w, i, all) =>
          i === 0 ||
          Math.min(w, image.width) !== Math.min(all[i - 1], image.width),
      )
    : [];
  return (
    <img
      className={className}
      src={image ? `${image.base}-960.webp` : src}
      srcSet={
        image
          ? widths
              .map(
                (w) => `${image.base}-${w}.webp ${Math.min(w, image.width)}w`,
              )
              .join(", ")
          : undefined
      }
      sizes={image ? sizes : undefined}
      alt={alt}
      width={image?.width || 1200}
      height={image?.height || 900}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...(priority ? { fetchpriority: "high" } : {})}
    />
  );
}
export function Arrow() {
  return (
    <span aria-hidden="true" className="arrow">
      ↗
    </span>
  );
}
export function QuoteLink({
  service,
  children = "Request a Quote",
  className = "",
}: {
  service?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      className={`button ${className}`}
      to={
        service ? `/contact?service=${encodeURIComponent(service)}` : "/contact"
      }
    >
      {children}
      <Arrow />
    </Link>
  );
}
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Custom Build Studio — home">
      <span className="brand-mark">
        <img src="/media/logo.webp" width="320" height="320" alt="" />
      </span>
      <span>
        CUSTOM BUILD{" "}
        <span className="brand-bottom">
          STUDIO
          <span className="brand-rule" />
        </span>
      </span>
    </Link>
  );
}
export function Header() {
  const { items } = useCart();
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"shop" | "services" | null>(null);
  const location = useLocation();
  const toggle = useRef<HTMLButtonElement>(null);
  const merchandising = useShopMerchandising();
  const departments = merchandising.departments.map(id => collections.find(collection => collection.id === id)).filter((collection): collection is (typeof collections)[number] => Boolean(collection));
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  useEffect(() => { setOpen(false); setActivePanel(null); }, [location.pathname]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setActivePanel(null);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <div className="mobile-quick-paths" aria-label="Choose how to work with us">
          <NavLink to="/shop" className={({ isActive }) => isActive || location.pathname.startsWith("/shop/") ? "is-current" : ""}>Shop products</NavLink>
          <NavLink to="/services" className={({ isActive }) => isActive || location.pathname.startsWith("/services/") ? "is-current" : ""}>Custom services</NavLink>
        </div>
        <button
          ref={toggle}
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}
          <span aria-hidden="true">{open ? "×" : "☰"}</span>
        </button>
        <nav
          id="main-navigation"
          className={open ? "main-nav is-open" : "main-nav"}
          aria-label="Main navigation"
        >
          <div className="nav-group">
            <NavLink to="/shop" className={location.pathname.startsWith("/shop") ? "active" : ""}>Shop</NavLink>
            <button type="button" className="nav-group-toggle" aria-label="Show shop categories" aria-expanded={activePanel === "shop"} aria-controls="shop-navigation-panel" onClick={() => setActivePanel(activePanel === "shop" ? null : "shop")}>⌄</button>
            <div id="shop-navigation-panel" className={`nav-panel ${activePanel === "shop" ? "is-open" : ""}`}>
              <Link to="/shop/all">Shop all products</Link>
              {departments.map((collection) => <Link key={collection.id} to={`/shop/${collection.id}`}>{collection.name}</Link>)}
              <Link to="/shop/gifts-under-25">Gifts $25 &amp; under</Link>
            </div>
          </div>
          <div className="nav-group">
            <NavLink to="/services" className={location.pathname.startsWith("/services") ? "active" : ""}>Custom Services</NavLink>
            <button type="button" className="nav-group-toggle" aria-label="Show custom services" aria-expanded={activePanel === "services"} aria-controls="services-navigation-panel" onClick={() => setActivePanel(activePanel === "services" ? null : "services")}>⌄</button>
            <div id="services-navigation-panel" className={`nav-panel ${activePanel === "services" ? "is-open" : ""}`}>
              <Link to="/services/3d-printing">3D Printing · FDM &amp; Resin</Link>
              <Link to="/services/cad-design">CAD Design</Link>
              <Link to="/services/3d-scanning">3D Scanning</Link>
              <Link to="/services/cnc-woodworking">CNC Woodworking</Link>
              <Link to="/pricing">Service Pricing</Link>
              <Link to="/contact">Request a quote</Link>
            </div>
          </div>
          <NavLink to="/work">Our Work</NavLink>
          <NavLink to="/about">About</NavLink>
          <QuoteLink />
          <Link to="/shop/cart" className="nav-cart" aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}>Cart <span className="shop-cart-count">{cartCount}</span></Link>
        </nav>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Brand />
          <p>
            Ideas made tangible.
            <br />
            Custom design & fabrication in Edmonton, Alberta.
          </p>
          <p className="small">
            One-off projects. Prototypes. Small production runs.
          </p>
        </div>
        <div>
          <h2>Explore</h2>
          <Link to="/services">Services</Link>
          <Link to="/work">Our work</Link>
          <Link to="/shop">Shop all products</Link>
          <Link to="/shop/personalized-gifts">Personalized gifts</Link>
          <Link to="/about">The studio</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/reviews">Customer feedback</Link>
        </div>
        <div>
          <h2>Start a conversation</h2>
          <a href={`mailto:${business.email}`}>{business.email}</a>
          <a href={`tel:${business.telephone}`}>{business.phone}</a>
          <Link to="/contact">Request a quote ↗</Link>
          <a href={business.googleProfile} target="_blank" rel="noreferrer">
            Read our Google reviews ↗
          </a>
          <div className="socials">
            <a href={business.instagram} target="_blank" rel="noreferrer">
              Instagram ↗
            </a>
            <a href={business.facebook} target="_blank" rel="noreferrer">
              Facebook ↗
            </a>
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Custom Build Studio</span>
        <span>Edmonton, AB · Serving projects near and far</span>
        <Link to="/privacy">Privacy</Link>
        <Link to="/shipping-returns">Shipping & returns</Link>
      </div>
    </footer>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="page-intro">
      <div className="container">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{description}</p>
      </div>
    </section>
  );
}
export function CallToAction() {
  return (
    <section className="cta-section">
      <div className="container cta-inner">
        <div>
          <p className="eyebrow">LET’S MAKE IT HAPPEN</p>
          <h2>
            A file. A sketch.
            <br />
            Or just an idea.
          </h2>
          <p>Send us what you have. We’ll help work out the next step.</p>
        </div>
        <QuoteLink />
        <span className="cta-index" aria-hidden="true">
          ↗
        </span>
      </div>
    </section>
  );
}
export type Project = (typeof projects)[number];
export function ProjectCard({
  project,
  priority = false,
}: {
  project: Project;
  priority?: boolean;
}) {
  return (
    <article className="project-card">
      <Link to={`/work/${project.id}`} className="project-card-link">
        <div className="project-image">
          <Photo
            src={project.images[0].src}
            alt={project.images[0].alt}
            priority={priority}
            sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
          />
          <span className="project-open" aria-hidden="true">
            ↗
          </span>
          {project.videoUrl && (
            <span className="video-label">Includes video</span>
          )}
        </div>
        <div className="project-copy">
          <p className="project-meta">
            {project.material} <span>FDM 3D PRINTING</span>
          </p>
          <h3>{project.title}</h3>
          <p>{project.description}</p>
          <span className="text-link">
            Explore project <Arrow />
          </span>
        </div>
      </Link>
    </article>
  );
}
export const steps = [
  [
    "Send your idea",
    "Share a photo, sketch, file or description. Tell us what it needs to do.",
  ],
  [
    "Review & design",
    "We discuss the approach, materials, cost and any design work needed.",
  ],
  [
    "Approve the plan",
    "Review the design and quote before manufacturing starts.",
  ],
  ["Make it", "Your agreed design becomes a printed part or CNC-routed piece."],
  [
    "Receive your project",
    "We arrange pickup directly with you during your project, or discuss shipping for your finished work.",
  ],
];
export function Process() {
  const icons = ["M-10 -13H6L11 -8V9H-10Z M-5 -6H4 M-5 0H6", "M-11 6L5 -10L11 -4L-5 12H-11Z M1 -6L7 0", "M-10 0L-3 7L11 -8", "M-11 -6L0 -12L11 -6V7L0 13L-11 7Z M-11 -6L0 0L11 -6 M0 0V13", "M-11 -6H11V11H-11Z M-13 -6L0 -13L13 -6 M-4 11V2H4V11"];
  return (
    <section className="section process-section" id="process">
      <div className="container">
        <SectionHeading
          eyebrow="A CLEAR PATH FORWARD"
          title="From idea to finished part."
          description="You don’t need to know the manufacturing process. That’s what the conversation is for."
        />
        <div className="process-illustration" aria-hidden="true">
          <svg className="process-desktop" viewBox="0 0 1000 100" focusable="false">
            <path className="process-route" pathLength="1" d="M100 45H900" />
            {steps.map(([title], i) => <g key={title} transform={`translate(${100 + i * 200},45)`}><circle className="process-stage" r="28" /><path className="process-icon" d={icons[i]} /><text textAnchor="middle" y="50">{title}</text></g>)}
          </svg>
          <svg className="process-mobile" viewBox="0 0 310 250" focusable="false">
            <path className="process-route" pathLength="1" d="M30 25V225" />
            {steps.map(([title], i) => <g key={title} transform={`translate(30,${25 + i * 50})`}><circle className="process-stage" r="19" /><path className="process-icon" d={icons[i]} /><text x="36" y="5">{title}</text></g>)}
          </svg>
        </div>
        <ol className="process-grid">
          {steps.map(([title, text], i) => (
            <li key={title}>
              <span className="step-number">0{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
export function FAQ() {
  const entries = [
    [
      "Do you offer resin 3D printing?",
      "Yes. Our Anycubic Photon P1 prints detailed miniatures, display models and prototypes in resin. Jobs start at $30 CAD, with material, supports, printing and cleanup considered in the final quote. Choose high-detail resin in the quote form, or ask us which process suits your part.",
    ],
    [
      "Can I request just one part?",
      "Yes. One-off parts, personal projects and small production runs are welcome. You don’t need a commercial order to get started.",
    ],
    [
      "What if I don’t have a CAD file?",
      "Send a sketch, photos, measurements or a description of your idea. We’ll review what you have and discuss any modeling or scanning needed.",
    ],
    [
      "Can you reproduce a broken or discontinued part?",
      "Often, the original part can help establish the shape and dimensions. Send photos and explain how it is used so we can review whether scanning, modeling and reproduction are suitable.",
    ],
    [
      "How much will my project cost?",
      "Size, complexity, material, quantity and design work all affect the quote. The pricing page provides starting points; your project is reviewed before a final price is agreed.",
    ],
    [
      "Do you work outside Edmonton?",
      "We focus on Edmonton and surrounding communities. Projects elsewhere can be discussed when file sharing and shipping are practical.",
    ],
  ];
  return (
    <section className="section">
      <div className="container faq-layout">
        <div>
          <p className="eyebrow">GOOD QUESTIONS</p>
          <h2>
            Not sure where
            <br />
            to start?
          </h2>
          <p>
            Start with a conversation.
            <br />
            Technical files are optional.
          </p>
          <Link className="text-link" to="/contact">
            Talk about your project <Arrow />
          </Link>
        </div>
        <div className="faq-list">
          {entries.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
