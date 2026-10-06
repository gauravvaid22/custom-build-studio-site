import { Link, useParams } from "react-router-dom";
import {
  Arrow,
  CallToAction,
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
import { useSiteContent, wholeDollars } from "../components/SiteContent";

function ServiceStartIcon({ type }: { type: "file" | "part" | "idea" | "wood" }) {
  const paths = {
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 12h6M9 16h5"/></>,
    part: <><path d="m4 8 8-5 8 5v9l-8 5-8-5zM4 8l8 5 8-5M12 13v9"/><circle cx="12" cy="8" r="2"/></>,
    idea: <><path d="M8 14c-1.4-1.2-2-2.6-2-4.2a6 6 0 0 1 12 0c0 1.6-.6 3-2 4.2-.8.7-1 1.2-1 2H9c0-.8-.2-1.3-1-2ZM9 19h6M10 22h4"/></>,
    wood: <><path d="M4 5h16v14H4zM8 5v14M15 5v14M4 11h16M11 8c1 1 1 2 0 3M18 13c-1 1-1 2 0 3"/></>,
  };
  return <svg className="service-start-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export function Services() {
  return (
    <>
      <section className="page-intro service-page-intro">
        <div className="container service-intro-layout">
          <div>
            <p className="eyebrow">CAPABILITIES / EDMONTON, ALBERTA</p>
            <h1>What do you want to make?</h1>
            <p className="lead">A ready-to-print file or a rough idea. A single piece or a small run. We help turn the starting point you have into the result you need.</p>
          </div>
          <div className="service-intro-graphic" aria-hidden="true">
            <span className="service-graphic-index">CBS / DESIGN → BUILD</span>
            <svg viewBox="0 0 440 320" fill="none" role="presentation">
              <path className="service-graphic-ghost" d="M91 101h179l77 58v96H168l-77-58v-96Z" />
              <path className="service-graphic-shell" d="M107 85h179l61 74v80H168l-61-58V85Z" />
              <path className="service-graphic-face" d="M107 85h179l61 74H168l-61-74Z" />
              <path className="service-graphic-edge" d="M168 159v80M347 159v80M107 85v96l61 58" />
              <circle className="service-graphic-hole" cx="229" cy="121" r="28" />
              <circle className="service-graphic-hole-inner" cx="229" cy="121" r="14" />
              <path className="service-graphic-measure" d="M102 59h188M102 52v14M290 52v14M370 157v84M363 157h14M363 241h14M78 82v102M71 82h14M71 184h14" />
              <circle className="service-graphic-point" cx="107" cy="85" r="4" />
              <circle className="service-graphic-point" cx="347" cy="159" r="4" />
            </svg>
            <span className="service-graphic-caption">A starting point can become a finished part.</span>
          </div>
        </div>
      </section>
      <section className="section service-start-section" aria-labelledby="service-start-title">
        <div className="container">
          <p className="eyebrow">START WHERE YOU ARE</p>
          <h2 id="service-start-title">What do you have in hand?</h2>
          <div className="service-start-grid">
            <Link to="/services/3d-printing"><ServiceStartIcon type="file"/><strong>A file to make</strong><small>STL, STEP or an existing design</small><Arrow /></Link>
            <Link to="/services/3d-scanning"><ServiceStartIcon type="part"/><strong>A part to recreate</strong><small>Broken, discontinued or custom-fit</small><Arrow /></Link>
            <Link to="/services/cad-design"><ServiceStartIcon type="idea"/><strong>An idea or sketch</strong><small>Get it designed for production</small><Arrow /></Link>
            <Link to="/services/cnc-woodworking"><ServiceStartIcon type="wood"/><strong>A wood project</strong><small>Signs, panels, carving and more</small><Arrow /></Link>
          </div>
          <p>Not sure which service fits? <Link to="/contact">Send us what you have ↗</Link></p>
        </div>
      </section>
      <PrintingLinks />
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
  const content = useSiteContent();
  const { id } = useParams();
  const s = allServices.find((s) => s.id === id);
  if (!s) return null;
  const detail = serviceDetails[s.id];
  const displayedPrice =
    s.id === "3d-printing"
      ? `FDM from ${wholeDollars(content.fdmStartingPriceCents)} · Resin from ${wholeDollars(content.resinStartingPriceCents)} CAD`
      : s.id === "fdm-3d-printing"
        ? `From ${wholeDollars(content.fdmStartingPriceCents)} CAD per job`
        : s.id === "resin-3d-printing"
          ? `From ${wholeDollars(content.resinStartingPriceCents)} CAD per job`
          : s.id === "cad-design"
            ? `${wholeDollars(content.cadHourlyRateCents)} CAD / hour`
            : s.id === "3d-scanning"
              ? `${wholeDollars(content.scanningHourlyRateCents)} CAD / hour`
              : `From ${wholeDollars(content.cncStartingPriceCents)} CAD per project`;
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
                  {content.resinBuildVolume} nominal build volume. Part orientation,
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
      {s.id === "3d-printing" && <PrintingLinks />}
      {(s.id === "3d-printing" || s.id === "fdm-3d-printing") && <FdmCapabilities />}
      <section className="section">
        <div className="container note-panel">
          <p className="eyebrow">PROJECT PRICING</p>
          <h2>{displayedPrice}</h2>
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
                <strong>Nominal build volume: {content.resinBuildVolume}.</strong>{" "}
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
              <h3>From {wholeDollars(content.resinStartingPriceCents)} CAD per job</h3>
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
  const content = useSiteContent();
  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">TWO WAYS TO PRINT</p>
        <h2>Choose the process for your project.</h2>
        <div className="detail-columns">
          {printingPages.map((s) => (
            <article className="note-panel" key={s.id}>
              <h3>{s.name}</h3>
              <p><strong>{s.id === "fdm-3d-printing" ? "Functional parts · Engineering filaments" : "Fine detail · Miniatures & display models"}</strong></p>
              <p className="print-volume">{s.id === "fdm-3d-printing" ? content.fdmBuildVolume : content.resinBuildVolume}</p>
              <p className="small">Maximum build envelope · usable part size depends on orientation and supports.</p>
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

function FdmCapabilities() {
  const content = useSiteContent();
  return <section className="section fdm-capabilities" id="fdm-printing">
    <div className="container detail-columns">
      <div>
        <p className="eyebrow">FDM 3D PRINTING / ENGINEERING MATERIALS</p>
        <h2>Room for bigger ideas.<br />Materials for real work.</h2>
        <p>From a replacement bracket to a workshop fixture, enclosure or functional prototype, choose FDM when your part needs to do a job. We help match the filament and print orientation to how it will be used.</p>
        <div className="fdm-size"><span className="eyebrow">MAXIMUM BUILD ENVELOPE</span><p className="print-volume">{content.fdmBuildVolume}</p><p>Width × depth × height</p><p className="small">Available part size depends on material, orientation, supports and clearance. Send your model and dimensions so we can confirm the fit.</p></div>
        <QuoteLink service="3d-printing">Request an FDM Quote</QuoteLink>
      </div>
      <div className="note-panel">
        <p className="eyebrow">MORE THAN STANDARD FILAMENT</p>
        <h3>Engineering filament options</h3>
        <p>Carbon-fibre and glass-fibre reinforced options, nylon and other engineering polymers for projects with specific stiffness, heat or service requirements.</p>
        <div className="fdm-materials">{["ASA-CF", "PET-CF", "PA12", "PA12-GF", "PA12-CF", "PPS-CF"].map(material => <span key={material}>{material}</span>)}</div>
        <h3>Everyday & versatile materials</h3>
        <p>PLA · PETG · ABS · ASA · TPU</p>
        <p className="small">CF means carbon fibre; GF means glass fibre. Material grade, availability and suitability are confirmed with your quote. Tell us about load, heat, outdoor exposure, flexibility and mating parts.</p>
        <Link className="text-link" to="/work/gear-mount">See a real engineering-material project <Arrow /></Link>
      </div>
    </div>
  </section>;
}
