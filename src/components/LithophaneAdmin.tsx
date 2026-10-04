import { DragEvent, FormEvent, useRef, useState } from "react";
import type { ProductContent } from "./SiteContent";

type LampContent = ProductContent["lithophane-table-lamp"];

async function resizeForShowcase(file: File) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type))
    throw new Error("Showcase photos must be JPG, PNG or WebP.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.88;
  let blob: Blob | null = null;
  do {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    quality -= 0.08;
  } while (blob && blob.size > 3.8 * 1024 * 1024 && quality >= 0.55);
  if (!blob || blob.size > 4 * 1024 * 1024)
    throw new Error("This photo could not be optimized below 4 MB. Resize it and try again.");
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
}

async function uploadShowcase(file: File, key: string) {
  const optimized = await resizeForShowcase(file);
  const auth = { Authorization: "Bearer " + key };
  const start = await fetch("/.netlify/functions/shop-media?action=start", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ purpose: "showcase", name: optimized.name, type: optimized.type, size: optimized.size }),
  });
  const session = await start.json();
  if (!start.ok) throw new Error(session.error || "Unable to start image upload.");
  const part = await fetch(`/.netlify/functions/shop-media?action=chunk&id=${session.id}&index=0`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream", "X-Upload-Token": session.token, ...auth },
    body: optimized,
  });
  if (!part.ok) throw new Error((await part.json().catch(() => ({}))).error || "Unable to upload image.");
  const complete = await fetch(`/.netlify/functions/shop-media?action=complete&id=${session.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Upload-Token": session.token, ...auth },
    body: "{}",
  });
  const result = await complete.json();
  if (!complete.ok) throw new Error(result.error || "Unable to finish image upload.");
  return { id: result.id, src: result.referenceUrl, thumb: result.referenceUrl, alt: "Custom Cylindrical Lithophane Table Lamp showcase photograph", concept: false };
}

export function LithophaneAdmin({ adminKey, initial, onSaved }: { adminKey: string; initial: LampContent; onSaved: (value: LampContent) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [product, setProduct] = useState<LampContent>(initial);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true); setMessage(""); setError("");
    try {
      const next = [...product.images];
      for (const file of Array.from(files)) {
        if (next.length >= 12) throw new Error("The gallery supports up to 12 images.");
        next.push(await uploadShowcase(file, adminKey));
      }
      setProduct({ ...product, images: next });
      setMessage("Photos uploaded. Save product changes to publish the new gallery order.");
    } catch (uploadError) {
      setError((uploadError as Error).message);
    } finally { setUploading(false); }
  };

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault(); setDragging(false); void uploadFiles(event.dataTransfer.files);
  };
  const move = (from: number, to: number) => {
    const images = [...product.images];
    const [image] = images.splice(from, 1); images.splice(to, 0, image);
    setProduct({ ...product, images });
  };
  const remove = (index: number) => {
    if (product.images.length <= 1) { setError("Keep at least one showcase image."); return; }
    setProduct({ ...product, images: product.images.filter((_, itemIndex) => itemIndex !== index) });
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setMessage(""); setError("");
    try {
      const response = await fetch("/.netlify/functions/shop?action=save-product-content", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + adminKey },
        body: JSON.stringify({ product }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save product.");
      const saved = result.productContent["lithophane-table-lamp"] as LampContent;
      setProduct(saved); onSaved(saved);
      setMessage("Product saved. The public product page will show these changes on refresh.");
    } catch (saveError) { setError((saveError as Error).message); }
  };

  return <form className="quote-form shop-admin-settings lithophane-admin" onSubmit={save}>
    <div className="section-heading"><div><p className="eyebrow">PERSONALIZED PRODUCT CMS</p><h2>Lithophane Table Lamp</h2></div><p>Manage the public product copy, availability and showcase gallery. Name and price changes also sync to Shopify when the Admin API token is configured.</p></div>
    <div className="shop-admin-field-grid">
      <label>Product name<input value={product.name} maxLength={120} required onChange={(event) => setProduct({ ...product, name: event.target.value })}/></label>
      <label>Base price (CAD)<input type="number" min="1" step="0.01" required value={product.priceCents / 100} onChange={(event) => setProduct({ ...product, priceCents: Math.round(Number(event.target.value) * 100) })}/></label>
      <label>Lead time<input value={product.leadTime} maxLength={180} required onChange={(event) => setProduct({ ...product, leadTime: event.target.value })}/></label>
      <label className="lithophane-admin-toggle"><input type="checkbox" checked={product.available} onChange={(event) => setProduct({ ...product, available: event.target.checked })}/> Available to order</label>
    </div>
    <label>Description<textarea rows={5} maxLength={1200} required value={product.description} onChange={(event) => setProduct({ ...product, description: event.target.value })}/></label>
    <label>Specifications and manufacturing notes <span className="small">One line per detail.</span><textarea rows={7} maxLength={2000} required value={product.details} onChange={(event) => setProduct({ ...product, details: event.target.value })}/></label>
    <section className="lithophane-admin-gallery">
      <div><p className="eyebrow">SHOWCASE GALLERY</p><h3>Primary image and gallery order</h3><p>The first image is the hero image. Upload real product photos to replace the labeled concept visuals.</p></div>
      <label className={`lithophane-admin-drop ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
        <input ref={inputRef} aria-label="Choose product showcase photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => event.target.files && void uploadFiles(event.target.files)}/>
        <strong>{uploading ? "Optimizing and uploading…" : "Drop product photos or choose files"}</strong><small>JPG, PNG or WebP · automatically optimized · up to 12 images</small>
      </label>
      <div className="lithophane-admin-images">
        {product.images.map((image, index) => <article key={image.id}>
          <img src={image.thumb} alt={image.alt}/><div><strong>{index === 0 ? "Primary / hero" : `Gallery ${index + 1}`}</strong>{image.concept && <small>Concept preview</small>}</div>
          <div className="lithophane-admin-image-actions">
            {index > 0 && <button type="button" className="text-link" onClick={() => move(index, 0)}>Set primary</button>}
            {index > 0 && <button type="button" className="text-link" onClick={() => move(index, index - 1)}>Move up</button>}
            {index < product.images.length - 1 && <button type="button" className="text-link" onClick={() => move(index, index + 1)}>Move down</button>}
            <button type="button" className="text-link" onClick={() => remove(index)}>Delete</button>
          </div>
        </article>)}
      </div>
    </section>
    <button className="button" disabled={uploading}>{uploading ? "Uploading…" : "Save product changes"}</button>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </form>;
}
