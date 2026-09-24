import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getSeo, getStructuredData } from "../data/seo";
export default function Seo() {
  const { pathname } = useLocation();
  useEffect(() => {
    const seo = getSeo(pathname);
    document.title = seo.title;
    let structured = document.getElementById("structured-data");
    if (!structured) {
      structured = document.createElement("script");
      structured.id = "structured-data";
      structured.setAttribute("type", "application/ld+json");
      document.head.appendChild(structured);
    }
    structured.textContent = JSON.stringify(getStructuredData(pathname));
    const meta = (attr: string, key: string, value: string) => {
      let tag = document.head.querySelector<HTMLMetaElement>(
        `meta[${attr}="${key}"]`,
      );
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.content = value;
    };
    const preview =
      document
        .querySelector('meta[name="build-context"]')
        ?.getAttribute("content") === "preview";
    meta("name", "description", seo.description);
    meta(
      "name",
      "robots",
      preview || seo.noindex ? "noindex,follow" : "index,follow",
    );
    for (const [key, value] of Object.entries({
      title: seo.title,
      description: seo.description,
      url: seo.url,
      image: seo.image,
      "image:alt": seo.imageAlt,
      type: "website",
      site_name: "Custom Build Studio",
      locale: "en_CA",
    }))
      meta("property", `og:${key}`, value);
    for (const [key, value] of Object.entries({
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      image: seo.image,
    }))
      meta("name", `twitter:${key}`, value);
    let link = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = seo.url;
  }, [pathname]);
  return null;
}
