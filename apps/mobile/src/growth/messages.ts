import type { GrowthErrorCode } from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";

export function growthErrorKey(code: GrowthErrorCode): TranslationKey {
  switch (code) {
    case "invalid_request":
      return "growth.error.invalidRequest";
    case "invalid_session":
    case "account_unavailable":
      return "growth.error.invalidSession";
    case "forbidden":
      return "growth.error.forbidden";
    case "store_not_found":
      return "growth.error.storeNotFound";
    case "product_not_found":
      return "growth.error.productNotFound";
    case "coupon_not_found":
      return "growth.error.couponNotFound";
    case "coupon_code_in_use":
      return "growth.error.couponCodeInUse";
    case "promotion_not_found":
      return "growth.error.promotionNotFound";
    case "promotion_conflict":
      return "growth.error.promotionConflict";
    case "feature_not_available":
      return "growth.error.featureNotAvailable";
    case "staff_limit_reached":
      return "growth.error.staffLimit";
    case "staff_invite_expired":
      return "growth.error.inviteExpired";
    case "staff_invite_email_mismatch":
      return "growth.error.inviteEmail";
    case "same_subscription_plan":
      return "growth.error.samePlan";
    default:
      return "growth.error.serviceUnavailable";
  }
}
