import type { TrustErrorCode } from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";

export function trustErrorKey(code: TrustErrorCode): TranslationKey {
  switch (code) {
    case "invalid_request":
      return "review.error.invalidRequest";
    case "invalid_session":
    case "account_unavailable":
      return "review.error.invalidSession";
    case "forbidden":
      return "review.error.forbidden";
    case "review_not_eligible":
      return "review.error.notEligible";
    case "review_already_exists":
      return "review.error.alreadyExists";
    case "review_not_found":
    case "product_not_found":
    case "store_not_found":
      return "review.error.notFound";
    case "review_report_already_exists":
      return "review.error.reportExists";
    default:
      return "review.error.serviceUnavailable";
  }
}
