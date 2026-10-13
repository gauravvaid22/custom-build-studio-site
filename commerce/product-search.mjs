const brand = 'Custom Build Studio';
export function searchTitle(product) {
  const title = String(product.seoTitle || product.name || '').trim();
  return title.replace(/\s*\|\s*Custom Build Studio\s*$/i, '').trim();
}
export function brandedSearchTitle(product) { return `${searchTitle(product)} | ${brand}`; }
export function searchDescription(product) {
  return String(product.seoDescription || product.description || '').trim().slice(0, 300);
}
