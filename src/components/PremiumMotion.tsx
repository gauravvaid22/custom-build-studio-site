import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useShopMerchandising } from "./SiteContent";
import "../motion.css";

/** Progressive enhancement: content stays visible even without observers or JS. */
export function PremiumMotion() {
  const { pathname } = useLocation();
  const { decorativeMotion } = useShopMerchandising();
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cleanup = () => {};
    const start = () => {
      cleanup();
      if (preference.matches || !("IntersectionObserver" in window)) return;
      main.classList.add("premium-motion");
      main.classList.toggle("decorative-motion", decorativeMotion);
      const targets = new Set<HTMLElement>();
      const selector = ".home-shop-copy, .home-shop-gallery, .service-card, .project-card, .studio-photo, .studio-copy, .process-grid li, .section-heading, .shop-collection-card, .shop-grid > .shop-card, .halloween-product-reveal, .shop-studio-proof, .lithophane-scroll-in, .process-illustration, .shop-campaign-hero";
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("motion-entered");
        observer.unobserve(entry.target);
      }), { threshold: 0.08 });
      const scan = () => main.querySelectorAll<HTMLElement>(selector).forEach(target => {
        if (targets.has(target)) return;
        targets.add(target);
        target.classList.add("motion-target");
        target.style.setProperty("--motion-order", String(Math.min(Array.from(target.parentElement?.children || []).indexOf(target), 3)));
        // Never delay content already visible or above the current scroll position.
        if (target.getBoundingClientRect().top < innerHeight * .92) target.classList.add("motion-entered");
        else observer.observe(target);
      });
      scan();
      const mutations = new MutationObserver(scan);
      mutations.observe(main, { childList: true, subtree: true });
      const visibility = () => main.classList.toggle("motion-tab-hidden", document.hidden);
      document.addEventListener("visibilitychange", visibility);
      visibility();
      cleanup = () => {
        observer.disconnect(); mutations.disconnect();
        document.removeEventListener("visibilitychange", visibility);
        main.classList.remove("premium-motion", "decorative-motion", "motion-tab-hidden");
        targets.forEach(target => { target.classList.remove("motion-target", "motion-entered"); target.style.removeProperty("--motion-order"); });
      };
    };
    start(); preference.addEventListener("change", start);
    return () => { cleanup(); preference.removeEventListener("change", start); };
  }, [pathname, decorativeMotion]);
  return null;
}
