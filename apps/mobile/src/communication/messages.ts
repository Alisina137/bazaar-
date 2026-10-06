import type {
  CommunicationErrorCode,
  NotificationType,
  SupportTicketCategory,
  SupportTicketStatus
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";

export function communicationErrorKey(
  code: CommunicationErrorCode
): TranslationKey {
  switch (code) {
    case "invalid_request":
      return "support.error.invalidRequest";
    case "invalid_session":
    case "account_unavailable":
      return "support.error.invalidSession";
    case "forbidden":
      return "support.error.forbidden";
    case "support_ticket_not_found":
    case "notification_not_found":
      return "support.error.notFound";
    case "support_ticket_closed":
      return "support.error.closed";
    case "support_context_invalid":
      return "support.error.context";
    default:
      return "support.error.serviceUnavailable";
  }
}

export function notificationTitleKey(type: NotificationType): TranslationKey {
  return ("notification." +
    ({
      order_placed: "orderPlaced",
      payment_successful: "paymentSuccessful",
      payment_failed: "paymentFailed",
      order_confirmed: "orderConfirmed",
      order_cancelled: "orderCancelled",
      order_preparing: "orderPreparing",
      out_for_delivery: "outForDelivery",
      delivered: "delivered",
      review_available: "reviewAvailable",
      low_stock: "lowStock",
      new_review: "newReview",
      subscription_issue: "subscriptionIssue",
      support_reply: "supportReply",
      delivery_failed: "deliveryFailed"
    } as const)[type] +
    ".title") as TranslationKey;
}

export function notificationBodyKey(type: NotificationType): TranslationKey {
  return notificationTitleKey(type).replace(".title", ".body") as TranslationKey;
}

export function supportStatusKey(
  status: SupportTicketStatus
): TranslationKey {
  switch (status) {
    case "open":
      return "support.status.open";
    case "waiting_support":
      return "support.status.waitingSupport";
    case "waiting_customer":
      return "support.status.waitingCustomer";
    case "closed":
      return "support.status.closed";
  }
}

export function supportCategoryKey(
  category: SupportTicketCategory
): TranslationKey {
  return ("support.category." + category) as TranslationKey;
}
