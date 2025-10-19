import React, { useEffect } from "react";

/* =========================
   Minimal UI Primitives
   ========================= */
export function Button({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      className={(
        "inline-flex items-center justify-center px-4 py-2 rounded-md border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 " +
        className
      ).trim()}
      {...props}
    />
  );
}
export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={("bg-white/90 border rounded-2xl " + className).trim()} {...props} />;
}
export function CardHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={("px-5 pt-5 " + className).trim()} {...props} />;
}
export function CardTitle({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={("font-semibold text-lg " + className).trim()} {...props} />;
}
export function CardContent({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={("px-5 pb-5 " + className).trim()} {...props} />;
}
export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={(
        "w-full rounded-md border border-slate-300 bg-white/90 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 " +
        className
      ).trim()}
      {...props}
    />
  );
}
export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={(
        "w-full rounded-md border border-slate-300 bg-white/90 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 " +
        className
      ).trim()}
      {...props}
    />
  );
}
export function Separator({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={("h-px w-full bg-slate-200 " + className).trim()} {...props} />;
}

/* =========================
   Deferred Google Analytics (GA4)
   ========================= */
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
      s2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${id}');
      `;
      document.head.appendChild(s2);

      ["pointerdown", "keydown", "scroll"].forEach((ev) => window.removeEventListener(ev, load));
    };
    ["pointerdown", "keydown", "scroll"].forEach((ev) =>
      window.addEventListener(ev, load, { once: true, passive: true })
    );
    return () =>
      ["pointerdown", "keydown", "scroll"].forEach((ev) => window.removeEventListener(ev, load));
  }, [id]);
  return null;
}

/* =========================
   Inline SVG Icons (no external deps)
   ========================= */
const base: React.SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};
const CheckCircle = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="10" /><path d="M8 12l2.5 2.5L16 9" /></svg>
);
const Printer = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><rect x="6" y="9" width="12" height="8" rx="2" /><path d="M8 13h8" /><rect x="8" y="3" width="8" height="4" rx="1" /></svg>
);
const Cog = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" /></svg>
);
const Cube = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M12 2l8 4.5v10L12 21 4 16.5v-10L12 2z" /><path d="M12 21V11.5M4 6.5l8 5 8-5" /></svg>
);
const Phone = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.66A2 2 0 0 1 4.11 1h2a2 2 0 0 1 2 1.72c.12.89.32 1.76.59 2.6a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.48-1.16a2 2 0 0 1 2.11-.45c.84.27 1.71.47 2.6.59A2 2 0 0 1 22 16.92z" /></svg>
);
const Mail = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M22 6l-10 7L2 6" /></svg>
);
const Instagram = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.5" cy="6.5" r="1" /></svg>
);
const Wrench = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M21 3a7 7 0 0 1-9.8 9.8L7 17l-3 3 1.5 1.5 3-3 4.2-4.2A7 7 0 0 1 21 3z" /></svg>
);
const Shield = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M12 2l7 4v5c0 5-3.5 9-7 11-3.5-2-7-6-7-11V6l7-4z" /></svg>
);

/* =========================
   Global Animated Background + reveal-on-scroll styles
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

/* =========================
   SEO / Social Head Tags
   ========================= */
function HeadTags({ title, description, url, image }: {
  title: string; description: string; url: string; image: string;
}) {
  useEffect(() => {
    if (title) document.title = title;

    const ensure = (selector: string, create: () => HTMLElement) => {
      let el = document.head.querySelector(selector);
      if (!el) { el = create(); document.head.appendChild(el); }
      return el;
    };

    const md = ensure("meta[name='description']", () => {
      const m = document.createElement("meta"); m.setAttribute("name","description"); return m;
    }) as HTMLMetaElement;
    md.setAttribute("content", description || "");

    const cl = ensure("link[rel='canonical']", () => {
      const l = document.createElement("link"); l.setAttribute("rel","canonical"); return l;
    }) as HTMLLinkElement;
    cl.setAttribute("href", url);

    const og = (prop: string, content: string) => {
      const m = ensure(`meta[property='${prop}']`, () => {
        const x = document.createElement("meta"); x.setAttribute("property", prop); return x;
      }) as HTMLMetaElement;
      m.setAttribute("content", content);
    };
    og("og:title", title); og("og:description", description); og("og:url", url); og("og:type", "website"); og("og:image", image);

    const tw = (name: string, content: string) => {
      const m = ensure(`meta[name='${name}']`, () => {
        const x = document.createElement("meta"); x.setAttribute("name", name); return x;
      }) as HTMLMetaElement;
      m.setAttribute("content", content);
    };
    tw("twitter:card", "summary_large_image"); tw("twitter:title", title); tw("twitter:description", description); tw("twitter:image", image);
  }, [title, description, url, image]);
  return null;
}

/* =========================
   Thank You Page (/thank-you)
   ========================= */
function ThankYouPage() {
  return (
    <div className="animated-bg min-h-screen w-full text-slate-900 grid place-items-center px-4">
      <GlobalAnimatedBackground />
      <HeadTags
        title="Thanks — Custom Build Studio"
        description="We received your request and will reply within 24 hours."
        url="https://www.custombuildstudio.ca/thank-you"
        image="/og-image.jpg"
      />
      <AnalyticsDeferred id="G-8D08Z57Q3S" />
      <div className="max-w-xl text-center space-y-6 fade-section is-visible">
        <div className="text-4xl font-extrabold">Thanks — we got your request!</div>
        <p className="text-slate-600">
          We’ll review your message and files and reply within 24 hours at
          <span className="font-medium"> custombuildstudio@gmail.com</span> or by phone.
        </p>
        <a href="/"><Button className="rounded-2xl">Back to Home</Button></a>
      </div>
    </div>
  );
}

/* =========================
   Main Site
   ========================= */
export default function App() {
  // Route switch for thank-you page
  if (typeof window !== "undefined" && window.location.pathname.endsWith("/thank-you")) {
    return <ThankYouPage />;
  }

  // Reveal-on-scroll behavior
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".fade-section");
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="animated-bg min-h-screen w-full text-slate-900 overflow-x-hidden">
      <GlobalAnimatedBackground />
      <HeadTags
        title="Custom Build Studio — 3D Printing, CAD & CNC in Edmonton"
        description="On-demand 3D printing, CAD modeling, and CNC programming in Edmonton. Fast quotes, functional parts, and shop-floor practicality."
        url="https://www.custombuildstudio.ca/"
        image="/og-image.jpg"
      />
      <AnalyticsDeferred id="G-8D08Z57Q3S" />

      {/* NAVBAR */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-slate-800 text-white grid place-items-center font-bold">CB</div>
            <div className="leading-tight">
              <div className="font-semibold text-lg">Custom Build Studio</div>
              <div className="text-xs text-slate-500">Edmonton · 3D Printing · CNC · Design</div>
            </div>
          </div>
          <nav className="hidden md:flex gap-6 text-sm">
            <a href="#services" className="hover:text-slate-700">Services</a>
            <a href="#work" className="hover:text-slate-700">Work</a>
            <a href="#pricing" className="hover:text-slate-700">Pricing</a>
            <a href="#contact" className="hover:text-slate-700">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href="#contact">
              <Button className="rounded-2xl bg-sky-500 hover:bg-sky-600 text-white transition-colors border border-transparent">
                Get a Quote
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="fade-section mx-auto max-w-6xl px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">From Idea → Precision Parts, Faster</h1>
          <p className="text-lg text-slate-600 max-w-prose">
            We help Edmonton businesses and makers turn concepts into durable, functional parts. On-demand <strong>3D printing</strong>,
            precision <strong>CNC programming</strong>, and smart <strong>CAD design</strong>—delivered with shop-floor practicality and quick turnaround.
          </p>
          <ul className="text-slate-700 space-y-2">
            {[
              "Same-day quotes, clear timelines",
              "PETG, ABS, ASA, PLA, and resin options",
              "Functional prototypes and low-volume production",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2"><CheckCircle className="h-5 w-5" /> {t}</li>
            ))}
          </ul>
          <div className="flex gap-3">
            <a href="#contact"><Button className="rounded-2xl bg-sky-500 hover:bg-sky-600 text-white transition-colors">Start Your Project</Button></a>
            <a href="#work"><Button className="rounded-2xl border-slate-300 text-slate-800 hover:bg-slate-100 transition-colors">See Examples</Button></a>
          </div>
          <div className="flex items-center gap-4 pt-2 text-sm text-slate-600">
            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> <a href="tel:+17802030081" className="underline">780-203-0081</a></div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> <a href="mailto:custombuildstudio@gmail.com" className="underline">custombuildstudio@gmail.com</a></div>
            <div className="flex items-center gap-2"><Instagram className="h-4 w-4" /> <a className="underline" href="https://instagram.com/Custom_Build_Studio" target="_blank" rel="noreferrer">@Custom_Build_Studio</a></div>
          </div>
        </div>
        <div className="grid gap-4">
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Printer className="h-4 w-4" /> 3D Printing</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600">FDM & Resin. Enclosed chamber available for ABS/ASA. Bed slinger + CoreXY. Prusa MK4S, Neptune 4 Pro, CR-10 Pro.</CardContent>
          </Card>
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Cube className="h-4 w-4" /> CAD & Reverse-Engineering</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600">Fusion 360 & Onshape. From sketch to solid models, organic shapes, and fit-for-purpose redesigns.</CardContent>
          </Card>
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Cog className="h-4 w-4" /> CNC Programming</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600">Milling & lathe toolpaths with shop-ready posts. Experience with Siemens, Mazak, Haas, DMG, and more.</CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* SERVICES */}
      <section id="services" className="fade-section mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-3xl font-bold">Services</h2>
        <p className="text-slate-600 mt-2">Clear options you can book today.</p>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {[
            { icon: <Printer className="h-5 w-5" />, title: "FDM 3D Printing", desc: "PLA/PETG/ABS/ASA up to 300°C. Functional parts, jigs, fixtures, enclosures.", bullets: ["0.2–0.6 mm nozzles", "Rapid prototypes", "Batch runs"] },
            { icon: <Cube className="h-5 w-5" />, title: "CAD Modeling", desc: "Design from scratch or based on sketches/samples. Includes DFM and tolerance advice.", bullets: ["Fusion 360", "Onshape", "STEP/STL/IGES"] },
            { icon: <Wrench className="h-5 w-5" />, title: "CNC Programming", desc: "2.5D–3+2 toolpaths, probing, posts, and setup docs for your machines.", bullets: ["Haas/Mazak/Siemens", "Solid fixturing", "Clear setup sheets"] },
          ].map((s) => (
            <Card key={s.title} className="rounded-2xl">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-xl">{s.icon}{s.title}</CardTitle></CardHeader>
              <CardContent className="text-slate-600 text-sm">
                <p>{s.desc}</p>
                <ul className="mt-3 space-y-1">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> {b}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* WORK */}
      <section id="work" className="fade-section mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-3xl font-bold">Recent Work</h2>
        <p className="text-slate-600 mt-2">A few representative projects. We’ll add your portfolio shots here.</p>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {[
            "Gauge pod for automotive dash (PETG)",
            "ABS enclosure w/ heat-set inserts",
            "PETG replacement for IKEA table part",
          ].map((title, i) => (
            <Card key={i} className="rounded-2xl overflow-hidden">
              <div className="h-40 bg-gradient-to-br from-slate-200 to-slate-100" />
              <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
              <CardContent className="text-xs text-slate-600">Placeholder image — swap with real photos later.</CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="fade-section mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-3xl font-bold">Pricing</h2>
        <p className="text-slate-600 mt-2">Transparent pricing that respects your deadlines.</p>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {[
            { name: "3D Printing", price: "From $0.20/gram + setup", items: ["Material: PLA, PETG, ABS/ASA", "Rush options available", "Bulk discounts"] },
            { name: "CAD & Reverse-Eng", price: "$35–$55/hr (scope-based)", items: ["Simple parts often fixed-fee", "Includes DFM notes", "Export: STEP/STL"] },
            { name: "CNC Programming", price: "$45–$75/hr (machine-dependent)", items: ["Setup sheets included", "Tool lists + posts", "Remote or onsite"] },
          ].map((p) => (
            <Card key={p.name} className="rounded-2xl border-slate-200">
              <CardHeader><CardTitle className="text-xl">{p.name}</CardTitle></CardHeader>
              <CardContent className="text-sm text-slate-700">
                <div className="text-2xl font-bold mb-3">{p.price}</div>
                <ul className="space-y-1">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> {it}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">* Final quote depends on geometry, material, finish, and deadlines. GST extra.</p>
      </section>

      {/* TRUST */}
      <section className="fade-section mx-auto max-w-6xl px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Shop-Floor Practical", desc: "Advice from a working CNC machinist—designs that print and parts that fit." },
            { title: "Clear Communication", desc: "One owner-operator point of contact. You’ll always know status and ETA." },
            { title: "Local & Reliable", desc: "Pickup in Edmonton, or ship anywhere in Canada." },
          ].map((t) => (
            <Card key={t.title} className="rounded-2xl">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> {t.title}</CardTitle></CardHeader>
              <CardContent className="text-sm text-slate-600">{t.desc}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="fade-section mx-auto max-w-6xl px-4 py-12">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-3xl font-bold">Tell us about your part</h2>
            <p className="text-slate-600 mt-2">Send a sketch, photo, or 3D file. We’ll confirm details and quote the same day.</p>
            <div className="mt-6">
              <div className="text-sm text-slate-700 flex items-center gap-2"><Phone className="h-4 w-4" /> 780-203-0081</div>
              <div className="text-sm text-slate-700 flex items-center gap-2"><Mail className="h-4 w-4" /> custombuildstudio@gmail.com</div>
              <div className="text-sm text-slate-700 flex items-center gap-2"><Instagram className="h-4 w-4" /> @Custom_Build_Studio</div>
            </div>
          </div>
          <Card className="rounded-2xl p-6">
            <form
              method="POST"
              data-netlify="true"
              name="contact"
              encType="multipart/form-data"
              netlify-honeypot="bot-field"
              action="/thank-you"
              className="space-y-4"
              onSubmit={(e) => {
                const form = e.currentTarget as HTMLFormElement;
                const name = (form.querySelector('input[name="name"]') as HTMLInputElement)?.value?.trim();
                const subject = `[Custom Build Studio] New Quote Request${name ? ` from ${name}` : ""}`;
                const subjInput = form.querySelector('input[name="subject"]') as HTMLInputElement | null;
                if (subjInput) subjInput.value = subject;
              }}
            >
              <input type="hidden" name="form-name" value="contact" />
              <input type="hidden" name="subject" value="[Custom Build Studio] New Quote Request" />
              {/* Netlify honeypot */}
              <p className="hidden">
                <label>Don’t fill this out if you’re human: <input name="bot-field" /></label>
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <Input name="name" placeholder="Your name" required />
                <Input name="email" type="email" placeholder="Email" required />
              </div>
              <Input name="phone" placeholder="Phone (optional)" />
              <Textarea name="message" placeholder="What do you need made?" className="min-h-[120px]" />
              <div>
                <label className="text-sm font-medium">Attach files (optional)</label>
                <Input name="files" type="file" multiple accept=".step,.stp,.stl,.iges,.igs,.obj,.jpg,.jpeg,.png,.pdf" />
                <p className="text-xs text-slate-500 mt-1">Supported: STEP/STP, STL, IGES, OBJ, JPG/PNG/PDF.</p>
              </div>
              <Button type="submit" className="rounded-2xl w-full bg-sky-500 hover:bg-sky-600 text-white transition-colors">Send</Button>
              <p className="text-xs text-slate-500">By submitting, you agree to be contacted about your request.</p>
            </form>
          </Card>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="fade-section border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} Custom Build Studio · Edmonton, AB</div>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
