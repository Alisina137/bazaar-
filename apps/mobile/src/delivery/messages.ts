import type { DeliveryErrorCode } from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";

export function deliveryErrorKey(
  code: DeliveryErrorCode
): TranslationKey {
  switch (code) {
    case "invalid_request":
      return "delivery.error.invalidRequest";
    case "invalid_session":
      return "delivery.error.invalidSession";
    case "account_unavailable":
      return "delivery.error.accountUnavailable";
    case "forbidden":
      return "delivery.error.forbidden";
    case "store_not_found":
      return "delivery.error.storeNotFound";
    case "subscription_unavailable":
      return "delivery.error.subscriptionUnavailable";
    case "advanced_delivery_unavailable":
      return "delivery.error.advancedUnavailable";
    case "delivery_zone_not_found":
      return "delivery.error.zoneNotFound";
    case "delivery_distance_rule_not_found":
      return "delivery.error.distanceRuleNotFound";
    case "delivery_speed_not_found":
      return "delivery.error.speedNotFound";
    case "address_not_found":
      return "delivery.error.addressNotFound";
    case "cart_empty":
      return "delivery.error.cartEmpty";
    case "delivery_unavailable":
      return "delivery.error.unavailable";
    case "delivery_option_invalid":
      return "delivery.error.optionInvalid";
    case "checkout_unavailable":
      return "delivery.error.checkoutUnavailable";
    case "rate_limited":
      return "delivery.error.rateLimited";
    case "delivery_configuration_not_found":
    case "service_unavailable":
    default:
      return "delivery.error.serviceUnavailable";
  }
}
