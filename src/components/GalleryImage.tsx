import { ReactNode, useEffect, useRef, useState } from "react";

/** Keep the current photo visible until the selected photo is actually loaded. */
export function GalleryImage({ mediaKey, children }: { mediaKey: string; children: ReactNode }) {
  const [shown, setShown] = useState({ key: mediaKey, content: children });
  const [previous, setPrevious] = useState<ReactNode>(null);
  const [error, setError] = useState("");
  const pending = useRef<HTMLDivElement>(null);
  const latestKey = useRef(mediaKey);
  latestKey.current = mediaKey;
  const waiting = shown.key !== mediaKey;
  const reveal = () => {
    if (!waiting || latestKey.current !== mediaKey) return;
    setPrevious(shown.content); setShown({ key: mediaKey, content: children }); setError("");
  };
  useEffect(() => {
    setError("");
    const image = pending.current?.querySelector("img");
    if (image?.complete && image.naturalWidth > 0) reveal();
  }, [mediaKey]);
  useEffect(() => {
    if (!previous) return;
    const timer = window.setTimeout(() => setPrevious(null), 240);
    return () => clearTimeout(timer);
  }, [previous]);
  return <div className="product-gallery-transition">
    {previous && <div className="gallery-frame gallery-previous" aria-hidden="true">{previous}</div>}
    <div key={shown.key} className={`gallery-frame${previous ? " gallery-arriving" : ""}`}>{shown.content}</div>
    {waiting && <div key={mediaKey} ref={pending} className="gallery-frame gallery-pending" aria-hidden="true" onLoadCapture={reveal} onErrorCapture={() => setError("That photo could not load. Choose another photo or try again.")}>{children}</div>}
    {error && <p className="gallery-error" role="status">{error}</p>}
  </div>;
}
