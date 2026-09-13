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
      <Process />
      <CallToAction />
    </>
  );
}
export function ServiceDetail() {
  const { id } = useParams();
  const s = services.find((s) => s.id === id);
  if (!s) return null;
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
              <h1>{s.name}</h1>
              <p className="lead">{s.intro}</p>
              <QuoteLink service={s.id} />
            </div>
            {s.image ? (
              <div className="service-detail-photo">
                <Photo src={s.image} alt={s.alt} priority />
                <p>From our project portfolio</p>
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
      <div className="container note-panel">
        <strong>Not sure what file you need?</strong>
        <p>
          Send us what you have and we’ll help determine the best approach.
          Design and preparation work are discussed as part of your quote.
        </p>
        <QuoteLink service={s.id} />
      </div>
      <Process />
      <CallToAction />
    </>
  );
}
