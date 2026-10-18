import type { MarketplaceSort } from "@bazaarlink/contracts";
import type { BrowseMarketplaceInput } from "./api";

export type AppliedFilterKey =
  | "categoryId" | "province" | "storeId" | "brand" | "minPrice"
  | "maxPrice" | "inStock" | "discount" | "minRating" | "verifiedStore";

export const filterKeys: readonly AppliedFilterKey[] = [
  "categoryId", "province", "storeId", "brand", "minPrice",
  "maxPrice", "inStock", "discount", "minRating", "verifiedStore"
];

export const sortValues: readonly MarketplaceSort[] = [
  "relevance", "newest", "price_asc", "price_desc", "rating", "popularity"
];

export function appliedFilterKeys(input: BrowseMarketplaceInput | null): AppliedFilterKey[] {
  if (!input) return [];
  return filterKeys.filter(key => {
    const value = input[key];
    return value !== undefined && value !== null && value !== false && value !== "";
  });
}

export function removeAppliedFilter(
  input: BrowseMarketplaceInput,
  key: AppliedFilterKey
): BrowseMarketplaceInput {
  const next: BrowseMarketplaceInput = { ...input, offset: 0, limit: 20 };
  delete next[key];
  return next;
}

/** Mirrors server-side Zod numeric bounds. Empty fields mean no price restriction. */
export function validatePriceRange(min: string, max: string): "invalid" | "range" | null {
  const parse = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) return null;
    const amount = Number(trimmed);
    return Number.isFinite(amount) && amount <= 999999999 ? amount : null;
  };
  const low = parse(min);
  const high = parse(max);
  if (low === null || high === null) return "invalid";
  if (low !== undefined && high !== undefined && low > high) return "range";
  return null;
}
