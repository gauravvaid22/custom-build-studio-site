import { Link, useParams } from "react-router-dom";
import {
  Arrow,
  CallToAction,
  PageIntro,
  Photo,
  Process,
  QuoteLink,
} from "../components/Shared";
import { services } from "../data/services";
import {
  allServices,
  printingPages,
  quoteServiceId,
  serviceDetails,
} from "../data/landing";

export function Services() {
  return (
    <>
      <PageIntro
        eyebrow="CAPABILITIES / EDMONTON, ALBERTA"
        title="What do you want to make?"
        description="A ready-to-print file or a rough idea. A single piece or a small run. We help turn the starting point you have into the result you need."
      />
      <section className="section">
        <div className="container service-list">
          {services.map((s) => (
            <article className="service-row" key={s.id}>
              <span className="service-number">{s.number}</span>
              <div>
                <h2>{s.name}</h2>
                <p>{s.intro}</p>
                <Link className="text-link" to={`/services/${s.id}`}>
                  Explore{" "}
                  {s.id === "cad-design"
                    ? "CAD design"
                    : s.id === "3d-scanning"
                      ? "3D scanning"
                      : s.id === "cnc-woodworking"
                        ? "CNC woodworking"
                        : "3D printing"}{" "}
                  <Arrow />
                </Link>
              </div>
              <ul className="plain-list">
                {s.applications.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <PrintingLinks />
      <Process />
      <CallToAction />
    </>
  );
}
export function ServiceDetail() {
  const { id } = useParams();
  const s = allServices.find((s) => s.id === id);
  if (!s) return null;
  const detail = serviceDetails[s.id];
  return (
    <>
      <section className="page-intro service-intro">
        <div className="container">
          <Link className="breadcrumb" to="/services">
            ← All services
          </Link>
          <div className="service-detail-grid">
            <div>
              <p className="eyebrow">{s.number} / EDMONTON, ALBERTA</p>
              <h1>{detail.heading}</h1>
              <p className="lead">{s.intro}</p>
              <QuoteLink service={quoteServiceId(s.id)} />
            </div>
            {s.image ? (
              <div className="service-detail-photo">
                <Photo src={s.image} alt={s.alt} priority />
                <p>From our project portfolio</p>
              </div>
            ) : s.id === "resin-3d-printing" ? (
              <div className="cnc-panel">
                <p className="eyebrow">ANYCUBIC PHOTON P1 / MSLA</p>
                <h2>
                  Small details.
                  <br />
                  Considered from every angle.
                </h2>
                <p>
                  223 × 126 × 230 mm nominal build volume. Part orientation,
                  supports and clearance are reviewed before printing.
                </p>
                <div className="material-chips">
                  <span>Miniatures</span>
                  <span>Models</span>
                  <span>Prototypes</span>
                </div>
                <p>
                  0.02–0.15 mm supported layer heights. Settings are selected
                  for your model; layer height does not guarantee dimensional
                  accuracy.
                </p>
              </div>
            ) : (
              <div className="cnc-panel">
                <span className="eyebrow">CNC ROUTER SERVICES</span>
                <h2>
                  One piece.
                  <br />
                  Your dimensions.
                  <br />
                  Your design.
                </h2>
                <div className="material-chips">
                  <span>MDF</span>
                  <span>Plywood</span>
                  <span>Hardwood</span>
                </div>
                <p>
                  Signs · Engraving · Carving
                  <br />
                  Panels · Components · Custom patterns
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container note-panel">
          <p className="eyebrow">PROJECT PRICING</p>
          <h2>{detail.price}</h2>
          <p>
            {detail.pricing} Applicable taxes and shipping are confirmed in your
            quote.
          </p>
          <p>
            Based in Edmonton, Alberta. Include your location for projects
            elsewhere; shipping is discussed where practical. Timing and pickup
            are arranged for your project.
          </p>
        </div>
        <div className="container detail-columns">
          <div>
            <p className="eyebrow">POSSIBILITIES</p>
            <h2>{s.short}</h2>
            <ul className="check-list">
              {s.applications.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>What to send us</h3>
            <p>{s.bring}</p>
            <h3>
              {s.id === "cad-design" || s.id === "3d-scanning"
                ? "The approach"
                : "Materials & project details"}
            </h3>
            <p>{s.materials}</p>
            <h3>What happens next</h3>
            <p>{s.outcome}</p>
          </div>
        </div>
      </section>
      {s.id === "3d-printing" && (
        <section className="section" id="resin-printing">
          <div className="container detail-columns">
            <div>
              <p className="eyebrow">RESIN 3D PRINTING / EDMONTON</p>
              <h2>Small details. A smoother finish.</h2>
              <p>
                Our Anycubic Photon P1 uses MSLA resin printing to bring fine
                textures, lettering and intricate shapes into focus. A practical
                option for miniatures, figurines, scale models and detailed
                product prototypes.
              </p>
              <ul className="check-list">
                <li>Miniatures, figurines and display pieces</li>
                <li>Detailed prototypes and small enclosures</li>
                <li>Jewelry appearance models and master patterns</li>
                <li>Fine lettering, textures and decorative components</li>
              </ul>
              <p className="small">
                Casting patterns and demanding functional parts require a
                suitable resin and process review. Material and finish are
                agreed before printing.
              </p>
              <QuoteLink service="resin-printing" />
            </div>
            <div className="note-panel">
              <p className="eyebrow">ANYCUBIC PHOTON P1</p>
              <h3>Plan around your part.</h3>
              <p>
                <strong>Nominal build volume: 223 × 126 × 230 mm.</strong>{" "}
                Usable part size depends on orientation, supports and clearance.
              </p>
              <p>
                The printer supports 0.02–0.15 mm layers. We choose settings for
                your model; layer height and screen resolution are not a
                guarantee of finished-part dimensional accuracy.
              </p>
              <h3>Resin or FDM?</h3>
              <p>
                Choose resin for fine detail and smooth surfaces. FDM is often a
                better starting point for larger parts and applications needing
                specific toughness or heat resistance. Tell us how the part will
                be used.
              </p>
              <h3>From $30 CAD per job</h3>
              <p>
                Final pricing reflects resin volume, supports, print
                height/time, washing, curing and cleanup. CAD design, specialty
                resin and additional finishing are quoted separately. Timing and
                pickup are arranged with you.
              </p>
            </div>
          </div>
        </section>
      )}
      <section className="section">
        <div className="container">
          <h2>Planning your project</h2>
          <div className="faq-list">
            {detail.faqs.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
          <h2>Explore related services</h2>
          <div className="button-row">
            {allServices
              .filter((item) => item.id !== s.id && item.id !== "3d-printing")
              .map((item) => (
                <Link
                  className="text-link"
                  key={item.id}
                  to={`/services/${item.id}`}
                >
                  {item.name} <Arrow />
                </Link>
              ))}
          </div>
        </div>
      </section>
      <div className="container note-panel">
        <strong>Not sure what file you need?</strong>
        <p>
          Send us what you have and we’ll help determine the best approach.
          Design and preparation work are discussed as part of your quote.
        </p>
        <QuoteLink service={quoteServiceId(s.id)} />
      </div>
      <Process />
      <CallToAction />
    </>
  );
}

function PrintingLinks() {
  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">TWO WAYS TO PRINT</p>
        <h2>Choose the process for your project.</h2>
        <div className="detail-columns">
          {printingPages.map((s) => (
            <article className="note-panel" key={s.id}>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <Link className="text-link" to={`/services/${s.id}`}>
                Explore {s.name} <Arrow />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
