import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import imageData from "../data/images.json";
import { business } from "../data/business";
import projects from "../data/projects.json";

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
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
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
          {[
            ["/services", "Services"],
            ["/work", "Our Work"],
            ["/about", "The Studio"],
            ["/pricing", "Pricing"],
          ].map(([to, label]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
          <QuoteLink />
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
          <Link to="/products">Products</Link>
          <Link to="/about">The studio</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/reviews">Customer feedback</Link>
        </div>
        <div>
          <h2>Start a conversation</h2>
          <a href={`mailto:${business.email}`}>{business.email}</a>
          <a href={`tel:${business.telephone}`}>{business.phone}</a>
          <Link to="/contact">Request a quote ↗</Link>
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
    "Arrange collection or discuss shipping for your finished work.",
  ],
];
export function Process() {
  return (
    <section className="section process-section" id="process">
      <div className="container">
        <SectionHeading
          eyebrow="A CLEAR PATH FORWARD"
          title="From idea to finished part."
          description="You don’t need to know the manufacturing process. That’s what the conversation is for."
        />
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
