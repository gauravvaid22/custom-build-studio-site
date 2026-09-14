import { Link, useLocation } from "react-router-dom";
import {
  CallToAction,
  FAQ,
  PageIntro,
  Photo,
  Process,
  QuoteLink,
} from "../components/Shared";
import Gallery from "../components/Gallery";
import { business, verifiedReviews } from "../data/business";

export function About() {
  return (
    <>
      <PageIntro
        eyebrow="CUSTOM BUILD STUDIO / EDMONTON"
        title="A practical place for your ideas."
        description="Design and fabrication, connected. We help people turn a need, a sketch or an existing part into something they can use."
      />
      <section className="section">
        <div className="container studio-grid">
          <div className="studio-photo">
            <Photo
              src="/images/work/custom-mouse-1.jpg"
              alt="Custom ASA-CF mouse shell made at Custom Build Studio"
              priority
            />
          </div>
          <div className="studio-copy">
            <p className="eyebrow">THE WAY WE WORK</p>
            <h2>
              Understand it.
              <br />
              Design it. Make it.
            </h2>
            <p>
              Custom Build Studio is an owner-operated design and fabrication
              business in Edmonton, Alberta. You work directly with the studio
              to discuss the purpose, dimensions and practical requirements of
              your project.
            </p>
            <p>
              Our services bring together FDM and resin 3D printing, CAD
              modeling, 3D scanning and CNC woodworking. That means help with
              both the digital design and the physical piece, without expecting
              you to arrive with every technical decision already made.
            </p>
            <p>
              From a replacement component to a personalized sign, we welcome
              one-off projects and small production runs.
            </p>
            <QuoteLink />
          </div>
        </div>
      </section>
      <Process />
      <FAQ />
      <CallToAction />
    </>
  );
}
export function Pricing() {
  const rates = [
    {
      title: "FDM 3D Printing",
      price: "From $20",
      label: "Minimum job charge",
      description:
        "The quote depends on size, material, print time and part complexity.",
      items: [
        "One-off parts & small runs",
        "Design preparation quoted if needed",
        "Material and quantity reviewed first",
      ],
      service: "3d-printing",
    },
    {
      title: "Resin 3D Printing",
      price: "From $30",
      label: "Minimum job charge · CAD",
      description:
        "Fine-detail models and prototypes. Resin volume, supports, print height/time, washing and curing shape the final quote.",
      items: [
        "Miniatures, display models & detailed parts",
        "Resin type and colour confirmed first",
        "Design, specialty resin & extra finishing quoted separately",
      ],
      service: "resin-printing",
    },
    {
      title: "CAD Design & Scanning",
      price: "$75 / hour",
      label: "Design & reverse engineering",
      description:
        "Simple parts may be quoted at a fixed fee once the scope is clear.",
      items: [
        "Modeling & geometry cleanup",
        "Scanning suitability reviewed",
        "File formats agreed for your project",
      ],
      service: "cad-design",
    },
    {
      title: "CNC Woodworking",
      price: "From $100",
      label: "Project-based quotes",
      description:
        "Material, setup, routing time and any design or finishing work shape the quote.",
      items: [
        "Signs, panels & custom components",
        "MDF, plywood & hardwood projects",
        "One-off pieces welcome",
      ],
      service: "cnc-woodworking",
    },
  ];
  return (
    <>
      <PageIntro
        eyebrow="PROJECT PRICING"
        title="A clear quote. Before we build."
        description="Every custom project is different. These starting points help you plan; we confirm the scope and final price with you before work begins."
      />
      <section className="section">
        <div className="container">
          <p className="small pricing-note">
            Prices in CAD. Final pricing, applicable taxes, shipping and any
            extra design or finishing work are confirmed in your quote.
          </p>
          <div className="pricing-grid">
            {rates.map((r) => (
              <article className="price-card" key={r.title}>
                <h2>{r.title}</h2>
                <p className="price">{r.price}</p>
                <p className="price-label">{r.label}</p>
                <p>{r.description}</p>
                <ul className="check-list">
                  {r.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                <QuoteLink service={r.service} className="button-dark" />
              </article>
            ))}
          </div>
          <div className="note-panel">
            <h2>What makes a quote more accurate?</h2>
            <p>
              Include dimensions, quantity, how the part will be used, your
              preferred deadline and any available files or photos. Not sure
              about material? We can discuss it.
            </p>
            <h3>Need consulting or troubleshooting?</h3>
            <p>
              Ask about material selection, design for manufacturing or process
              questions. Consulting is quoted around your requirements.
            </p>
          </div>
        </div>
      </section>
      <FAQ />
      <CallToAction />
    </>
  );
}
export function Products() {
  const title = "MagSafe & Apple Watch charging stand";
  const images = Array.from({ length: 8 }, (_, i) => ({
    src: `/images/PRODUCTS/IPHONE_MAGSAFE_HOLDER/PHOTO${i + 1}.jpg`,
    alt: `MagSafe and Apple Watch charging stand — product photograph ${i + 1}`,
  }));
  return (
    <>
      <PageIntro
        eyebrow="FROM THE STUDIO / PRODUCTS"
        title="Made for everyday use."
        description="A small collection of studio-designed pieces. Contact us to confirm colour, availability and shipping before ordering."
      />
      <section className="section">
        <div className="container product-layout">
          <Gallery images={images} title={title} />
          <div className="product-info">
            <p className="eyebrow">PETG · MADE TO ORDER</p>
            <h2>{title}</h2>
            <p className="price">
              $36.00 <span>CAD</span>
            </p>
            <p>
              A compact holder that brings your iPhone and Apple Watch chargers
              together, keeping your desk or bedside table organized.
            </p>
            <ul className="check-list">
              <li>Holds MagSafe and Apple Watch chargers</li>
              <li>Integrated cable organization</li>
              <li>Printed in durable PETG</li>
              <li>Custom colour requests welcome</li>
            </ul>
            <p className="product-note">
              Chargers and devices are not included. Confirm charger fit,
              colour, delivery cost and applicable taxes when ordering.
            </p>
            <a
              className="button"
              href={`mailto:${business.email}?subject=${encodeURIComponent("Product enquiry: " + title)}&body=${encodeURIComponent("Hello Custom Build Studio,\n\nI am interested in the charging stand.\nQuantity:\nPreferred colour:\nShipping location:\nCharger model:\n\nPlease confirm availability and the total price. Thank you.")}`}
            >
              Enquire About This Product ↗
            </a>
            <p className="small">
              Shipping from Canada. Payment details are confirmed directly after
              your order is agreed.
            </p>
          </div>
        </div>
      </section>
      <CallToAction />
    </>
  );
}
export function Reviews() {
  return (
    <>
      <PageIntro
        eyebrow="CUSTOMER FEEDBACK"
        title="Confidence starts with real work."
        description="Explore the project portfolio and talk directly with us about the design, material and approach for your own project."
      />
      <section className="section">
        <div className="container narrow">
          <div className="note-panel">
            <h2>Hear from our customers.</h2>
            <p>
              Read customer feedback on our public Google Business Profile, or
              share your experience if we’ve worked on a project together.
            </p>
            <a
              className="button button-dark"
              href={business.googleProfile}
              target="_blank"
              rel="noreferrer"
            >
              Read Our Google Reviews ↗
            </a>
          </div>
          {verifiedReviews.length ? (
            verifiedReviews.map((r) => (
              <blockquote key={r.source}>
                <p>{r.text}</p>
                <footer>
                  {r.name} ·{" "}
                  <a href={r.source} target="_blank" rel="noreferrer">
                    Read the original review ↗
                  </a>
                </footer>
              </blockquote>
            ))
          ) : (
            <div className="note-panel">
              <h2>See what goes into a project.</h2>
              <p>
                Our portfolio shows actual parts and prototypes, with materials
                and project details. If you have a similar challenge, we’re
                happy to discuss it.
              </p>
              <Link className="button button-dark" to="/work">
                Explore Our Work ↗
              </Link>
            </div>
          )}
          <h2>Worked with us?</h2>
          <p>
            We’d welcome your feedback.{" "}
            <a className="inline-link" href={`mailto:${business.email}`}>
              Contact the studio
            </a>{" "}
            to share your experience.
          </p>
        </div>
      </section>
      <CallToAction />
    </>
  );
}
export function Privacy() {
  return (
    <>
      <PageIntro
        eyebrow="YOUR ENQUIRY"
        title="Privacy information"
        description="How information submitted through this website is used."
      />
      <section className="section">
        <div className="container narrow prose">
          <h2>Project enquiries</h2>
          <p>
            The quote form collects your name, email, project description and
            any optional contact details, files and project information you
            choose to provide. Custom Build Studio uses this information to
            review your request, prepare a quote and communicate about your
            project.
          </p>
          <h2>Form processing</h2>
          <p>
            The website is hosted on Netlify. Form submissions and uploads are
            processed through Netlify Forms. Please share only files needed to
            discuss your project and avoid uploading sensitive personal
            documents. For large project files, you can provide a download link
            and control access through your file-sharing service.
          </p>
          <h2>Website analytics</h2>
          <p>
            We measure quote starts and clicks on the business phone link as
            well as successful requests. Campaign tags and advertising click
            identifiers may be retained in session storage for the current
            browser tab so a later quote can be attributed to its advertising
            visit.
          </p>
          <p>
            The production website uses Google Analytics and Google Ads tags to
            measure site visits and quote-request conversions. These services
            may use cookies and process technical information about your visit.
            Your form field values and uploaded files are not included in the
            analytics events sent by this website.
          </p>
          <h2>Questions about your information</h2>
          <p>
            To ask about information you have sent or request its deletion,
            contact <a href={`mailto:${business.email}`}>{business.email}</a>.
          </p>
        </div>
      </section>
    </>
  );
}
export function ThankYou() {
  const location = useLocation();
  const submitted = location.state?.submitted;
  return (
    <section className="section success-section">
      <div className="container narrow">
        <p className="eyebrow">
          {submitted ? "REQUEST RECEIVED" : "CUSTOM BUILD STUDIO"}
        </p>
        <h1>
          {submitted
            ? "Thank you. Let’s take the next step."
            : "Thanks for getting in touch."}
        </h1>
        <p className="lead">
          {submitted
            ? "Your project details have been sent. We’ll review your request and respond using the contact details you provided."
            : "If you submitted a quote request, we’ll review your details and get in touch. Have another question? Contact the studio directly."}
        </p>
        <div className="note-panel">
          <h2>What happens next?</h2>
          <p>
            We’ll discuss the design, materials and timing, then confirm a quote
            before starting work.
          </p>
          <p>
            Need to add something? Email{" "}
            <a className="inline-link" href={`mailto:${business.email}`}>
              {business.email}
            </a>
            .
          </p>
        </div>
        <Link className="button button-dark" to="/work">
          Explore Our Work ↗
        </Link>
      </div>
    </section>
  );
}
export function NotFound() {
  return (
    <section className="section success-section">
      <div className="container narrow">
        <p className="eyebrow">404 / PAGE NOT FOUND</p>
        <h1>Let’s get you back on track.</h1>
        <p className="lead">
          This page isn’t here. Explore our services or tell us about the
          project you have in mind.
        </p>
        <div className="button-row">
          <Link className="button button-dark" to="/">
            Back to Home
          </Link>
          <QuoteLink />
        </div>
      </div>
    </section>
  );
}
