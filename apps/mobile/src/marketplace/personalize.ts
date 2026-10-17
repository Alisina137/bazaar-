import type {
  MarketplaceCategoryRecord,
  MarketplaceHomeResponse,
  MarketplaceProductSummary
} from "@bazaarlink/contracts";

/** A child category contributes to a preferred root category. */
function categoryAncestors(
  categoryId: string | undefined,
  categories: MarketplaceCategoryRecord[]
): string[] {
  if (!categoryId) return [];
  const byId = new Map(categories.map((category) => [category.id, category]));
  const ids: string[] = [];
  const seen = new Set<string>();
  let id: string | null = categoryId;
  while (id && !seen.has(id) && ids.length < 8) {
    ids.push(id);
    seen.add(id);
    id = byId.get(id)?.parentId ?? null;
  }
  return ids;
}

export function orderRecentProducts(
  products: MarketplaceProductSummary[],
  ids: string[]
): MarketplaceProductSummary[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return ids.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}

/**
 * An intentionally small, explainable on-device ranking. Input products
 * come only from public marketplace API queries, never fabricated stock.
 * Browsing a product gives its category a light affinity; explicit choices
 * receive a higher score. Recently viewed items are excluded from discovery
 * so the user sees different products in their own Recently Viewed rail.
 */
export function personalizeProducts({
  home,
  favorites,
  extra,
  recentIds,
  province
}: {
  home: MarketplaceHomeResponse | null;
  favorites: string[];
  extra: MarketplaceProductSummary[];
  recentIds: string[];
  province: string | null;
}): MarketplaceProductSummary[] {
  if (!home) return [];

  const explicit = new Set(favorites);
  const recentCategories = new Set<string>();
  for (const product of home.recentlyViewed) {
    for (const id of categoryAncestors(
      product.marketplaceCategory?.id, home.categories
    )) {
      recentCategories.add(id);
    }
  }
  if (!explicit.size && !recentCategories.size) return [];

  const viewed = new Set(recentIds);
  const seen = new Set<string>();
  const candidateProducts = [
    ...extra, ...home.recommended, ...home.popular,
    ...home.newest, ...home.deals, ...home.nearby
  ];
  const ranked: Array<{ product: MarketplaceProductSummary; score: number; position: number }> = [];

  candidateProducts.forEach((product, position) => {
    if (seen.has(product.id)) return;
    seen.add(product.id);
    if (!product.inStock || viewed.has(product.id)) return;
    if (province && product.store.province.toLowerCase() !== province.toLowerCase()) return;
    const ancestors = categoryAncestors(product.marketplaceCategory?.id, home.categories);
    const explicitMatch = ancestors.some((id) => explicit.has(id));
    const historyMatch = ancestors.some((id) => recentCategories.has(id));
    if (!explicitMatch && !historyMatch) return;
    ranked.push({
      product,
      score: (explicitMatch ? 100 : 0) + (historyMatch ? 25 : 0),
      position
    });
  });

  return ranked.sort((a, b) => b.score - a.score || a.position - b.position)
    .slice(0, 10).map((item) => item.product);
}
