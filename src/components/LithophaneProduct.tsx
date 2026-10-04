import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { money, useCart } from "./Cart";
import { useProductContent } from "./SiteContent";
import { useShopifyCatalog } from "./ShopifyCatalog";

const productId = "lithophane-table-lamp";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const maximumBytes = 25 * 1024 * 1024;

type UploadResult = {
  id: string;
  name: string;
  referenceUrl: string;
};

function StepIcon({ type }: { type: "photo" | "make" | "ship" }) {
  if (type === "photo") return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="6" width="24" height="20" rx="3"/><circle cx="12" cy="13" r="2.5"/><path d="m7 23 6-6 4 4 3-3 5 5"/></svg>;
  if (type === "make") return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4v4M16 24v4M4 16h4M24 16h4M7.5 7.5l3 3M21.5 21.5l3 3M24.5 7.5l-3 3M10.5 21.5l-3 3"/><circle cx="16" cy="16" r="6"/><path d="M13 16h6M16 13v6"/></svg>;
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 10 16 4l12 6-12 6L4 10Z"/><path d="M4 10v12l12 6 12-6V10M16 16v12"/><path d="m22 19 2 2 4-5"/></svg>;
}

async function uploadPhoto(file: File, onProgress: (progress: number) => void) {
  const start = await fetch("/.netlify/functions/shop-media?action=start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose: "customer-photo", name: file.name, type: file.type, size: file.size }),
  });
  const session = await start.json();
  if (!start.ok) throw new Error(session.error || "Unable to start the photo upload.");
  for (let index = 0; index < session.parts; index++) {
    const chunk = file.slice(index * session.chunkBytes, Math.min(file.size, (index + 1) * session.chunkBytes));
    const response = await fetch(
      `/.netlify/functions/shop-media?action=chunk&id=${encodeURIComponent(session.id)}&index=${index}`,
      { method: "POST", headers: { "Content-Type": "application/octet-stream", "X-Upload-Token": session.token }, body: chunk },
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "The photo upload was interrupted.");
    }
    onProgress(Math.round(((index + 1) / session.parts) * 95));
  }
  const complete = await fetch(
    `/.netlify/functions/shop-media?action=complete&id=${encodeURIComponent(session.id)}`,
    { method: "POST", headers: { "Content-Type": "application/json", "X-Upload-Token": session.token }, body: "{}" },
  );
  const result = (await complete.json()) as UploadResult & { error?: string };
  if (!complete.ok) throw new Error(result.error || "Unable to finish the photo upload.");
  onProgress(100);
  return result;
}

export function LithophaneProduct() {
  const product = useProductContent()[productId];
  const { priceFor } = useShopifyCatalog();
  const { add } = useCart();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [tipsOpen, setTipsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const displayedPrice = priceFor(productId, product.priceCents);
  const activeImage = product.images[imageIndex] || product.images[0];
  const details = useMemo(() => product.details.split("\n").filter(Boolean), [product.details]);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const chooseFile = (next?: File) => {
    setError("");
    setAdded(false);
    if (!next) return;
    if (!allowedTypes.has(next.type.toLowerCase())) {
      setError("Use a JPG, PNG, WebP or HEIC image.");
      return;
    }
    if (next.size > maximumBytes) {
      setError("Choose an image no larger than 25 MB.");
      return;
    }
    setFile(next);
  };

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || busy || !product.available) return;
    setBusy(true);
    setProgress(0);
    setError("");
    try {
      const upload = await uploadPhoto(file, setProgress);
      const absoluteReference = new URL(upload.referenceUrl, window.location.origin).href;
      const attributes = [
        { key: "Personalization photo", value: absoluteReference },
        { key: "Original filename", value: upload.name },
        ...(note.trim() ? [{ key: "Photo instructions", value: note.trim().slice(0, 500) }] : []),
      ];
      if (!add(productId, 1, attributes)) throw new Error("Unable to add the lamp to your cart.");
      setAdded(true);
    } catch (uploadError) {
      setError((uploadError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section lithophane-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link> / <Link to="/shop/">Gifts &amp; Décor</Link> / {product.name}
        </nav>
        <div className="lithophane-hero">
          <div className="lithophane-visual-column">
            <div className="lithophane-hero-media is-lit">
              <img src={activeImage.src} alt={activeImage.alt} />
              {activeImage.concept && <span className="lithophane-concept-label">Personalization example</span>}
              <div className="lithophane-glow" aria-hidden="true" />
            </div>
            <div className="lithophane-media-controls">
              <div className="shop-thumbs" aria-label="Product showcase images">
                {product.images.map((image, index) => (
                  <button key={image.id} aria-label={`View product image ${index + 1}`} aria-pressed={imageIndex === index} onClick={() => setImageIndex(index)}>
                    <img src={image.thumb} alt="" width="90" height="90" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="lithophane-summary">
            <p className="eyebrow">PERSONALIZED LIGHTING / MADE IN EDMONTON</p>
            <h1>{product.name}</h1>
            <p className="lithophane-value">Turn your memories into three-dimensional light.</p>
            <p className="lead">{product.description}</p>
            <p className="shop-price">{money(displayedPrice)} <span>CAD</span></p>
            <ul className="shop-purchase-facts" aria-label="Purchase details">
              <li>Wooden warm-white LED base and USB inline switch included</li>
              <li>{product.leadTime}</li>
              <li>Free tracked shipping across Canada</li>
            </ul>
            {!product.available && <p className="lithophane-unavailable" role="status">Temporarily unavailable while new orders are prepared.</p>}
            <form className="lithophane-order" onSubmit={submit}>
              <label
                className={`lithophane-upload ${dragging ? "is-dragging" : ""}`}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={drop}
              >
                <input ref={inputRef} aria-label="Choose a personalization photo" type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => chooseFile(event.target.files?.[0])} />
                <span className="lithophane-upload-icon" aria-hidden="true">↑</span>
                <strong>{file ? file.name : "Drop your photo here"}</strong>
                <small>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · Ready to preview` : "JPG, PNG, WebP or HEIC · up to 25 MB"}</small>
              </label>
              <div className="lithophane-photo-tools">
                <button type="button" className="text-link" onClick={() => setTipsOpen(true)}>Best photo tips</button>
                <span>Ideal: wide 16:9 or panoramic image</span>
              </div>
              {preview && (
                <div className="lithophane-customer-preview">
                  <div className="lithophane-preview-cylinder is-lit" style={{ backgroundImage: `url(${preview})` }} aria-label="Approximate illuminated cylindrical preview of your uploaded photograph" />
                  <div><strong>Approximate wrap preview</strong><small>The final crop and brightness are reviewed before production.</small></div>
                </div>
              )}
              <label className="lithophane-note">Photo instructions or preferred crop (optional)
                <textarea value={note} maxLength={500} rows={3} onChange={(event) => setNote(event.target.value)} placeholder="Example: keep both people centred; crop out the background on the left." />
              </label>
              {busy && <div className="lithophane-progress" role="status"><span style={{ width: `${progress}%` }} /><strong>Securely attaching your photo… {progress}%</strong></div>}
              {error && <p className="shop-checkout-error" role="alert">{error}</p>}
              <button className="button" type="submit" disabled={!file || busy || !product.available}>{busy ? "Uploading photo…" : "Upload photo & add to cart"}</button>
              {added && <div className="shop-added-confirmation" role="status"><strong>Photo attached and lamp added.</strong><Link to="/shop/cart">View cart →</Link></div>}
              <p className="small">Your photo is stored under a private, unlisted reference for production and attached to the Shopify order.</p>
            </form>
          </div>
        </div>

        <section className="lithophane-explainer lithophane-scroll-in">
          <div><p className="eyebrow">THE EFFECT</p><h2>White sculpture by day.<br />A photograph in light.</h2></div>
          <p>Variable wall thickness translates the light and dark values in your photograph into warm gradients. Thicker areas block more light; thinner areas glow brighter, revealing the image when the lamp is switched on.</p>
        </section>

        <section className="lithophane-spec-grid lithophane-scroll-in" aria-label="Product specifications">
          {details.map((detail, index) => <div key={detail}><span>{String(index + 1).padStart(2, "0")}</span><strong>{detail}</strong></div>)}
        </section>

        <section className="lithophane-steps lithophane-scroll-in">
          <div className="section-heading"><div><p className="eyebrow">THREE SIMPLE STEPS</p><h2>From photo to finished light.</h2></div></div>
          <ol>
            <li><span>01</span><div className="lithophane-step-icon"><StepIcon type="photo" /></div><div><strong>Upload your photo</strong><p>Choose a clear, high-contrast image and preview how it wraps around the cylinder.</p></div></li>
            <li><span>02</span><div className="lithophane-step-icon"><StepIcon type="make" /></div><div><strong>Precision production</strong><p>We prepare the crop, manufacture the shade at a fine 0.12 mm layer height, and assemble it with the wooden LED base.</p></div></li>
            <li><span>03</span><div className="lithophane-step-icon"><StepIcon type="ship" /></div><div><strong>Free tracked shipping</strong><p>Every lamp is hand-inspected in Edmonton, then shipped to your door anywhere in Canada at no extra charge.</p></div></li>
          </ol>
        </section>
      </div>

      {tipsOpen && (
        <div className="lithophane-modal-backdrop" role="presentation" onMouseDown={() => setTipsOpen(false)}>
          <section className="lithophane-modal" role="dialog" aria-modal="true" aria-labelledby="photo-tips-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Close photo tips" onClick={() => setTipsOpen(false)}>×</button>
            <p className="eyebrow">PHOTO CHECKLIST</p>
            <h2 id="photo-tips-title">Choose a photo with clear light and shape.</h2>
            <ul>
              <li>Use the original image rather than a screenshot.</li>
              <li>Choose a clear subject with good contrast from the background.</li>
              <li>Wide 16:9 or panoramic photos wrap most naturally around the cylinder.</li>
              <li>Avoid heavy blur, very dark faces, tiny subjects, and important details at the extreme edges.</li>
            </ul>
            <button className="button" type="button" onClick={() => { setTipsOpen(false); inputRef.current?.click(); }}>Choose a photo</button>
          </section>
        </div>
      )}
    </section>
  );
}

export function UploadedPhotoViewer() {
  const [query] = useSearchParams();
  const id = query.get("id") || "";
  const token = query.get("token") || "";
  const [state, setState] = useState<{ url?: string; name?: string; error?: string; progress?: number }>({ progress: 0 });
  useEffect(() => {
    let objectUrl = "";
    (async () => {
      try {
        const base = `/.netlify/functions/shop-media?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
        const manifestResponse = await fetch(`${base}&action=manifest`);
        const manifest = await manifestResponse.json();
        if (!manifestResponse.ok) throw new Error(manifest.error || "Photo not found.");
        const chunks: BlobPart[] = [];
        for (let index = 0; index < manifest.parts; index++) {
          const response = await fetch(`${base}&action=chunk&index=${index}`);
          if (!response.ok) throw new Error("Unable to retrieve this photo.");
          chunks.push(await response.arrayBuffer());
          setState({ name: manifest.name, progress: Math.round(((index + 1) / manifest.parts) * 100) });
        }
        objectUrl = URL.createObjectURL(new Blob(chunks, { type: manifest.type }));
        setState({ url: objectUrl, name: manifest.name, progress: 100 });
      } catch (error) {
        setState({ error: (error as Error).message });
      }
    })();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, token]);
  return <section className="section"><div className="container narrow lithophane-photo-viewer">
    <p className="eyebrow">PRIVATE ORDER PHOTO</p><h1>{state.name || "Personalization photo"}</h1>
    {state.error ? <p role="alert">{state.error}</p> : state.url ? <><img src={state.url} alt="Customer-supplied lithophane production reference"/><a className="button" href={state.url} download={state.name}>Download original photo</a></> : <p role="status">Loading secure photo… {state.progress || 0}%</p>}
    <p className="small">This unlisted page contains customer-supplied production material. Keep the link private.</p>
  </div></section>;
}
