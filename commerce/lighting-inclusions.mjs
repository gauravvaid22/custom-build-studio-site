export const lightingIds = new Set(["christmas-angel", "bright-nativity-table-lamp", "village-on-the-moon-table-lamp", "santa-s-bonfire-table-lamp", "luminous-tree", "luminous-tree-stars", "luminous-tree-lace", "luminous-tree-spiral", "village-lights"]);
export const lightingIncludedCopy = "Finished physical product or listed set, with LED lighting included in the price. Decorative props are not included.";
export function updateLightingDocument(doc){return {...doc,products:doc.products.map(p=>lightingIds.has(p.id)?{...p,included:lightingIncludedCopy}:p)};}
