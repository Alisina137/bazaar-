import type {
  CartPricingErrorCode
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";

export function cartPricingErrorKey(
  code: CartPricingErrorCode
): TranslationKey {
  switch (code) {
    case "invalid_request":
      return "cart.error.invalidRequest";
    case "invalid_session":
      return "cart.error.invalidSession";
    case "account_unavailable":
      return "cart.error.accountUnavailable";
    case "forbidden":
      return "cart.error.forbidden";
    case "cart_empty":
      return "cart.error.empty";
    case "cart_item_not_found":
      return "cart.error.itemNotFound";
    case "product_unavailable":
      return "cart.error.productUnavailable";
    case "variant_unavailable":
      return "cart.error.variantUnavailable";
    case "insufficient_stock":
      return "cart.error.insufficientStock";
    case "address_not_found":
      return "cart.error.addressNotFound";
    case "coupon_invalid":
      return "cart.error.couponInvalid";
    case "coupon_not_eligible":
      return "cart.error.couponNotEligible";
    case "checkout_unavailable":
      return "cart.error.checkoutUnavailable";
    case "rate_limited":
      return "cart.error.rateLimited";
    case "service_unavailable":
    default:
      return "cart.error.serviceUnavailable";
  }
}
