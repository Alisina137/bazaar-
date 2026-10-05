import type {
  OrderErrorCode,
  OrderState
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";

export function orderErrorKey(code: OrderErrorCode): TranslationKey {
  switch (code) {
    case "invalid_request":
      return "order.error.invalidRequest";
    case "invalid_session":
      return "order.error.invalidSession";
    case "account_unavailable":
      return "order.error.accountUnavailable";
    case "forbidden":
      return "order.error.forbidden";
    case "order_not_found":
      return "order.error.notFound";
    case "checkout_unavailable":
      return "order.error.checkoutUnavailable";
    case "payment_not_ready":
      return "order.error.paymentNotReady";
    case "inventory_unavailable":
      return "order.error.inventoryUnavailable";
    case "order_state_conflict":
      return "order.error.stateConflict";
    case "cancellation_not_allowed":
      return "order.error.cancellationNotAllowed";
    case "refund_not_available":
      return "order.error.refundUnavailable";
    case "rate_limited":
      return "order.error.rateLimited";
    case "service_unavailable":
    default:
      return "order.error.serviceUnavailable";
  }
}

export function orderStateKey(state: OrderState): TranslationKey {
  switch (state) {
    case "pending_payment":
      return "order.state.pendingPayment";
    case "pending_confirmation":
      return "order.state.pendingConfirmation";
    case "confirmed":
      return "order.state.confirmed";
    case "preparing":
      return "order.state.preparing";
    case "ready":
      return "order.state.ready";
    case "ready_for_pickup":
      return "order.state.readyForPickup";
    case "out_for_delivery":
      return "order.state.outForDelivery";
    case "delivered":
      return "order.state.delivered";
    case "picked_up":
      return "order.state.pickedUp";
    case "cancelled":
      return "order.state.cancelled";
    case "payment_failed":
      return "order.state.paymentFailed";
    case "refund_pending":
      return "order.state.refundPending";
    case "refunded":
      return "order.state.refunded";
    case "delivery_failed":
      return "order.state.deliveryFailed";
  }
}
