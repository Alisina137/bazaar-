import type { MarketplaceErrorCode } from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";

export function marketplaceErrorKey(
  code: MarketplaceErrorCode
): TranslationKey {
  switch (code) {
    case "invalid_request":
      return "marketplace.error.invalidRequest";
    case "product_not_found":
      return "marketplace.error.productNotFound";
    case "store_not_found":
      return "marketplace.error.storeNotFound";
    case "service_unavailable":
    default:
      return "marketplace.error.serviceUnavailable";
  }
}
