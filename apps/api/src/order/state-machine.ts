import type {
  MerchantOrderAction,
  OrderFulfillmentType,
  OrderState
} from "@bazaarlink/contracts";

export interface OrderTransition {
  nextState: OrderState;
  requiresReservationCommit: boolean;
  releasesInventory: boolean;
  startsRefund: boolean;
}

export function merchantOrderTransition(
  state: OrderState,
  fulfillmentType: OrderFulfillmentType,
  action: MerchantOrderAction
): OrderTransition | null {
  if (action === "confirm" && state === "pending_confirmation") {
    return {
      nextState: "confirmed",
      requiresReservationCommit: true,
      releasesInventory: false,
      startsRefund: false
    };
  }

  if (action === "start_preparing" && state === "confirmed") {
    return {
      nextState: "preparing",
      requiresReservationCommit: false,
      releasesInventory: false,
      startsRefund: false
    };
  }

  if (action === "mark_ready" && state === "preparing") {
    return {
      nextState:
        fulfillmentType === "pickup" ? "ready_for_pickup" : "ready",
      requiresReservationCommit: false,
      releasesInventory: false,
      startsRefund: false
    };
  }

  if (
    action === "dispatch" &&
    state === "ready" &&
    fulfillmentType === "delivery"
  ) {
    return {
      nextState: "out_for_delivery",
      requiresReservationCommit: false,
      releasesInventory: false,
      startsRefund: false
    };
  }

  if (
    action === "deliver" &&
    ((state === "out_for_delivery" && fulfillmentType === "delivery") ||
      (state === "ready" && fulfillmentType === "digital"))
  ) {
    return {
      nextState: "delivered",
      requiresReservationCommit: false,
      releasesInventory: false,
      startsRefund: false
    };
  }

  if (
    action === "mark_picked_up" &&
    state === "ready_for_pickup" &&
    fulfillmentType === "pickup"
  ) {
    return {
      nextState: "picked_up",
      requiresReservationCommit: false,
      releasesInventory: false,
      startsRefund: false
    };
  }

  if (
    action === "mark_delivery_failed" &&
    state === "out_for_delivery" &&
    fulfillmentType === "delivery"
  ) {
    return {
      nextState: "delivery_failed",
      requiresReservationCommit: false,
      releasesInventory: false,
      startsRefund: false
    };
  }

  if (
    (action === "reject" || action === "cancel") &&
    [
      "pending_confirmation",
      "confirmed",
      "preparing",
      "ready",
      "ready_for_pickup",
      "delivery_failed"
    ].includes(state)
  ) {
    return {
      nextState: "cancelled",
      requiresReservationCommit: false,
      releasesInventory: true,
      startsRefund: false
    };
  }

  if (
    action === "request_refund" &&
    ["delivered", "picked_up"].includes(state)
  ) {
    return {
      nextState: "refund_pending",
      requiresReservationCommit: false,
      releasesInventory: false,
      startsRefund: true
    };
  }

  return null;
}

export function customerCanCancel(state: OrderState): boolean {
  return state === "pending_confirmation";
}
