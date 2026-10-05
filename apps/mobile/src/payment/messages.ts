import type { PaymentErrorCode } from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";

export function paymentErrorKey(
  code: PaymentErrorCode
): TranslationKey {
  switch (code) {
    case "invalid_request":
      return "payment.error.invalidRequest";
    case "invalid_session":
      return "payment.error.invalidSession";
    case "account_unavailable":
      return "payment.error.accountUnavailable";
    case "forbidden":
      return "payment.error.forbidden";
    case "store_not_found":
      return "payment.error.storeNotFound";
    case "subscription_unavailable":
      return "payment.error.subscriptionUnavailable";
    case "payment_configuration_not_found":
      return "payment.error.configurationNotFound";
    case "payment_method_unavailable":
      return "payment.error.methodUnavailable";
    case "payment_attempt_not_found":
      return "payment.error.attemptNotFound";
    case "payment_state_conflict":
      return "payment.error.stateConflict";
    case "checkout_unavailable":
      return "payment.error.checkoutUnavailable";
    case "provider_unavailable":
      return "payment.error.providerUnavailable";
    case "provider_rejected":
      return "payment.error.providerRejected";
    case "webhook_unverified":
      return "payment.error.webhookUnverified";
    case "refund_not_available":
      return "payment.error.refundUnavailable";
    case "rate_limited":
      return "payment.error.rateLimited";
    case "service_unavailable":
    default:
      return "payment.error.serviceUnavailable";
  }
}
