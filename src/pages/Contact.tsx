import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { business } from "../data/business";
import { quoteServices } from "../data/services";
import { PageIntro } from "../components/Shared";
import { trackQuote } from "../components/Analytics";

const ALLOWED_EXTENSIONS =
  ".stl,.step,.stp,.iges,.igs,.obj,.3mf,.dxf,.svg,.jpg,.jpeg,.png,.webp,.pdf,.zip";
export const MAX_FILE_BYTES = 7_000_000; // Leave room below Netlify's 8 MB request limit for fields and multipart headers.
const UPLOAD_SLOTS = [1, 2, 3, 4, 5];
export default function Contact() {
  const [params] = useSearchParams();
  const requested = params.get("service") || "";
  const initialService = quoteServices.some((s) => s.id === requested)
    ? requested
    : "";
  const [selectedService, setSelectedService] = useState("");
  const [files, setFiles] = useState([1]);
  useEffect(() => setSelectedService(initialService), [initialService]);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");
  const [bytes, setBytes] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const reportError = (message: string) => {
    setError(message);
    setStatus("error");
    requestAnimationFrame(() => errorRef.current?.focus());
  };
  const countBytes = () => {
    const inputs =
      formRef.current?.querySelectorAll<HTMLInputElement>("input[type=file]");
    let total = 0;
    inputs?.forEach((input) => {
      Array.from(input.files || []).forEach((file) => {
        total += file.size;
      });
    });
    setBytes(total);
    return total;
  };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    // Omit unselected file inputs; each selected file keeps its own Netlify field.
    for (const [name, value] of Array.from(data.entries())) {
      if (value instanceof File && !value.name) data.delete(name);
    }
    if (
      !String(data.get("name")).trim() ||
      !String(data.get("message")).trim()
    ) {
      reportError(
        "Please include your name and a short description of your project.",
      );
      return;
    }
    if (countBytes() > MAX_FILE_BYTES) {
      reportError(
        "Your attachments are over 7 MB in total. Remove a file or add a shared download link below, then send again.",
      );
      return;
    }
    for (const value of data.values()) {
      if (
        value instanceof File &&
        value.size &&
        !ALLOWED_EXTENSIONS.split(",").some((ext) => value.name.toLowerCase().endsWith(ext))
      ) {
        reportError(
          "One attachment uses an unsupported format. Use a listed file type or share a download link.",
        );
        return;
      }
    }
    if (data.get("bot-field")) {
      reportError(
        "Your request could not be sent. Please contact us by email.",
      );
      return;
    }
    data.set(
      "subject",
      `[Custom Build Studio] Quote request from ${String(data.get("name")).trim()}`,
    );
    setError("");
    setStatus("sending");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch("/contact", {
        method: "POST",
        body: data,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("submission-failed");
      trackQuote();
      navigate("/thank-you", { state: { submitted: true } });
    } catch {
      reportError(
        "We couldn’t confirm your request was received. Your details are still here. Please try again, or email custombuildstudio@gmail.com. If the connection timed out, check with us before sending again.",
      );
    } finally {
      window.clearTimeout(timeout);
      setStatus((current) => (current === "sending" ? "idle" : current));
    }
  }
  return (
    <>
      <PageIntro
        eyebrow="START YOUR PROJECT"
        title="Let’s make something."
        description="Tell us what you have in mind. A photo, sketch, file or rough idea is enough to start the conversation."
      />
      <section className="section contact-section">
        <div className="container contact-grid">
          <aside className="contact-aside">
            <p className="eyebrow">A DIRECT CONVERSATION</p>
            <h2>
              Good projects start
              <br />
              with a few details.
            </h2>
            <p>
              No technical file? No problem. Explain what you need and we’ll
              help determine the next step.
            </p>
            <div className="contact-links">
              <a href={`mailto:${business.email}`}>
                <span>Email</span>
                {business.email} ↗
              </a>
              <a href={`tel:${business.telephone}`}>
                <span>Call</span>
                {business.phone} ↗
              </a>
              <div>
                <span>Based in</span>Edmonton, Alberta, Canada
              </div>
            </div>
            <div className="what-next">
              <h3>What happens next?</h3>
              <ol>
                <li>We review your idea and files.</li>
                <li>We clarify the design, material and timing.</li>
                <li>You receive a quote before work begins.</li>
              </ol>
            </div>
            <p className="small">
              Outside Edmonton? Include your location so we can discuss shipping
              where practical.
            </p>
          </aside>
          <form
            suppressHydrationWarning
            ref={formRef}
            className="quote-form"
            name="contact"
            method="POST"
            action="/thank-you"
            encType="multipart/form-data"
            data-netlify="true"
            data-netlify-honeypot="bot-field"
            onSubmit={submit}
          >
            <input type="hidden" name="form-name" value="contact" />
            <input
              type="hidden"
              name="subject"
              value="[Custom Build Studio] Quote request"
            />
            <div className="honeypot" aria-hidden="true">
              <label>
                Leave this field blank
                <input name="bot-field" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <div className="form-heading">
              <h2>Request a quote</h2>
              <p>Fields marked * are required.</p>
            </div>
            <fieldset disabled={status === "sending"}>
              <legend className="sr-only">
                Your contact and project details
              </legend>
              <div className="form-grid">
                <label htmlFor="name">
                  Name *
                  <input
                    id="name"
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </label>
                <label htmlFor="email">
                  Email *
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={200}
                  />
                </label>
                <label htmlFor="phone">
                  Phone <span>(optional)</span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={40}
                  />
                </label>
                <div className="form-field">
                  <label htmlFor="service">Service *</label>
                  <select
                    id="service"
                    name="service"
                    required
                    value={selectedService}
                    onChange={(event) => setSelectedService(event.target.value)}
                  >
                    <option value="" disabled>
                      Select a service
                    </option>
                    {quoteServices.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                    <option value="not-sure">
                      Not sure / multiple services
                    </option>
                  </select>
                </div>
              </div>
              <label htmlFor="message">
                Tell us about your project *
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  maxLength={6000}
                  placeholder="What would you like to make? Include approximate size, how it will be used and anything it needs to fit."
                />
              </label>
              <div className="form-grid">
                <label htmlFor="quantity">
                  Quantity <span>(optional)</span>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    max="1000000"
                    step="1"
                    placeholder="e.g. 1"
                  />
                </label>
                <label htmlFor="material">
                  Material <span>(optional)</span>
                  <input
                    id="material"
                    name="material"
                    maxLength={100}
                    placeholder="Not sure is okay"
                  />
                </label>
                <label htmlFor="deadline">
                  Desired deadline <span>(optional)</span>
                  <input id="deadline" name="deadline" type="date" />
                </label>
                <label htmlFor="location">
                  Location <span>(optional)</span>
                  <input
                    id="location"
                    name="location"
                    autoComplete="address-level2"
                    maxLength={150}
                    placeholder="City / shipping destination"
                  />
                </label>
              </div>
              <fieldset className="upload-box">
                <legend>
                  Photos & files <span>(optional)</span>
                </legend>
                <p id="file-help">
                  Attach up to 5 files, one per attachment (7 MB total).
                  On a phone, choose “Browse” or “Files” to find STEP and STL
                  files. For larger files, use the link field below.
                </p>
                {/* Netlify supports one file per named field. Keep all five
                    fields in static HTML for detection. Do not use multiple or
                    accept: mobile pickers can hide STEP/STL with extension filters. */}
                {UPLOAD_SLOTS.map((id) => (
                  <div className="file-row" key={id} hidden={!files.includes(id)}>
                    <label htmlFor={`file_${id}`}>
                      Attachment {id}
                      <input
                        type="file"
                        id={`file_${id}`}
                        name={`file_${id}`}
                        disabled={!files.includes(id) || status === "sending"}
                        aria-describedby="file-help file-total"
                        onChange={countBytes}
                      />
                    </label>
                    <button type="button" className="file-remove"
                      aria-label={`Remove attachment ${id}`}
                      onClick={() => {
                        const input = formRef.current?.querySelector<HTMLInputElement>(`#file_${id}`);
                        if (input) input.value = "";
                        if (files.length > 1) setFiles((current) => current.filter((slot) => slot !== id));
                        countBytes();
                      }}>×</button>
                  </div>
                ))}
                <div className="upload-bottom">
                  {files.length < UPLOAD_SLOTS.length && (
                    <button className="text-button" type="button" onClick={() => {
                      const next = UPLOAD_SLOTS.find((id) => !files.includes(id))!;
                      setFiles((current) => [...current, next]);
                    }}>+ Add another file</button>
                  )}
                  <span
                    id="file-total"
                    className={
                      bytes > MAX_FILE_BYTES ? "file-size invalid" : "file-size"
                    }
                    aria-live="polite"
                  >
                    {(bytes / 1_000_000).toFixed(1)} / 7 MB
                  </span>
                </div>
              </fieldset>
              <label htmlFor="file-link">
                Shared file link <span>(optional)</span>
                <input
                  id="file-link"
                  name="file-link"
                  type="url"
                  maxLength={2000}
                  placeholder="https://…"
                  aria-describedby="link-help"
                />
                <span className="field-help" id="link-help">
                  A Google Drive, Dropbox or other download link. Make sure we
                  have permission to view it.
                </span>
              </label>
              <details className="additional-notes">
                <summary>Add additional notes</summary>
                <label htmlFor="notes">
                  Anything else we should know?
                  <textarea id="notes" name="notes" rows={3} maxLength={3000} />
                </label>
              </details>
            </fieldset>
            {error && (
              <div
                ref={errorRef}
                tabIndex={-1}
                className="form-error"
                role="alert"
              >
                {error}
              </div>
            )}
            <p className="form-privacy">
              Your details and files are used to review and respond to your
              enquiry. Avoid including sensitive personal documents.{" "}
              <Link to="/privacy">Privacy information</Link>.
            </p>
            <button
              type="submit"
              className="button submit-button"
              disabled={status === "sending"}
            >
              {status === "sending"
                ? "Sending your request…"
                : "Send Quote Request"}
              <span aria-hidden="true">↗</span>
            </button>
            <p className="small form-status" role="status">
              {status === "sending"
                ? "Please keep this page open while your files upload."
                : "No payment is taken with this request."}
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
