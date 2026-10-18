import type { MarketplaceProductSummary } from "@bazaarlink/contracts";

/** Only label a discount when the underlying listing actually has a valid sale price. */
export function discountPercentage(
  item: Pick<MarketplaceProductSummary, "hasDiscount" | "price" | "compareAtPrice">
): number | null {
  const { hasDiscount, price, compareAtPrice } = item;
  if (!hasDiscount || compareAtPrice === null ||
      !Number.isFinite(price) || !Number.isFinite(compareAtPrice) ||
      price < 0 || compareAtPrice <= price || compareAtPrice <= 0) {
    return null;
  }
  const pct = Math.round((100 * (compareAtPrice - price)) / compareAtPrice);
  return pct >= 1 ? Math.min(pct, 99) : null;
}


/** Never display fabricated stars or count: both are read from product reviews. */
export function ratingSummary(
  item: Pick<MarketplaceProductSummary, "averageRating" | "reviewCount">
): { average: number; count: number } | null {
  const { averageRating, reviewCount } = item;
  if (averageRating === null || !Number.isFinite(averageRating) ||
      averageRating < 1 || averageRating > 5 ||
      !Number.isSafeInteger(reviewCount) || reviewCount <= 0) {
    return null;
  }

  return {
    average: Math.round(averageRating * 10) / 10,
    count: reviewCount
  };
}
