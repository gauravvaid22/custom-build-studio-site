import { useEffect, useRef, useState } from "react";
import { Photo } from "./Shared";

export default function Gallery({
  images,
  title,
}: {
  images: { src: string; alt: string }[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  const change = (delta: number) =>
    setIndex((current) => (current + delta + images.length) % images.length);
  return (
    <div className="gallery">
      <button
        className="gallery-main"
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
        aria-label={`Enlarge image — ${title}, photograph ${index + 1}`}
      >
        <Photo src={images[index].src} alt={images[index].alt} priority />
        <span>Enlarge image ↗</span>
      </button>
      {images.length > 1 && (
        <div className="thumbnails" aria-label="Project photographs">
          {images.map((im, i) => (
            <button
              key={im.src}
              onClick={() => setIndex(i)}
              aria-label={`Show photograph ${i + 1} of ${images.length}`}
              aria-pressed={index === i}
            >
              <Photo src={im.src} alt="" sizes="90px" />
            </button>
          ))}
        </div>
      )}
      <dialog
        ref={dialog}
        className="lightbox"
        aria-label={`${title} photographs`}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            change(1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            change(-1);
          }
          if (e.key === "Tab") {
            const buttons = [
              ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              ),
            ];
            const first = buttons[0],
              last = buttons[buttons.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="lightbox-inner">
          <button
            className="lightbox-close"
            onClick={() => dialog.current?.close()}
            autoFocus
          >
            Close ×
          </button>
          {open && (
            <Photo
              src={images[index].src}
              alt={images[index].alt}
              priority
              sizes="95vw"
            />
          )}
          <div className="lightbox-controls">
            <button
              onClick={() => change(-1)}
              disabled={images.length === 1}
              aria-label="Previous photograph"
            >
              ←
            </button>
            <p aria-live="polite">
              {index + 1} / {images.length} · {title}
            </p>
            <button
              onClick={() => change(1)}
              disabled={images.length === 1}
              aria-label="Next photograph"
            >
              →
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
