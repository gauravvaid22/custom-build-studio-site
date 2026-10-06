import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Arrow,
  CallToAction,
  FAQ,
  Photo,
  Process,
  ProjectCard,
  QuoteLink,
  SectionHeading,
} from "../components/Shared";
import { services } from "../data/services";
import projects from "../data/projects.json";
import { business } from "../data/business";

export default function Home() {
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

    const targets = main.querySelectorAll<HTMLElement>(
      ".home-shop-copy, .home-shop-gallery, #capabilities .section-heading, #capabilities .service-card, " +
      ".work-section .section-heading, .work-section .project-card, .studio-section .studio-photo, " +
      ".studio-section .studio-copy, .process-section .section-heading, .process-grid li, " +
      ".faq-layout > div, .cta-section .cta-inner > div, .cta-section .cta-inner > a",
    );
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });

    targets.forEach((target) => {
      target.classList.add("home-reveal-target");
      if (target.getBoundingClientRect().top < window.innerHeight * 0.88) target.classList.add("is-visible");
      else observer.observe(target);
    });
    main.classList.add("home-motion-active");
    return () => {
      observer.disconnect();
      main.classList.remove("home-motion-active");
    };
  }, []);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="orange-line" />
              DESIGN & FABRICATION · EDMONTON, AB
            </p>
            <h1 className="home-hero-title">
              Made for your home.
              <br />
              <span>Built for your ideas.</span>
            </h1>
            <p className="hero-description">
              Shop finished gifts and décor, or bring us an idea for custom 3D printing,
              CAD design, scanning or CNC woodworking in Edmonton.
            </p>
            <div className="hero-paths" aria-label="Choose what you need">
              <Link className="hero-path" to="/shop">
                <span className="hero-path-icon" aria-hidden="true">◇</span>
                <span><strong>Shop products</strong><small>Finished gifts, décor and accessories</small></span>
                <Arrow />
              </Link>
              <Link className="hero-path" to="/services">
                <span className="hero-path-icon" aria-hidden="true">✳</span>
                <span><strong>Custom services</strong><small>Design and fabrication for your project</small></span>
                <Arrow />
              </Link>
            </div>
            <p className="hero-note">Have a sketch, file or broken part? <Link to="/contact">Request a custom quote ↗</Link></p>
            <Link className="hero-seasonal-link" to="/shop/halloween-special/#halloween-masks">
              <span>NEW FOR HALLOWEEN</span> Explore our wearable masks <Arrow />
            </Link>
          </div>
          <div className="hero-visual">
            <div className="hero-frame">
              <Photo
                src="/images/work/pa6cf-gear-mount-1.jpg"
                alt="Custom Build Studio’s PA6-CF printed gear and motor mount assembly"
                priority
                sizes="(max-width: 800px) 100vw, 52vw"
              />
              <span className="frame-label">FROM THE STUDIO / 015</span>
              <span className="frame-cross" aria-hidden="true">
                +
              </span>
            </div>
            <Link to="/work/gear-mount" className="hero-caption">
              <div>
                <span className="small">REAL PROJECT · PA6-CF</span>
                <strong>Gear & motor mount assembly</strong>
              </div>
              <Arrow />
            </Link>
          </div>
        </div>
        <div className="container hero-bottom">
          <span>CONCEPT → DESIGN → PROTOTYPE → FINISHED PART</span>
          <a href="#capabilities">
            Explore the possibilities <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
      <div className="trust-strip">
        <div className="container">
          <span>Designed around your project</span>
          <a href={business.googleProfile} target="_blank" rel="noreferrer">
            Read our Google reviews ↗
          </a>
          <span>From digital model to physical part</span>
        </div>
      </div>
      <section className="home-shop-feature" aria-labelledby="home-shop-title">
        <div className="container home-shop-feature-grid">
          <div className="home-shop-copy">
            <p className="eyebrow">HALLOWEEN MASKS · GIFTS & DÉCOR · EDMONTON</p>
            <h2 id="home-shop-title">Gifts with character. Made here.</h2>
            <p>
              Explore finished Halloween masks alongside locally made gifts,
              planters, gaming accessories and seasonal décor.
            </p>
            <div className="button-row">
              <Link className="button" to="/shop/halloween-special/#halloween-masks">
                Explore the masks <Arrow />
              </Link>
              <Link className="button button-outline" to="/shop/">
                Shop all gifts & décor <Arrow />
              </Link>
            </div>
            <ul className="home-shop-points" aria-label="Shopping benefits">
              <li>Made in Edmonton</li>
              <li>Secure Shopify checkout</li>
              <li>Free tracked shipping across Canada</li>
            </ul>
          </div>
          <div className="home-shop-gallery" aria-label="Featured gifts and décor">
            <Link className="home-shop-tile home-shop-tile-main" to="/shop/pumpkin-head-halloween-mask/">
              <img src="/media/shop/pumpkin-head-halloween-mask/2-1200.webp" alt="Person wearing the full-head Pumpkin Head Halloween Mask" loading="lazy" width="900" height="900" />
              <span><strong>Pumpkin Head Mask</strong><small>Full-head costume · choose your size ↗</small></span>
            </Link>
            <Link className="home-shop-tile" to="/shop/carved-in-fear-halloween-mask/">
              <img src="/media/shop/carved-in-fear-halloween-mask/3-1200.webp" alt="Person wearing the Carved in Fear front-face Halloween Mask" loading="lazy" width="900" height="900" />
              <span><strong>Carved in Fear Mask</strong><small>Front-face costume ↗</small></span>
            </Link>
            <Link className="home-shop-tile" to="/shop/candlelight-pumpkins-table-lamp/">
              <img src="/media/shop/candlelight-pumpkins-table-lamp/1-1200.webp" alt="Candlelight Pumpkins Table Lamp" loading="lazy" width="900" height="900" />
              <span><strong>Candlelight Pumpkins</strong><small>Explore Halloween décor ↗</small></span>
            </Link>
          </div>
        </div>
      </section>
      <section id="capabilities" className="section">
        <div className="container">
          <SectionHeading
            eyebrow="WHAT WE DO"
            title="Four capabilities. One studio."
            description="A replacement part. A new product. Something made just for you."
          >
            <Link to="/services" className="text-link">
              Explore all services <Arrow />
            </Link>
          </SectionHeading>
          <div className="services-grid">
            {services.map((s) => (
              <Link
                to={`/services/${s.id}`}
                className="service-card"
                key={s.id}
              >
                <div className="service-card-top">
                  <span>{s.number} /</span>
                  <Arrow />
                </div>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <span className="service-card-bottom">
                  {s.id === "cnc-woodworking"
                    ? "SIGNS · PANELS · CUSTOM PIECES"
                    : s.id === "3d-scanning"
                      ? "CAPTURE · REBUILD · REPRODUCE"
                      : s.id === "cad-design"
                        ? "SKETCH · MODEL · REFINE"
                        : "PROTOTYPES · PARTS · SMALL RUNS"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="section work-section">
        <div className="container">
          <SectionHeading
            eyebrow="SELECTED WORK"
            title="Real ideas. Made tangible."
            description="A closer look at the details, materials and projects that come through the studio."
          >
            <Link to="/work" className="text-link">
              View all projects <Arrow />
            </Link>
          </SectionHeading>
          <div className="project-grid">
            {["gauge-pod", "overland-badges", "toy-car"].map((id) => (
              <ProjectCard
                key={id}
                project={projects.find((p) => p.id === id)!}
              />
            ))}
          </div>
        </div>
      </section>
      <section className="section studio-section">
        <div className="container studio-grid">
          <div className="studio-photo">
            <Photo
              src="/images/work/6.jpg"
              alt="Close-up of a batch of printed wire-routing modules"
            />
            <span className="image-caption">
              CUSTOM PARTS. CONSIDERED DETAILS.
            </span>
          </div>
          <div className="studio-copy">
            <p className="eyebrow">SMALL STUDIO. PRACTICAL THINKING.</p>
            <h2>
              Made for the way
              <br />
              you’ll use it.
            </h2>
            <p>
              Every project starts with a purpose. A part that needs to fit. An
              idea that needs testing. A detail that makes a space your own.
            </p>
            <p>
              Custom Build Studio brings design and fabrication together in
              Edmonton, with a direct conversation about what matters: function,
              material, finish and budget.
            </p>
            <ul className="check-list">
              <li>Design support when you need it</li>
              <li>Materials selected around the application</li>
              <li>A clear plan before manufacturing</li>
            </ul>
            <Link className="text-link" to="/about">
              Meet the studio <Arrow />
            </Link>
          </div>
        </div>
      </section>
      <Process />
      <FAQ />
      <CallToAction />
    </>
  );
}
