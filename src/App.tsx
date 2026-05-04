import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, Outlet, Link, useLocation } from "react-router-dom";

/* =========================
   Work items (images in /public/images/work)
   ========================= */
type WorkItem = {
  title: string;
  desc: string;
  images: { src: string; alt: string }[];
  videoUrl?: string;
};

const works: WorkItem[] = [
  {
    title: "Gauge pod for automotive dash (PETG)",
    desc: "Clean fit and rigid mounting for daily-use driving.",
    images: [{ src: "/images/work/gauge-pod.jpg", alt: "Black PETG gauge pod mounted on a car dash" }],
  },
  {
    title: "Vintage toy car — 3D scan to 1/4 scale print",
    desc: "Customer’s old toy car scanned and reproduced at quarter scale.",
    images: [{ src: "/images/work/toy-car-collage.jpg", alt: "Collage showing the original toy car and its 3D scan" }],
  },
  {
    title: "Single-piece vacuum hose adapter",
    desc: "Combined two adapters into one lighter part for better suction and no snag points.",
    images: [{ src: "/images/work/hose-adapter.jpg", alt: "One-piece vacuum hose adapter designed for air-duct cleaning" }],
  },
  {
    title: "Custom Dovetail Tracing Jig (PETG)",
    desc: "High-volume production run of tracing templates used for consistent floor profile marking.",
    images: [{ src: "/images/work/dovetail-jigs.jpg", alt: "High-volume production run of tracing templates used for consistent floor profile marking." }],
  },
  {
    title: "Custom Load-Bearing Bracket (PETG)",
    desc: "Designed and printed for a long wall shelf — built to support heavy weight with structural rigidity.",
    images: [{ src: "/images/work/custom-bracket.JPG", alt: "Designed and printed for a long wall shelf — built to support heavy weight with structural rigidity." }],
  },
  {
    title: "Brake Caliper Prototype — Golf 7 (ASA-CF)",
    desc: "Functional prototype caliper adapter for a Golf 7 Akebono brake setup. Printed in ASA-CF to verify clearances and geometry before metal machining.",
    images: [
      { src: "/images/work/brake-caliper-1.jpg", alt: "ASA-CF brake caliper adapter prototype mounted for test fit" },
      { src: "/images/work/brake-caliper-2.jpg", alt: "Close-up view of ASA-CF caliper adapter showing surface finish" },
    ],
  },
  {
    title: "High-Flow Venturi Tube (PETG)",
    desc: "Custom Venturi tube designed to increase airflow and create a low-pressure zone. Printed in PETG and tuned using flow calculations and testing.",
    images: [{ src: "/images/work/venturi-tube-1.jpg", alt: "PETG Venturi tube showing inlet, throat, and outlet geometry" }],
    videoUrl: "/videos/venturi-demo.mp4",
  },
  {
    title: "Custom Mouse Shell (ASA-CF)",
    desc: "Ergonomic mouse shell printed in ASA-CF for stiffness, heat resistance, and a clean matte finish. Built for daily-use reliability.",
    images: [{ src: "/images/work/custom-mouse-1.jpg", alt: "Custom ASA-CF mouse shell on desk setup" }],
  },
  {
    title: "Gear & Motor Mount Assembly (PA6-CF)",
    desc: "High-strength gear and motor mount assembly printed in PA6-CF for excellent toughness and dimensional stability under load.",
    images: [
      { src: "/images/work/pa6cf-gear-mount-1.jpg", alt: "PA6-CF printed gear and motor mount assembly on workbench" },
      { src: "/images/work/pa6cf-gear-mount-2.jpg", alt: "Side view of PA6-CF gear with motor mount installed" },
      { src: "/images/work/pa6cf-gear-mount-3.jpg", alt: "Close-up of PA6-CF gear teeth and motor mounting interface" },
    ],
  },
];

"/images/PRODUCTS/IPHONE_MAGSAFE_CHARGER/pa6cf-gear-mount-1.jpg"

/* =========================
   Product items
   ========================= */
type ProductItem = {
  title: string;
  material: string;
  desc: string;
  features: string[];
  price: string;
  images: { src: string; alt: string }[];
};

const products: ProductItem[] = [
  {
    title: "MagSafe Charger Stand for iPhone & Apple Watch | Charging Dock Holder | Desk Organizer",
    material: "",
    desc: `Keep your desk clean and organized with this minimal MagSafe stand for iPhone and Apple Watch.
Designed to hold both devices securely in one place while keeping cables hidden and tidy.
Each stand is made using high-quality PETG material for durability and heat resistance.
Available in multiple colors. Custom color requests are welcome.
If you have any questions, feel free to message me.`,
    features: [
      "Charging Station for both Apple Watch and Iphore",
      "Premium Feel",
      "Clean Design",
      "Wire managment",
    ],
    price: "$35.00",
    images: [{ src: "/images/PRODUCTS/IPHONE_MAGSAFE_HOLDER/PHOTO1.jpg", alt: "IPHONE MAGSACE HOLDER" },
      { src: "/images/PRODUCTS/IPHONE_MAGSAFE_HOLDER/PHOTO2.jpg", alt: "IPHONE MAGSACE HOLDER" },
      { src: "/images/PRODUCTS/IPHONE_MAGSAFE_HOLDER/PHOTO3.jpg", alt: "IPHONE MAGSACE HOLDER" },
      { src: "/images/PRODUCTS/IPHONE_MAGSAFE_HOLDER/PHOTO4.jpg", alt: "IPHONE MAGSACE HOLDER" },
      { src: "/images/PRODUCTS/IPHONE_MAGSAFE_HOLDER/PHOTO5.jpg", alt: "IPHONE MAGSACE HOLDER" },
      { src: "/images/PRODUCTS/IPHONE_MAGSAFE_HOLDER/PHOTO6.jpg", alt: "IPHONE MAGSACE HOLDER" },
      { src: "/images/PRODUCTS/IPHONE_MAGSAFE_HOLDER/PHOTO7.jpg", alt: "IPHONE MAGSACE HOLDER" },
      { src: "/images/PRODUCTS/IPHONE_MAGSAFE_HOLDER/PHOTO8.jpg", alt: "IPHONE MAGSACE HOLDER" },

    ]
  },
  // {
  //   title: "Electrical Bus Bar Holders",
  //   material: "PC FR (V-0)",
  //   desc: "Flame-retardant polycarbonate holders for secure, insulated bus bar mounting. Superior rigidity using UL 94 V-0 equivalent material.",
  //   features: [
  //     "UL 94 V-0 equivalent self-extinguishing material",
  //     "High dielectric strength for safe insulation",
  //     "Withstands high ambient electrical panel heat",
  //     "Customizable hole spacing available on request"
  //   ],
  //   price: "$55.00",
  //   images: []
  // },
  // {
  //   title: "Custom Retail Displays",
  //   material: "PETG / Matte",
  //   desc: "Custom branded stands for retail shops (e.g., Ice Cream Scoop holders). Differentiated multi-material aesthetic options available.",
  //   features: [
  //     "Two-tone material options (e.g., stone base, bright colored tops)",
  //     "Designed specifically for your product dimensions",
  //     "Durable PETG construction won't shatter if dropped",
  //     "Professional matte finish hides fingerprints"
  //   ],
  //   price: "$80.00+",
  //   images: []
  // }
];

/* =========================
   Inline SVG Icons
   ========================= */
const base: React.SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
};
const CheckCircle = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><circle cx="12" cy="12" r="10" /><path d="M8 12l2.5 2.5L16 9" /></svg>);
const Printer = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><rect x="6" y="9" width="12" height="8" rx="2" /><path d="M8 13h8" /><rect x="8" y="3" width="8" height="4" rx="1" /></svg>);
const Cog = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" /></svg>);
const Cube = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M12 2l8 4.5v10L12 21 4 16.5v-10L12 2z" /><path d="M12 21V11.5M4 6.5l8 5 8-5" /></svg>);
const Phone = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.66A2 2 0 0 1 4.11 1h2a2 2 0 0 1 2 1.72c.12.89.32 1.76.59 2.6a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.48-1.16a2 2 0 0 1 2.11-.45c.84.27 1.71.47 2.6.59A2 2 0 0 1 22 16.92z" /></svg>);
const Mail = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M22 6l-10 7L2 6" /></svg>);
const Instagram = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.5" cy="6.5" r="1" /></svg>);
const Facebook = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>);
const Wrench = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M21 3a7 7 0 0 1-9.8 9.8L7 17l-3 3 1.5 1.5 3-3 4.2-4.2A7 7 0 0 1 21 3z" /></svg>);
const Shield = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M12 2l7 4v5c0 5-3.5 9-7 11-3.5-2-7-6-7-11V6l7-4z" /></svg>);
const ArrowRight = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M5 12h14M12 5l7 7-7 7" /></svg>);
const Plus = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>);
const XMark = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M18 6L6 18M6 6l12 12" /></svg>);
const Star = (p: React.SVGProps<SVGSVGElement>) => (<svg {...base} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...p}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>);

/* =========================
   UI Primitives
   ========================= */
export function Button({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return <button className={("inline-flex items-center justify-center px-4 py-2 rounded-md border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 " + className).trim()} {...props} />;
}
export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={("bg-white/90 border rounded-2xl " + className).trim()} {...props} />;
}
export function CardHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={("px-5 pt-5 " + className).trim()} {...props} />;
}
export function CardTitle({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={("font-semibold text-lg " + className).trim()} {...props} />;
}
export function CardContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={("px-5 pb-5 " + className).trim()} {...props} />;
}
export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={("w-full rounded-md border border-slate-300 bg-white/90 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 " + className).trim()} {...props} />;
}
export function Textarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={("w-full rounded-md border border-slate-300 bg-white/90 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 " + className).trim()} {...props} />;
}
export function Separator({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={("h-px w-full bg-slate-200 " + className).trim()} {...props} />;
}

// Standardized Page Header
export function PageHeader({ title, description }: { title: string, description: string }) {
  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white py-16 md:py-24 text-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-900/20 to-transparent" />
      <div className="relative z-10 max-w-4xl mx-auto fade-section is-visible">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-4 text-slate-300 max-w-2xl mx-auto text-lg">{description}</p>
      </div>
    </div>
  );
}

/* =========================
   Analytics & SEO
   ========================= */
function GlobalAnimatedBackground() {
  return (
    <style>{`
      :root { --c1:#f0f9ff; --c2:#e0f2fe; --c3:#f8fafc; }
      .animated-bg { background: linear-gradient(120deg, var(--c1), var(--c2), var(--c3)); background-size: 400% 400%; animation: gradientShift 20s ease-in-out infinite; }
      @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      .fade-section { opacity: 0; transform: translateY(18px); transition: opacity .8s ease, transform .8s ease; }
      .fade-section.is-visible { opacity: 1; transform: translateY(0); }
    `}</style>
  );
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".fade-section");
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.10 });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function HeadTags({ title, description, url, image }: { title: string; description: string; url: string; image: string; }) {
  useEffect(() => {
    if (title) document.title = title;
    const ensure = (selector: string, create: () => HTMLElement) => {
      let el = document.head.querySelector(selector);
      if (!el) { el = create(); document.head.appendChild(el); }
      return el;
    };
    const md = ensure("meta[name='description']", () => { const m = document.createElement("meta"); m.setAttribute("name", "description"); return m; }) as HTMLMetaElement;
    md.setAttribute("content", description || "");
    const cl = ensure("link[rel='canonical']", () => { const l = document.createElement("link"); l.setAttribute("rel", "canonical"); return l; }) as HTMLLinkElement;
    cl.setAttribute("href", url);
  }, [title, description, url, image]);
  return null;
}

function AnalyticsDeferred({ id }: { id: string }) {
  useEffect(() => {
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      const s1 = document.createElement("script");
      s1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      s1.async = true;
      document.head.appendChild(s1);
      const s2 = document.createElement("script");
      s2.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${id}');`;
      document.head.appendChild(s2);
      ["pointerdown", "keydown", "scroll"].forEach((ev) => window.removeEventListener(ev, load));
    };
    ["pointerdown", "keydown", "scroll"].forEach((ev) => window.addEventListener(ev, load, { once: true, passive: true }));
    return () => ["pointerdown", "keydown", "scroll"].forEach((ev) => window.removeEventListener(ev, load));
  }, [id]);
  return null;
}

function AdsInit({ adsId }: { adsId: string }) {
  useEffect(() => {
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) { (window as any).dataLayer.push(args); }
    (window as any).gtag = (window as any).gtag || gtag;
    (window as any).gtag('config', adsId);
  }, [adsId]);
  return null;
}

/* =========================
   NAVBAR
   ========================= */
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      const goingDown = y > lastY.current + 6;
      const goingUp = y < lastY.current - 6;
      if (!menuOpen) {
        if (y > 80 && goingDown) setHidden(true);
        else if (goingUp || y < 80) setHidden(false);
      }
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = menuOpen ? "hidden" : original || "";
    return () => { document.body.style.overflow = original; };
  }, [menuOpen]);

  const links = [
    { href: "/services", label: "Services" },
    { href: "/work", label: "Work" },
    { href: "/pricing", label: "Pricing" },
    { href: "/products", label: "Products" },
    { href: "/reviews", label: "Reviews" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      <header className={"nav-appear fixed top-0 left-0 w-full z-50 will-change-transform " + (hidden ? "header-hidden " : "") + "bg-black shadow-md h-16 md:h-20"}>
        <div className="mx-auto max-w-7xl px-6 h-full flex items-center justify-between text-white">
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/brand/logo.png" alt="Custom Build Studio" className="h-10 w-auto" />
            <div className="block leading-tight">
              <div className="font-semibold text-lg">Custom Build Studio</div>
              <div className="text-xs text-gray-400">Precision. Design. Innovation.</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            {links.map((l, i) => (
              <Link key={l.href} to={l.href} className="nav-link hover:text-sky-500 transition-colors" style={{ animationDelay: `${120 + i * 60}ms` }}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden md:block">
            <Link to="/contact" className="inline-block">
              <button type="button" className="rounded-2xl bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
                Get a Quote
              </button>
            </Link>
          </div>
          <button type="button" className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md ring-1 ring-white/15 text-white" onClick={() => setMenuOpen(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div className={"fixed inset-0 z-50 md:hidden transition-opacity overscroll-contain " + (menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} onClick={() => setMenuOpen(false)}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        <div className={"absolute top-0 right-0 h-full w-72 bg-slate-900 border-l border-slate-800 text-white p-6 transform transition-transform duration-300 overflow-y-auto overscroll-contain " + (menuOpen ? "translate-x-0" : "translate-x-full")} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <span className="font-semibold tracking-wider">MENU</span>
            <button type="button" className="w-9 h-9 grid place-items-center rounded-md ring-1 ring-white/15 hover:bg-white/10" onClick={() => setMenuOpen(false)}>
              <XMark className="w-5 h-5" />
            </button>
          </div>
          <nav className="mt-8 space-y-2">
            <Link to="/" onClick={() => setMenuOpen(false)} className="block w-full text-base py-3 border-b border-white/10 hover:text-sky-400">Home</Link>
            {links.map((l) => (
              <Link key={l.href} to={l.href} onClick={() => setMenuOpen(false)} className="block w-full text-base py-3 border-b border-white/10 hover:text-sky-400">
                {l.label}
              </Link>
            ))}
            <Link to="/contact" onClick={() => setMenuOpen(false)} className="block mt-6">
              <button className="w-full rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-4 py-3 font-semibold shadow-sm">Get a Quote</button>
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}


/* =========================
   PAGES (V2 Architecture)
   ========================= */

function HomePage() {
  useReveal();
  
  // Added lightbox state to the Home Page for the featured projects
  const [lightbox, setLightbox] = useState<{ workIndex: number; imageIndex: number } | null>(null);

  useEffect(() => {
    const MAX = 400;
    const onScroll = () => {
      const y = Math.max(0, Math.min(MAX, window.scrollY || 0));
      const p = y / MAX;
      document.documentElement.style.setProperty("--hero-p", String(p));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Handle escape key for lightbox
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <HeadTags
        title="Custom Build Studio — 3D Printing, CAD & CNC in Edmonton"
        description="On-demand 3D printing, CAD modeling, and CNC programming in Edmonton. Fast quotes, functional parts, and shop-floor practicality."
        url="https://www.custombuildstudio.ca/"
        image="/og-image.jpg"
      />

      {/* HERO */}
      <section className="relative w-full min-h-[90svh] flex flex-col items-center justify-center text-white overflow-hidden bg-slate-900">
        <div className="absolute inset-0 hero-bg opacity-60" style={{ backgroundImage: "url('/images/hero-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-slate-900 hero-overlay" aria-hidden="true" />
        
        <div className="relative z-10 text-center max-w-5xl px-6 pt-20 hero-content">
          <span className="inline-block py-1 px-3 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-sm font-semibold mb-6 tracking-wide">EDMONTON, ALBERTA</span>
          <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6">From Idea → Precision Parts, Faster</h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            We help businesses and makers turn concepts into durable, functional parts. On-demand <strong>3D printing</strong>, precision <strong>CNC programming</strong>, and smart <strong>CAD design</strong>.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/contact"><Button className="w-full sm:w-auto rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-8 py-3 text-base border-none shadow-lg shadow-sky-900/50">Start Your Project</Button></Link>
            <Link to="/services"><Button className="w-full sm:w-auto rounded-xl bg-slate-800/80 border border-slate-600 text-white hover:bg-slate-700 px-8 py-3 text-base backdrop-blur-sm">Explore Services</Button></Link>
          </div>
        </div>
      </section>

      {/* V2 Landing: Trust/Value Prop */}
      <section className="bg-slate-900 border-b border-slate-800 py-12 relative z-20">
        <div className="mx-auto max-w-6xl px-4 fade-section">
          <div className="grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
            <div className="px-4 py-4 md:py-0">
              <Shield className="h-8 w-8 mx-auto text-sky-500 mb-3" />
              <h3 className="text-white font-bold text-lg">Shop-Floor Practical</h3>
              <p className="text-slate-400 text-sm mt-2">Advice from a working CNC machinist. Designs that print and parts that actually fit.</p>
            </div>
            <div className="px-4 py-4 md:py-0">
              <Cog className="h-8 w-8 mx-auto text-sky-500 mb-3" />
              <h3 className="text-white font-bold text-lg">Industrial Materials</h3>
              <p className="text-slate-400 text-sm mt-2">PA-CF, PC, ASA, PETG. We stock engineering-grade materials for parts that endure.</p>
            </div>
            <div className="px-4 py-4 md:py-0">
              <Phone className="h-8 w-8 mx-auto text-sky-500 mb-3" />
              <h3 className="text-white font-bold text-lg">Clear Communication</h3>
              <p className="text-slate-400 text-sm mt-2">One owner-operator point of contact. Fast quotes and clear ETAs you can rely on.</p>
            </div>
          </div>
        </div>
      </section>

      {/* V2 Landing: Service Teaser */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-10 fade-section">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">What We Do</h2>
            <p className="text-slate-600 mt-2 text-lg">Specialized manufacturing capabilities for low-volume production.</p>
          </div>
          <Link to="/services" className="text-sky-600 font-semibold hover:text-sky-800 flex items-center gap-1 group">
            View All Capabilities <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
           <Card className="rounded-2xl border-slate-200 hover:border-sky-300 transition-colors bg-white shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-xl"><Printer className="h-5 w-5 text-sky-600" /> FDM 3D Printing</CardTitle></CardHeader>
              <CardContent className="text-slate-600 text-sm">
                <p>High-precision printing using functional materials (Carbon/Glass Fiber, PC, ASA, PA). Optimized for strength and performance.</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200 hover:border-sky-300 transition-colors bg-white shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-xl"><Cube className="h-5 w-5 text-sky-600" /> CAD & 3D Scanning</CardTitle></CardHeader>
              <CardContent className="text-slate-600 text-sm">
                <p>Professional modeling and high-res scanning for reverse engineering and prototyping. Converting real parts into digital geometry.</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200 hover:border-sky-300 transition-colors bg-white shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-xl"><Wrench className="h-5 w-5 text-sky-600" /> CNC Programming</CardTitle></CardHeader>
              <CardContent className="text-slate-600 text-sm">
                <p>Accurate toolpaths for milling and turning operations (Fusion 360, Siemens, Mazak) designed for speed and surface quality.</p>
              </CardContent>
            </Card>
        </div>
      </section>

      {/* V2 Landing: Featured Work Teaser */}
      <section className="mx-auto max-w-6xl px-4 py-10 fade-section">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Featured Projects</h2>
            <p className="text-slate-600 mt-2 text-lg">A look at some of our recent industrial and functional prints.</p>
          </div>
          <Link to="/work" className="text-sky-600 font-semibold hover:text-sky-800 flex items-center gap-1 group">
            View Full Portfolio <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* We only show the first 3 items so the home page stays fast and clean */}
          {works.slice(0, 3).map((w, index) => {
            const cover = w.images[0];
            return (
              <Card key={w.title} className="rounded-2xl overflow-hidden group shadow-sm flex flex-col border-slate-200">
                <button type="button" onClick={() => setLightbox({ workIndex: index, imageIndex: 0 })} className="block relative h-56 w-full focus:outline-none overflow-hidden">
                  <img src={cover.src} alt={cover.alt} loading="lazy" className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                     <span className="text-white text-sm font-medium flex items-center gap-1">View Details <ArrowRight className="w-4 h-4"/></span>
                  </div>
                </button>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg leading-tight">{w.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 flex-grow flex flex-col">
                  <p className="mb-4">{w.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* V2 Landing: CTA Banner */}
      <section className="bg-sky-50 border-y border-sky-100 py-16 mt-10">
        <div className="mx-auto max-w-4xl px-4 text-center fade-section">
          <h2 className="text-3xl font-bold text-sky-950 mb-4">Ready to bring your part to life?</h2>
          <p className="text-sky-800 mb-8 text-lg">Send us a sketch, photo, or 3D file. We’ll review the geometry and give you a quote the same day.</p>
          <Link to="/contact">
            <Button className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-8 py-3 text-base shadow-md transition-transform hover:-translate-y-0.5">
              Get a Fast Quote
            </Button>
          </Link>
        </div>
      </section>

      {/* LIGHTBOX FOR HOME PAGE */}
      {lightbox !== null && (() => {
        const work = works[lightbox.workIndex];
        const image = work.images[lightbox.imageIndex];
        const hasPrev = lightbox.imageIndex > 0;
        const hasNext = lightbox.imageIndex < work.images.length - 1;

        return (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm grid place-items-center p-4" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
            <div className="relative max-h-[85vh] max-w-[92vw] w-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img src={image.src} alt={image.alt} className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl" />
              <div className="text-white text-center mt-4 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
                 <h4 className="font-semibold">{work.title}</h4>
              </div>
              
              {hasPrev && <button type="button" onClick={() => setLightbox({ workIndex: lightbox.workIndex, imageIndex: lightbox.imageIndex - 1 })} className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors">‹</button>}
              {hasNext && <button type="button" onClick={() => setLightbox({ workIndex: lightbox.workIndex, imageIndex: lightbox.imageIndex + 1 })} className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors">›</button>}
            </div>
            <button type="button" onClick={() => setLightbox(null)} className="absolute top-4 right-4 md:top-8 md:right-8 w-12 h-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        );
      })()}
    </>
  );
}

function ServicesPage() {
  useReveal();
  return (
    <div className="pb-24">
      <HeadTags title="Services | Custom Build Studio" description="FDM 3D printing, CAD modeling, and CNC programming services in Edmonton." url="https://www.custombuildstudio.ca/services" image="/og-image.jpg" />
      
      <PageHeader 
        title="Our Capabilities" 
        description="Comprehensive manufacturing services designed for functional prototypes, replacement parts, and low-volume production." 
      />

      <section className="mx-auto max-w-6xl px-4 py-16 fade-section">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: <Printer className="h-6 w-6 text-sky-600" />, title: "FDM 3D Printing", desc: "High-precision FDM printing using PLA, PETG, ABS, ASA, TPU, PET, PC, PA, and carbon or glass fiber-reinforced materials. We produce durable prototypes, functional parts, and small-batch runs with excellent accuracy and finish — optimized for strength and performance.", bullets: ["0.2–0.6 mm nozzles", "Rapid prototypes", "Batch production runs", "Engineering-grade materials"] },
            { icon: <Cube className="h-6 w-6 text-sky-600" />, title: "CAD Modeling & Scanning", desc: "Professional 3D modeling and high-resolution scanning for reverse engineering, product design, and prototyping. We convert real parts or ideas into detailed digital models, ready for 3D printing or CNC machining.", bullets: ["Fusion 360 & Onshape", "Reverse Engineering", "Export to STEP/STL/IGES", "Design for Manufacturing (DFM)"] },
            { icon: <Wrench className="h-6 w-6 text-sky-600" />, title: "CNC Programming", desc: "Accurate, efficient CNC programming for milling and turning operations. Using Fusion 360, Siemens, and Mazak systems, we create optimized toolpaths for precision, speed, and surface quality — tailored to your machine and materials.", bullets: ["Haas / Mazak / Siemens", "Solid fixturing strategies", "Clear setup sheets", "Tool list generation"] },
          ].map((s) => (
            <Card key={s.title} className="rounded-2xl border-slate-200 shadow-sm flex flex-col">
              <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                <CardTitle className="flex items-center gap-3 text-xl">{s.icon}{s.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-600 text-sm pt-5 flex-grow">
                <p className="leading-relaxed mb-5">{s.desc}</p>
                <div className="font-semibold text-slate-800 mb-2">Key Highlights:</div>
                <ul className="space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" /> 
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function WorkPage() {
  useReveal();
  const [lightbox, setLightbox] = useState<{ workIndex: number; imageIndex: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pb-24">
      <HeadTags title="Portfolio | Custom Build Studio" description="See our recent 3D printing and CAD projects." url="https://www.custombuildstudio.ca/work" image="/og-image.jpg" />
      
      <PageHeader 
        title="Recent Work" 
        description="A selection of our latest functional prints, prototypes, and engineering solutions." 
      />

      <section className="mx-auto max-w-6xl px-4 py-16 fade-section">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {works.map((w, index) => {
            const cover = w.images[0];
            return (
              <Card key={w.title} className="rounded-2xl overflow-hidden group shadow-sm flex flex-col border-slate-200">
                <button type="button" onClick={() => setLightbox({ workIndex: index, imageIndex: 0 })} className="block relative h-56 w-full focus:outline-none overflow-hidden">
                  <img src={cover.src} alt={cover.alt} loading="lazy" className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                     <span className="text-white text-sm font-medium flex items-center gap-1">View Details <ArrowRight className="w-4 h-4"/></span>
                  </div>
                </button>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg leading-tight">{w.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 flex-grow flex flex-col">
                  <p className="mb-4">{w.desc}</p>
                  {w.videoUrl && (
                    <div className="mt-auto">
                      <video className="w-full rounded-xl bg-slate-100" controls preload="metadata"><source src={w.videoUrl} type="video/mp4" />Your browser does not support the video tag.</video>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* LIGHTBOX */}
      {lightbox !== null && (() => {
        const work = works[lightbox.workIndex];
        const image = work.images[lightbox.imageIndex];
        const hasPrev = lightbox.imageIndex > 0;
        const hasNext = lightbox.imageIndex < work.images.length - 1;

        return (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm grid place-items-center p-4" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
            <div className="relative max-h-[85vh] max-w-[92vw] w-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img src={image.src} alt={image.alt} className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl" />
              <div className="text-white text-center mt-4 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
                 <h4 className="font-semibold">{work.title}</h4>
              </div>
              
              {hasPrev && <button type="button" onClick={() => setLightbox({ workIndex: lightbox.workIndex, imageIndex: lightbox.imageIndex - 1 })} className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors">‹</button>}
              {hasNext && <button type="button" onClick={() => setLightbox({ workIndex: lightbox.workIndex, imageIndex: lightbox.imageIndex + 1 })} className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors">›</button>}
            </div>
            <button type="button" onClick={() => setLightbox(null)} className="absolute top-4 right-4 md:top-8 md:right-8 w-12 h-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        );
      })()}
    </div>
  );
}

function PricingPage() {
  useReveal();
  return (
    <div className="pb-24">
      <HeadTags title="Pricing | Custom Build Studio" description="Transparent pricing for 3D printing, CAD, and CNC programming." url="https://www.custombuildstudio.ca/pricing" image="/og-image.jpg" />
      
      <PageHeader 
        title="Transparent Pricing" 
        description="No hidden fees. We price jobs based on geometry, material performance, and your strict deadlines." 
      />

      <section className="mx-auto max-w-5xl px-4 py-16 fade-section">
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { name: "3D Printing", price: "Project Based", desc: "Pricing varies by size, material, and part complexity. We do not charge basic plate fees for engineering work.", items: ["Minimum job charges $20.00", "Functional industrial parts from $50+", "Rush options available", "Bulk production discounts"] },
            { name: "CAD Modeling & Scanning", price: "$75/ hr", desc: "For reverse engineering and custom design work. Simple brackets and modifiers are often fixed-fee.", items: ["Simple parts often fixed-fee", "Includes geometry cleanup", "Export formats: STEP / STL / IGES"] },
            { name: "CNC Programming", price: "$75/ hr", desc: "Machine-dependent rate for efficient, crashed-tested toolpaths ready for your shop floor.", items: ["Setup sheets included", "Tool lists + post-processing", "Remote or onsite collaboration"] },
            { name: "Consulting / Troubleshooting", price: "Custom", desc: "Need advice on machine setup, material selection, or manufacturing workflow?", items: ["Process optimization", "Material sourcing advice", "Design for Manufacturing (DFM) check"] }
          ].map((p) => (
            <Card key={p.name} className="rounded-2xl border-slate-200 shadow-sm flex flex-col">
              <CardHeader className="bg-slate-50/50 rounded-t-2xl border-b border-slate-100">
                <CardTitle className="text-xl text-slate-900">{p.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700 pt-6 flex-grow flex flex-col">
                <div className="text-3xl font-extrabold text-sky-700 tracking-tight mb-2">{p.price}</div>
                <p className="text-slate-600 mb-6">{p.desc}</p>
                <div className="mt-auto">
                  <ul className="space-y-3 border-t border-slate-100 pt-4">
                    {p.items.map((it) => (
                      <li key={it} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-sky-500 shrink-0" /> 
                        <span className="text-slate-700 font-medium">{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-12 bg-sky-50 border border-sky-100 rounded-2xl p-6 md:p-8 text-center flex flex-col items-center">
          <Shield className="h-10 w-10 text-sky-600 mb-3" />
          <h3 className="text-xl font-bold text-sky-950">Need an exact quote?</h3>
          <p className="text-sky-800 mt-2 max-w-xl">Send us your 3D files (STEP, STL, IGES) or a dimensioned sketch. We review geometry same-day and provide a firm cost.</p>
          <Link to="/contact" className="mt-6">
            <Button className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl">Request a Quote</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function ProductsPage() {
  useReveal();

  // State to control the detailed product modal
  const [activeProduct, setActiveProduct] = useState<{ productIndex: number; imageIndex: number } | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActiveProduct(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pb-24">
      <HeadTags title="Products | Custom Build Studio" description="Ready-to-order engineering grade 3D printed parts from Custom Build Studio." url="https://www.custombuildstudio.ca/products" image="/og-image.jpg" />
      
      <PageHeader 
        title="Ready-to-Order Parts" 
        description="Durable, functional, and engineering-grade 3D printed components manufactured right here in Edmonton." 
      />

      <section className="mx-auto max-w-6xl px-4 py-16 fade-section">
        <div className="mb-10 p-5 bg-sky-50 border border-sky-100 rounded-2xl flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-shrink-0 bg-sky-100 p-3 rounded-full">
            <Mail className="w-8 h-8 text-sky-600" />
          </div>
          <div>
            <h3 className="font-bold text-sky-950 text-lg mb-1">How to Order</h3>
            <p className="text-sky-800">Browse the items below and click <strong>"Order via Email"</strong> to send us your request. We process orders directly to keep costs low and will reply to arrange an <strong>Interac e-Transfer</strong> and local pickup/delivery details.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((p, index) => {
            const coverImage = p.images && p.images.length > 0 ? p.images[0].src : null;
            
            return (
              <Card key={index} className="rounded-2xl overflow-hidden flex flex-col group border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                
                {/* Image Button that opens the modal */}
                <button 
                  type="button" 
                  onClick={() => setActiveProduct({ productIndex: index, imageIndex: 0 })}
                  className="h-56 bg-slate-100 flex items-center justify-center border-b border-slate-200 relative overflow-hidden focus:outline-none"
                >
                  {coverImage ? (
                    <img src={coverImage} alt={p.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <Cube className="w-16 h-16 text-slate-300 transition-transform duration-500 group-hover:scale-110" />
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-slate-800 text-[11px] px-2.5 py-1 rounded-full font-bold border border-slate-200 shadow-sm z-10">{p.material}</div>
                  
                  {/* Hover Overlay */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                     <span className="text-white text-sm font-medium flex items-center gap-1">View Details <ArrowRight className="w-4 h-4"/></span>
                  </div>
                </button>

                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-slate-900 leading-tight mb-3">{p.title}</h3>
                  <p className="text-slate-600 text-sm mb-6 flex-grow leading-relaxed">
                    {p.desc}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                    <span className="text-2xl font-extrabold text-slate-900">{p.price}</span>
                    <button 
                      type="button"
                      onClick={() => setActiveProduct({ productIndex: index, imageIndex: 0 })}
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors shadow-sm"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* PRODUCT DETAIL MODAL */}
      {activeProduct !== null && (() => {
        const product = products[activeProduct.productIndex];
        const hasImages = product.images && product.images.length > 0;
        const currentImage = hasImages ? product.images[activeProduct.imageIndex] : null;
        
        const hasPrev = hasImages && activeProduct.imageIndex > 0;
        const hasNext = hasImages && activeProduct.imageIndex < product.images.length - 1;

        return (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" onClick={() => setActiveProduct(null)} role="dialog" aria-modal="true">
            <div className="relative bg-white rounded-2xl max-w-5xl w-full my-auto flex flex-col md:flex-row overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              
              {/* Left Side: Image Viewer */}
              <div className="relative w-full md:w-1/2 bg-slate-100 min-h-[300px] md:min-h-[500px] flex items-center justify-center">
                {currentImage ? (
                  <img src={currentImage.src} alt={currentImage.alt} className="w-full h-full object-cover absolute inset-0" />
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <Cube className="w-20 h-20 mb-4" />
                    <span className="text-sm font-medium uppercase tracking-wider">Image Coming Soon</span>
                  </div>
                )}

                {/* Arrows */}
                {hasPrev && (
                  <button type="button" onClick={() => setActiveProduct({ ...activeProduct, imageIndex: activeProduct.imageIndex - 1 })} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors">
                    ‹
                  </button>
                )}
                {hasNext && (
                  <button type="button" onClick={() => setActiveProduct({ ...activeProduct, imageIndex: activeProduct.imageIndex + 1 })} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors">
                    ›
                  </button>
                )}
              </div>

              {/* Right Side: Product Details */}
              <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col bg-white">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight pr-6">{product.title}</h3>
                  <button type="button" onClick={() => setActiveProduct(null)} className="text-slate-400 hover:text-slate-700 transition-colors bg-slate-100 hover:bg-slate-200 rounded-full p-2 shrink-0">
                    <XMark className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="mb-6">
                  <span className="bg-sky-100 text-sky-800 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider border border-sky-200">{product.material}</span>
                </div>
                
                <div className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">{product.price}</div>
                
                <p className="text-slate-600 text-base leading-relaxed mb-8">
                  {product.desc}
                </p>

                <div className="flex-grow">
                  <h4 className="font-semibold text-slate-900 mb-4 uppercase tracking-wide text-sm">Product Highlights</h4>
                  <ul className="space-y-3 mb-8">
                    {product.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                        <CheckCircle className="w-5 h-5 text-sky-500 shrink-0" />
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a 
                  href={`mailto:Custombuildstudio@gmail.com?subject=Order Inquiry: ${encodeURIComponent(product.title)}&body=Hi Custom Build Studio,%0A%0AI would like to order the ${encodeURIComponent(product.title)}.%0A%0AQuantity:%0A%0AAdditional Details/Questions:%0A%0ALet me know the next steps for e-Transfer. Thanks!`} 
                  className="w-full inline-flex items-center justify-center px-6 py-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-lg font-bold transition-transform hover:-translate-y-0.5 shadow-lg shadow-sky-600/30"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Order via Email
                </a>
                <p className="text-center text-xs text-slate-400 mt-4">We will reply within 24 hours to arrange payment & pickup.</p>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* =========================
   DYNAMIC TIME CALCULATION
   ========================= */
function timeAgo(dateString: string) {
  const reviewDate = new Date(dateString);
  const now = new Date();
  const diffInMonths = (now.getFullYear() - reviewDate.getFullYear()) * 12 + (now.getMonth() - reviewDate.getMonth());
  
  if (diffInMonths < 1) return "Just now";
  if (diffInMonths === 1) return "1 month ago";
  if (diffInMonths < 12) return `${diffInMonths} months ago`;
  const years = Math.floor(diffInMonths / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

function ReviewsPage() {
  useReveal();

  // IMPORTANT: Replace these with your actual 3-5 best Google reviews!
  // Add the exact date they were posted (YYYY-MM-DD), and the exact share link from Google Maps.
  const reviews = [
    {
      name: "Des Schwindt",
      date: "2025-11-23", 
      link: "https://www.google.com/search?sca_esv=7df939b265e22e41&authuser=2&sxsrf=ANbL-n5-Ko5AwVT5v5Qot7nkZ9P73qoRZA:1777854863584&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOeuxoojJt3g6is9sJeFkJTYcz0qDgpEYKpKgw-LlUKEjBroeAVGY6S2HpZyqcjYw7oREfcfWJO-uW9bqYdqG2khlqTT9kvWJiPqKwJQQRqwwt-lg8g%3D%3D&q=Custom+Build+Studio+Reviews&sa=X&ved=2ahUKEwj1qOy8sZ6UAxUVFDQIHQ4FJR8Q0bkNegQIMBAH",
      text: "3D printed parts were to exact spec finish and good pricing. Customer service was top notch and great to deal with , was kept in the loop on project build and completion.",
    },
    {
      name: "Ivy Kieser",
      date: "2026-03-19",
      link: "https://www.google.com/search?sca_esv=7df939b265e22e41&authuser=2&sxsrf=ANbL-n5-Ko5AwVT5v5Qot7nkZ9P73qoRZA:1777854863584&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOeuxoojJt3g6is9sJeFkJTYcz0qDgpEYKpKgw-LlUKEjBroeAVGY6S2HpZyqcjYw7oREfcfWJO-uW9bqYdqG2khlqTT9kvWJiPqKwJQQRqwwt-lg8g%3D%3D&q=Custom+Build+Studio+Reviews&sa=X&ved=2ahUKEwj1qOy8sZ6UAxUVFDQIHQ4FJR8Q0bkNegQIMBAH",
      text: "Quick turnaround, and was willing to find the right filament for me based on my budget and project requirements. Would recommend!",
    },
    {
      name: "Elijah Macaluso",
      date: "2025-12-07",
      link: "https://www.google.com/search?sca_esv=7df939b265e22e41&authuser=2&sxsrf=ANbL-n5-Ko5AwVT5v5Qot7nkZ9P73qoRZA:1777854863584&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOeuxoojJt3g6is9sJeFkJTYcz0qDgpEYKpKgw-LlUKEjBroeAVGY6S2HpZyqcjYw7oREfcfWJO-uW9bqYdqG2khlqTT9kvWJiPqKwJQQRqwwt-lg8g%3D%3D&q=Custom+Build+Studio+Reviews&sa=X&ved=2ahUKEwj1qOy8sZ6UAxUVFDQIHQ4FJR8Q0bkNegQIMBAH",
      text: "It was a great experience working on this project.All communication was timely and clear.Details about material and cost were open, frank and accurate.The best part was discussing design and getting recommendations before printing prototypes.I have already brought another project here and look forward to the final product.",
    },
  ];

  return (
    <div className="pb-24">
      <HeadTags title="Reviews | Custom Build Studio" description="Read what our clients have to say about our 3D printing and CAD services." url="https://www.custombuildstudio.ca/reviews" image="/og-image.jpg" />
      
      <PageHeader 
        title="Client Reviews" 
        description="Don't just take our word for it. See what local businesses and makers are saying about our parts." 
      />

      <section className="mx-auto max-w-6xl px-4 py-16 fade-section">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((r, i) => (
            <Card key={i} className="rounded-2xl border-slate-200 shadow-sm flex flex-col p-6">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} className="w-5 h-5 text-yellow-400" />
                ))}
              </div>
              <p className="text-slate-700 italic flex-grow mb-6 leading-relaxed">"{r.text}"</p>
              
              <div className="border-t border-slate-100 pt-4 mt-auto flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{r.name}</div>
                  <div className="text-sm text-slate-500">{timeAgo(r.date)}</div>
                </div>
                
                {/* External Link to the actual Google Review */}
                <a href={r.link} target="_blank" rel="noreferrer" className="text-sky-600 hover:text-sky-800 text-sm font-semibold flex items-center gap-1 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                  View
                </a>
              </div>

            </Card>
          ))}
        </div>

        <div className="mt-16 text-center p-8 bg-sky-50 rounded-2xl border border-sky-100">
          <h3 className="text-2xl font-bold text-sky-950 mb-3">Worked with us recently?</h3>
          <p className="text-sky-800 mb-6">We appreciate your honest feedback. It helps other local businesses find reliable manufacturing partners.</p>
          {/* REPLACE the # with your actual Google Maps Page Link */}
          <a href="#" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border-2 border-sky-200 text-sky-700 font-bold hover:bg-sky-100 transition-colors shadow-sm">
            Leave us a review on Google
          </a>
        </div>
      </section>
    </div>
  );
}

function ContactPage() {
  useReveal();
  
  // Array to hold the IDs of dynamic file input rows
  const [fileInputs, setFileInputs] = useState<number[]>([Date.now()]);

  const addFileInput = () => {
    // Limit to 5 separate files to prevent massive submissions
    if (fileInputs.length < 5) {
      setFileInputs([...fileInputs, Date.now()]);
    }
  };

  const removeFileInput = (idToRemove: number) => {
    setFileInputs(fileInputs.filter(id => id !== idToRemove));
  };

  return (
    <div className="pb-24 flex flex-col">
      <HeadTags title="Contact & Quotes | Custom Build Studio" description="Get a quote for your 3D printing or CNC programming project." url="https://www.custombuildstudio.ca/contact" image="/og-image.jpg" />
      
      <PageHeader 
        title="Get a Quote" 
        description="Send a sketch, photo, or 3D file. We’ll review the geometry and confirm details the same day." 
      />

      <section className="mx-auto max-w-5xl px-4 py-16 w-full fade-section">
        <div className="grid lg:grid-cols-5 gap-12 items-start">
          
          {/* Contact Info Sidebar */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Direct Contact</h2>
              <div className="space-y-4">
                <a href="tel:+17802030081" className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200">
                  <div className="bg-white p-2 rounded-lg shadow-sm"><Phone className="h-5 w-5 text-sky-600" /></div>
                  <span className="font-semibold text-slate-700">780-203-0081</span>
                </a>
                <a href="mailto:custombuildstudio@gmail.com" className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200">
                  <div className="bg-white p-2 rounded-lg shadow-sm"><Mail className="h-5 w-5 text-sky-600" /></div>
                  <span className="font-semibold text-slate-700 break-all">custombuildstudio@gmail.com</span>
                </a>
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Social</h2>
              <div className="space-y-4">
                <a href="https://instagram.com/Custom_Build_Studio" target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200">
                  <div className="bg-white p-2 rounded-lg shadow-sm"><Instagram className="h-5 w-5 text-sky-600" /></div>
                  <span className="font-semibold text-slate-700">@Custom_Build_Studio</span>
                </a>
                <a href="https://www.facebook.com/profile.php?id=61582467820321" target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200">
                  <div className="bg-white p-2 rounded-lg shadow-sm"><Facebook className="h-5 w-5 text-sky-600" /></div>
                  <span className="font-semibold text-slate-700">/CustomBuildStudio</span>
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <Card className="lg:col-span-3 rounded-2xl p-8 shadow-md border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Send Project Details</h3>
            <form method="POST" data-netlify="true" name="contact" encType="multipart/form-data" netlify-honeypot="bot-field" action="/thank-you.html" className="space-y-5"
              onSubmit={(e) => {
                const form = e.currentTarget;
                let total = 0;
                
                // Sum up the sizes across ALL dynamic file inputs
                const fileInputNodes = form.querySelectorAll('input[type="file"]');
                fileInputNodes.forEach((node) => {
                  const files = (node as HTMLInputElement).files;
                  if (files) {
                    for (let i = 0; i < files.length; i++) total += files[i].size;
                  }
                });

                // 7.5 MB safety threshold under Netlify's 8 MB hard limit
                if (total > 7.5 * 1024 * 1024) { 
                  e.preventDefault(); 
                  alert("Total attachment size is too large (max 7.5MB). Please email larger files directly."); 
                  return; 
                }

                // Add subject dynamically based on the name field
                const name = (form.querySelector('input[name="name"]') as HTMLInputElement)?.value?.trim();
                const subject = `[Custom Build Studio] New Quote Request${name ? ` from ${name}` : ""}`;
                const subjInput = form.querySelector('input[name="subject"]') as HTMLInputElement | null;
                if (subjInput) subjInput.value = subject;
              }}>
              <input type="hidden" name="form-name" value="contact" />
              <input type="hidden" name="subject" value="[Custom Build Studio] New Quote Request" />
              <p className="hidden"><label>Don’t fill this out if you’re human: <input name="bot-field" /></label></p>
              
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Name</label>
                  <Input name="name" placeholder="John Doe" required className="bg-slate-50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <Input name="email" type="email" placeholder="john@company.com" required className="bg-slate-50" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Phone (Optional)</label>
                <Input name="phone" placeholder="780-555-0199" className="bg-slate-50" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Project Details</label>
                <Textarea name="message" placeholder="Material requirements, environment constraints, quantities, etc." className="min-h-[140px] bg-slate-50" />
              </div>

              {/* DYNAMIC FILE UPLOADS SECTION */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="text-sm font-medium text-slate-800 flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                  Attach Files (Max 7.5MB total)
                </label>
                
                {fileInputs.map((id, index) => (
                  <div key={id} className="flex items-center gap-2">
                    <Input 
                      name={`file_${index + 1}[]`} 
                      type="file" 
                      multiple
                      accept=".step,.stp,.stl,.iges,.igs,.obj,.jpg,.jpeg,.png,.pdf" 
                      className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-100 file:text-sky-700 hover:file:bg-sky-200 bg-white shadow-sm cursor-pointer w-full" 
                    />
                    {fileInputs.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeFileInput(id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        aria-label="Remove file"
                        title="Remove file"
                      >
                        <XMark className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}

                {fileInputs.length < 5 && (
                  <button 
                    type="button" 
                    onClick={addFileInput}
                    className="text-sky-600 hover:text-sky-800 text-sm font-semibold flex items-center gap-1 mt-1 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add another file
                  </button>
                )}

                <p className="text-xs text-slate-500 mt-2 pt-3 border-t border-slate-200">
                  Supported formats: STEP/STP, STL, IGES, OBJ, JPG/PNG/PDF.
                </p>
              </div>

              <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white text-base py-3 rounded-xl shadow-md transition-transform hover:-translate-y-0.5">Send Request</Button>
            </form>
          </Card>

        </div>
      </section>
    </div>
  );
}

function ThankYouPage() {
  return (
    <div className="grid place-items-center px-4 py-32 flex-grow bg-slate-50">
      <HeadTags title="Thanks — Custom Build Studio" description="We received your request and will reply within 24 hours." url="https://www.custombuildstudio.ca/thank-you" image="/og-image.jpg" />
      <AdsInit adsId="AW-17678917579" />
      <div className="max-w-xl text-center space-y-6 bg-white p-12 rounded-3xl shadow-sm border border-slate-200">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <div className="text-3xl font-extrabold text-slate-900">Request Received</div>
        <p className="text-slate-600 text-lg">We’ll review your message and files and reply within 24 hours at <span className="font-semibold text-slate-800">custombuildstudio@gmail.com</span> or by phone.</p>
        <div className="pt-4">
           <Link to="/"><Button className="rounded-xl px-8 py-3 bg-slate-900 text-white hover:bg-slate-800">Return to Home</Button></Link>
        </div>
      </div>
    </div>
  );
}

/* =========================
   ROUTER LAYOUT WRAPPER
   ========================= */
function Layout() {
  return (
    <div className="min-h-[100svh] w-full text-slate-900 overflow-x-hidden flex flex-col bg-white">
      <AnalyticsDeferred id="G-8D08Z57Q3S" />
      <Navbar />
      <div className="h-16 md:h-20 bg-slate-900" aria-hidden="true" /> {/* Spacer matched to header color */}
      
      <main className="flex-grow flex flex-col">
        <Outlet />
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 mt-auto border-t border-slate-800">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <img src="/images/brand/logo.png" alt="" className="h-8 w-auto opacity-50 grayscale" />
             <span>© 2023-{new Date().getFullYear()} Custom Build Studio · Edmonton, AB</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* =========================
   MAIN APP (ROUTER)
   ========================= */
export default function App() {
  const location = useLocation();

  // Scroll to top on route change (CRITICAL for multi-page apps)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="work" element={<WorkPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="thank-you" element={<ThankYouPage />} />
      </Route>
    </Routes>
  );
}