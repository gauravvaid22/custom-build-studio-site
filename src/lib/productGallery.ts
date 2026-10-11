import products from "../../commerce/products.json";

type Product = (typeof products)[number];
const videosFor = (product: Product) => "videos" in product && Array.isArray(product.videos)
  ? product.videos : "video" in product && product.video ? [product.video] : [];

/** Show each design's first photo before its extra angles in the overview. */
export function productGallery(product: Product, selectedId: string) {
  const designs = "groupedDesigns" in product ? product.groupedDesigns || [] : [];
  const selected = designs.find(design => design.optionIds.includes(selectedId));
  const sources = designs.length
    ? (selected ? [selected] : designs).flatMap(design => {
      const owner = products.find(item => item.id === design.id);
      return owner ? [{ owner, label: design.label }] : [];
    })
    : [{ owner: product, label: "" }];
  const images = [] as { owner: Product; image: Product["images"][number]; imageIndex: number; label: string }[];
  const seen = new Set<string>();
  if (designs.length && !selected && "galleryOverviewCover" in product && product.galleryOverviewCover && product.images[0]) {
    images.push({ owner: product, image: product.images[0], imageIndex: 0, label: "Collection overview" });
    seen.add(product.images[0].src);
  }
  const max = Math.max(0, ...sources.map(source => source.owner.images.length));
  for (let imageIndex = 0; imageIndex < max; imageIndex++) {
    for (const { owner, label } of sources) {
      const image = owner.images[imageIndex];
      if (image && !seen.has(image.src)) {
        seen.add(image.src);
        images.push({ owner, image, imageIndex, label });
      }
    }
  }
  const videos = sources.flatMap(({ owner, label }) => videosFor(owner).map(src => ({ src, owner, label })));
  return { images, videos, overview: designs.length > 0 && !selected, designCount: designs.length };
}
