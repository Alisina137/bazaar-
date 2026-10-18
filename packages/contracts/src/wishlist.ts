import type { MarketplaceProductSummary } from "./marketplace.js";

export interface CustomerWishlistResponse {
  products: MarketplaceProductSummary[];
  savedProductIds: string[];
}

export interface WishlistMutationResponse {
  saved: boolean;
  productId: string;
}

export const wishlistErrorCodes = [
  "invalid_request", "invalid_session", "account_unavailable",
  "product_not_found", "wishlist_full", "rate_limited", "service_unavailable"
] as const;

export type WishlistErrorCode = (typeof wishlistErrorCodes)[number];
