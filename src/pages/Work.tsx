import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Gallery from "../components/Gallery";
import {
  CallToAction,
  PageIntro,
  ProjectCard,
  QuoteLink,
} from "../components/Shared";
import projects from "../data/projects.json";
import { services } from "../data/services";

export function Work() {
  const [filter, setFilter] = useState("all");
  const filtered =
    filter === "all"
      ? projects
      : projects.filter((p) => p.services.includes(filter));
  return (
    <>
      <PageIntro
        eyebrow="THE PORTFOLIO"
        title="Proof is in the part."
        description="Real work from Custom Build Studio. Explore custom components, reverse-engineered shapes and practical prototypes."
      />
      <section className="section portfolio-section">
        <div className="container">
          <div className="filter-bar" aria-label="Filter projects">
            <button
              onClick={() => setFilter("all")}
              aria-pressed={filter === "all"}
            >
              All projects <span>{projects.length}</span>
            </button>
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setFilter(s.id)}
                aria-pressed={filter === s.id}
              >
                {s.id === "cad-design"
                  ? "CAD Design"
                  : s.id === "3d-scanning"
                    ? "3D Scanning"
                    : s.id === "3d-printing"
                      ? "3D Printing"
                      : "CNC Woodworking"}
              </button>
            ))}
          </div>
          <p className="small filter-result" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "project" : "projects"}
            {filter !== "all" ? " in this category" : ""}
          </p>
          {filtered.length ? (
            <div className="project-grid">
              {filtered.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  priority={i < 3}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>Have a CNC project in mind?</h2>
              <p>
                There are no CNC woodworking photos in this gallery yet. Explore
                the service and tell us about the sign, panel or custom piece
                you’d like to make.
              </p>
              <Link
                className="button button-dark"
                to="/services/cnc-woodworking"
              >
                Explore CNC Woodworking ↗
              </Link>
            </div>
          )}
        </div>
      </section>
      <CallToAction />
    </>
  );
}
export function ProjectDetail() {
  const { id } = useParams();
  const project = projects.find((p) => p.id === id);
  if (!project) return null;
  const related = projects.filter((p) => p.id !== id).slice(0, 3);
  return (
    <>
      <section className="section project-detail">
        <div className="container">
          <Link className="breadcrumb" to="/work">
            ← Back to our work
          </Link>
          <div className="project-detail-grid">
            <Gallery key={id} images={project.images} title={project.title} />
            <div className="project-detail-copy">
              <p className="eyebrow">FROM THE STUDIO</p>
              <h1>{project.title}</h1>
              <p className="lead">{project.description}</p>
              <dl>
                <div>
                  <dt>Material</dt>
                  <dd>{project.material}</dd>
                </div>
                <div>
                  <dt>Manufacturing</dt>
                  <dd>FDM 3D printing</dd>
                </div>
                <div>
                  <dt>Services</dt>
                  <dd>
                    {project.services.map((s) => (
                      <Link to={`/services/${s}`} key={s}>
                        {services.find((item) => item.id === s)?.name}
                      </Link>
                    ))}
                  </dd>
                </div>
              </dl>
              {id === "caliper-prototype" && (
                <p className="project-note">
                  A geometry and clearance prototype before metal machining. The
                  printed piece is not presented as a road-use brake component.
                </p>
              )}
              <h2>Need something similar?</h2>
              <p>
                Share your dimensions, application and the changes you need.
                Your project will be quoted around its own requirements.
              </p>
              <QuoteLink service={project.services[0]} />
            </div>
          </div>
          {project.videoUrl && (
            <div className="project-video">
              <h2>See the prototype in action</h2>
              <video
                controls
                preload="none"
                poster="/media/venturi-tube-1-960.webp"
                aria-label="Venturi tube demonstration"
              >
                <source src={project.videoUrl} type="video/mp4" />
                Your browser does not support video.{" "}
                <a href={project.videoUrl}>Download the demonstration</a>.
              </video>
              <p>A demonstration of the existing Venturi tube project.</p>
            </div>
          )}
        </div>
      </section>
      <section className="section work-section">
        <div className="container">
          <h2>More from the studio</h2>
          <div className="project-grid">
            {related.map((p) => (
              <ProjectCard project={p} key={p.id} />
            ))}
          </div>
        </div>
      </section>
      <CallToAction />
    </>
  );
}
