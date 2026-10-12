import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import products from "../data/catalog";
import collections from "../../commerce/collections.json";
import { subcollections } from "../lib/shopDiscovery";
import "../shop-category-navigation.css";

type CategoryLink = { id: string; label: string; sale?: boolean };
const contextKey = "cbs-shop-browsing-category";

function directCategory(pathname: string, links: CategoryLink[]) {
  const destination = pathname.split("/").filter(Boolean)[1];
  if (!destination || destination === "all") return "all";
  if (links.some(link => link.id === destination)) return destination;
  return Object.entries(subcollections).find(([, children]) => children.includes(destination))?.[0]
    || (destination === "halloween-special" ? "seasonal" : null);
}

function productCategories(pathname: string, links: CategoryLink[]) {
  const destination = pathname.split("/").filter(Boolean)[1];
  const product = products.find(item => item.id === destination);
  if (!product) return [];
  const parentId = product.listingGroup || product.variantOf || product.id;
  return links.filter(link => collections.some(collection => collection.id === link.id
    && collection.kind === "department" && collection.products.includes(parentId))).map(link => link.id);
}

/** Shared navigation: route-aware selection and decorative motion confined to each link. */
export function ShopCategoryNavigation({ links }: { links: CategoryLink[] }) {
  const { pathname } = useLocation();
  const track = useRef<HTMLDivElement>(null);
  const [browsingCategory, setBrowsingCategory] = useState<string | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const explicitCategory = directCategory(pathname, links);
  const candidates = productCategories(pathname, links);
  const activeCategory = explicitCategory || (browsingCategory && candidates.includes(browsingCategory)
    ? browsingCategory : candidates[0]);
  const signature = links.map(link => link.id).join(",");

  useEffect(() => {
    try {
      if (explicitCategory) {
        sessionStorage.setItem(contextKey, explicitCategory);
        setBrowsingCategory(explicitCategory);
      } else setBrowsingCategory(sessionStorage.getItem(contextKey));
    } catch { /* Navigation remains usable when browser storage is unavailable. */ }
  }, [pathname, explicitCategory]);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const updateEdges = () => {
      const start = element.scrollLeft > 8;
      const end = element.scrollWidth - element.clientWidth - element.scrollLeft > 8;
      setEdges(previous => previous.start === start && previous.end === end ? previous : { start, end });
    };
    const revealSelection = () => {
      const active = element.querySelector<HTMLElement>("[aria-current]");
      if (active && element.scrollWidth > element.clientWidth) {
        const linkBounds = active.getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        if (linkBounds.left < bounds.left + 12 || linkBounds.right > bounds.right - 12) {
          element.scrollTo({ left: element.scrollLeft + linkBounds.left - bounds.left
            - (element.clientWidth - linkBounds.width) / 2, behavior: "instant" });
        }
      }
      updateEdges();
    };
    revealSelection();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(revealSelection) : null;
    observer?.observe(element);
    element.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", revealSelection);
    return () => {
      observer?.disconnect();
      element.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", revealSelection);
    };
  }, [activeCategory, signature]);

  const followPointer = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    // CSS variables avoid React renders on every pointer movement.
    event.currentTarget.style.setProperty("--category-pointer-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--category-pointer-y", `${event.clientY - bounds.top}px`);
  };

  return <div className={`shop-category-navigation${edges.start ? " can-scroll-start" : ""}${edges.end ? " can-scroll-end" : ""}`}>
    <div className="shop-nav-collections" ref={track}>
      {links.map(link => <Link key={link.id} to={`/shop/${link.id}`}
        className={`shop-category-link${link.sale ? " shop-sale-nav-link" : ""}`}
        aria-current={activeCategory === link.id ? (pathname.replace(/\/$/, "") === `/shop/${link.id}` ? "page" : "location") : undefined}
        onPointerEnter={followPointer} onPointerMove={followPointer}>
        <span>{link.label}</span>
      </Link>)}
    </div>
    <span className="shop-category-scroll-cue" aria-hidden="true">›</span>
  </div>;
}
