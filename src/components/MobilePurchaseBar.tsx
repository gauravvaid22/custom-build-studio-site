import { useEffect, useState } from "react";
import { money } from "./Cart";

/** Returns to the same validated purchase form; never creates a parallel cart path. */
export function MobilePurchaseBar({ name, priceCents, targetId, chooseOptions = false }: { name: string; priceCents: number; targetId: string; chooseOptions?: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const form = document.getElementById(targetId);
    if (!form || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom < 0));
    observer.observe(form);
    return () => observer.disconnect();
  }, [targetId, name]);
  if (!visible) return null;
  return <aside className="shop-mobile-purchase" aria-label="Product purchase shortcut">
    <span><strong>{name}</strong><small>{money(priceCents)} CAD</small></span>
    <button type="button" className="button" onClick={() => {
      const form = document.getElementById(targetId) as HTMLFormElement | null;
      if (!form) return;
      form.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      if (!chooseOptions) form.requestSubmit();
      else (form.querySelector('select, input[type="file"], button[type="submit"]') as HTMLElement | null)?.focus({ preventScroll: true });
    }}>{chooseOptions ? "Choose options ↑" : "Add to Cart +"}</button>
  </aside>;
}
