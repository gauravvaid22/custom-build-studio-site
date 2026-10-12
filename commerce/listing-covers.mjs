// Keep baseline overview covers when older admin records have no chosen cover.
// An explicitly saved overview cover remains authoritative.
export function applyDefaultListingCovers(products, baselineProducts) {
  const defaults = new Map(baselineProducts.filter(p => p.galleryOverviewCover && p.images?.[0]).map(p => [p.id, p.images[0]]));
  return products.map(product => {
    const cover = defaults.get(product.id);
    if (!cover || product.galleryOverviewCover) return product;
    return { ...product, galleryOverviewCover: true, images: [structuredClone(cover), ...product.images.filter(image => image.src !== cover.src)] };
  });
}
