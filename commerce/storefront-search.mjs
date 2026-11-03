const normalize = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function buildTokenRegex(rawToken, prefixFallback = false) {
  const token = rawToken.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  if (!token) return /.*/;
  if (prefixFallback) {
    return new RegExp(`\\b${escapeRegExp(token)}`);
  }
  if (token.length > 4 && token.endsWith("ies")) {
    const stem = escapeRegExp(token.slice(0, -3));
    return new RegExp(`\\b${stem}(?:y|ies)\\b`);
  }
  if (token.length >= 4 && token.endsWith("y")) {
    const stem = escapeRegExp(token.slice(0, -1));
    return new RegExp(`\\b${stem}(?:y|ys|ies)\\b`);
  }
  if (token.length >= 4 && /(?:ches|shes|xes|zes|sses)$/.test(token)) {
    const stem = escapeRegExp(token.slice(0, -2));
    return new RegExp(`\\b${stem}(?:es)?\\b`);
  }
  if (token.length >= 4 && token.endsWith("s") && !token.endsWith("ss")) {
    const base = token.slice(0, -1);
    const stem = escapeRegExp(base);
    return base.length <= 3
      ? new RegExp(`\\b${stem}s?\\b`)
      : new RegExp(`\\b${stem}(?:s|es|ed|ing)?\\b`);
  }
  if (token.length <= 3) {
    return new RegExp(`\\b${escapeRegExp(token)}s?\\b`);
  }
  return new RegExp(`\\b${escapeRegExp(token)}(?:s|es|ed|ing)?\\b`);
}

export function getSearchFields(product, displayName = product.name, activeCollections = []) {
  const groupId = product?.listingGroup || "";
  const family = activeCollections
    .filter(collection => collection.products.includes(product.id) || Boolean(groupId && collection.products.includes(groupId)))
    .map(collection => `${collection.name} ${collection.shortName || ""}`)
    .join(" ");
  const variantText = Array.isArray(product.variants) ? product.variants.map(v => v.label).join(" ") : "";
  const groupedText = Array.isArray(product.groupedDesigns) ? product.groupedDesigns.map(d => d.label).join(" ") : "";
  const keywordsText = Array.isArray(product.searchKeywords) ? product.searchKeywords.join(" ") : "";
  const normName = normalize(`${displayName} ${product.name}`);
  const normSeo = normalize(`${product.seoTitle || ""} ${product.seoDescription || ""}`);
  const normKeywords = normalize(keywordsText);
  const normCategoryFamily = normalize(`${product.category || ""} ${family} ${variantText} ${groupedText}`);
  const normDescription = normalize(`${product.description || ""} ${product.notes || ""} ${product.included || ""} ${product.dimensions || ""}`);
  const searchable = `${normName} ${normSeo} ${normKeywords} ${normCategoryFamily} ${normDescription}`;
  return { normName, normDisplay: normalize(displayName), normSeo, normKeywords, normCategoryFamily, normDescription, searchable };
}

export function matchesSearchQuery(product, query, displayName = product.name, activeCollections = [], allowTrailingPrefix = false) {
  const q = normalize(query).trim();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const { searchable } = getSearchFields(product, displayName, activeCollections);
  return tokens.every((word, idx) => {
    const usePrefix = allowTrailingPrefix && idx === tokens.length - 1 && word.length >= 3;
    return buildTokenRegex(word, usePrefix).test(searchable);
  });
}

export function scoreSearchQuery(product, query, displayName = product.name, activeCollections = []) {
  const q = normalize(query).trim();
  if (!q) return 0;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  const { normDisplay, normName, normSeo, normKeywords, normCategoryFamily, normDescription } = getSearchFields(
    product,
    displayName,
    activeCollections,
  );
  const isDesignOption = Boolean(product?.listingGroup);
  const phraseRe = new RegExp(`\\b${escapeRegExp(q)}(?:s|es)?\\b`);
  const tokenRegexes = tokens.map(token => buildTokenRegex(token, false));

  let score = 0;
  if (normDisplay === q) score += 220;
  else if (normDisplay.startsWith(q)) score += 150;
  else if (phraseRe.test(normName)) score += 115;

  if (phraseRe.test(normKeywords)) score += 90;
  if (phraseRe.test(normSeo)) score += 70;
  if (phraseRe.test(normCategoryFamily)) score += 45;

  let nameTokenHits = 0;
  let nameOrKeywordHits = 0;
  for (const re of tokenRegexes) {
    const inName = re.test(normName);
    const inKeywords = re.test(normKeywords);
    if (inName) {
      score += 40;
      nameTokenHits++;
    }
    if (inKeywords) score += 25;
    if (inName || inKeywords) nameOrKeywordHits++;
    if (re.test(normSeo)) score += 16;
    if (re.test(normCategoryFamily)) score += 10;
    if (re.test(normDescription)) score += 4;
  }

  if (nameTokenHits === tokenRegexes.length) score += 50;
  else if (nameOrKeywordHits === tokenRegexes.length) score += 28;

  if (!isDesignOption) score += 18;
  return score;
}
