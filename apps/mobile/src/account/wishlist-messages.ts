import type { TranslationKey } from "@bazaarlink/localization";
import type { WishlistErrorCode } from "@bazaarlink/contracts";

import { WishlistApiError } from "./wishlist-api";

export type WishlistRequestKind = "load" | "write";

const knownCodes: Readonly<Record<WishlistErrorCode, TranslationKey>> = {
  invalid_request: "account.wishlist.invalidRequest",
  invalid_session: "account.wishlist.sessionExpired",
  account_unavailable: "account.wishlist.accountUnavailable",
  product_not_found: "account.wishlist.productUnavailable",
  wishlist_full: "account.wishlist.full",
  rate_limited: "account.wishlist.rateLimited",
  service_unavailable: "account.wishlist.serverError"
};

export function wishlistErrorKey(
  error: unknown,
  kind: WishlistRequestKind
): TranslationKey {
  if (!(error instanceof WishlistApiError)) {
    return "account.wishlist.networkError";
  }
  if (error.code === "service_unavailable") {
    return error.httpStatus === null
      ? "account.wishlist.networkError"
      : kind === "load"
        ? "account.wishlist.loadServerError"
        : "account.wishlist.serverError";
  }
  return knownCodes[error.code];
}
