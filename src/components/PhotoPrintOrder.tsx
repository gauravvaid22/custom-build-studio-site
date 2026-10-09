import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "./Cart";
import { uploadPhoto } from "./LithophaneProduct";
import frames from "../../commerce/photo-frames-source.json";

export function PhotoPrintOrder({ productId }: { productId: string }) {
  const { add } = useCart();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const choose = (candidate?: File) => {
    setAdded(false); setError(""); setFile(null); setPreviewUnavailable(false);
    if (!candidate) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(candidate.type.toLowerCase())) {
      setError("Choose a JPG, PNG, WebP or HEIC photo."); return;
    }
    if (candidate.size === 0 || candidate.size > 25 * 1024 * 1024) {
      setError("Choose a photo between 1 byte and 25 MB."); return;
    }
    setFile(candidate);
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || busy || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return;
    setBusy(true); setProgress(0); setError(""); setAdded(false);
    try {
      const uploaded = await uploadPhoto(file, setProgress);
      const attributes = [
        { key: "Personalization photo", value: new URL(uploaded.referenceUrl, window.location.origin).href },
        { key: "Original filename", value: uploaded.name },
        { key: "Included photo print", value: `One ${frames.photoPrint.widthInches} × ${frames.photoPrint.heightInches} inch photo printed, trimmed and fitted per holder` },
        ...(note.trim() ? [{ key: "Photo instructions", value: note.trim().slice(0, 500) }] : []),
      ];
      if (!add(productId, quantity, attributes)) throw new Error("Unable to add this quantity. Check your cart; the limit is 20 per item.");
      setAdded(true);
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  return <form className="photo-print-order" onSubmit={submit}>
    <div className="photo-print-steps" aria-label="How to personalize"><span>① Choose your holder</span><span>② Upload your photo</span><span>③ We print & fit it</span></div>
    <strong>One photo print included</strong>
    <span>{frames.photoPrint.widthInches} × {frames.photoPrint.heightInches} inches · {frames.photoPrint.widthMm} × {frames.photoPrint.heightMm} mm</span>
    <p className="small">Upload the original photo. We crop and trim it to suit this small desk holder. Example photos shown in the gallery are replaced with yours.</p>
    <label className="photo-print-file">Your photo
      <input type="file" required disabled={busy} accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={event => choose(event.target.files?.[0])} />
      <small>JPG, PNG, WebP or HEIC · up to 25 MB</small>
    </label>
    {preview && !previewUnavailable && <figure className="photo-print-preview"><img src={preview} onError={() => setPreviewUnavailable(true)} alt="Your selected photo; final crop may differ" /><figcaption>Selected photo · final crop may differ</figcaption></figure>}
    {previewUnavailable && <p className="small">Photo selected. This browser cannot display its preview, but you can still upload it.</p>}
    <label>Photo instructions (optional)<textarea rows={2} maxLength={500} disabled={busy} value={note} onChange={event => setNote(event.target.value)} placeholder="Keep both faces in the crop, for example." /></label>
    <label>Quantity<input type="number" min="1" max="20" step="1" required disabled={busy} value={quantity} onChange={event => { setQuantity(Number(event.target.value)); setAdded(false); }} /></label>
    <p className="small">Multiple copies use the same photo. To use a different photo, add another personalized item separately.</p>
    {busy && <p role="status">Attaching your photo… {progress}%</p>}
    {error && <p className="shop-checkout-error" role="alert">{error}</p>}
    <button className="button" disabled={!file || busy} type="submit">{busy ? "Uploading photo…" : "Personalize & add to cart"}</button>
    {added && <div className="shop-added-confirmation" role="status"><strong>Photo attached · added to cart</strong><Link to="/shop/cart">View cart →</Link></div>}
    <p className="small">Your photo is attached to your order through a private, unlisted production reference. Personalized orders are excluded from change-of-mind returns.</p>
  </form>;
}
