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
