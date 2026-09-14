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
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="orange-line" />
              DESIGN & FABRICATION · EDMONTON, AB
            </p>
            <h1>
              Ideas.
              <br />
              Designed.
              <br />
              <span>Built.</span>
            </h1>
            <p className="hero-description">
              FDM & resin 3D printing, CAD design, 3D scanning and CNC woodworking.
              From the first sketch to the finished piece.
            </p>
            <div className="button-row">
              <QuoteLink />
              <Link className="button button-outline" to="/work">
                View Our Work <Arrow />
              </Link>
            </div>
            <p className="hero-note">One-off projects & small runs welcome.</p>
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
