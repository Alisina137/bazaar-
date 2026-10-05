import type { CustomerAddressRecord } from "./cart-pricing.js";
import type { DeliveryOptionQuote } from "./delivery.js";
import type {
  PaymentMethod,
  PaymentProvider,
  PaymentState
} from "./payment.js";

export const orderStates = [
  "pending_payment",
  "pending_confirmation",
  "confirmed",
  "preparing",
  "ready",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "picked_up",
  "cancelled",
  "payment_failed",
  "refund_pending",
  "refunded",
  "delivery_failed"
] as const;

export type OrderState = (typeof orderStates)[number];

export const orderFulfillmentTypes = [
  "delivery",
  "pickup",
  "digital"
] as const;

export type OrderFulfillmentType =
  (typeof orderFulfillmentTypes)[number];

export const inventoryReservationStates = [
  "reserved",
  "committed",
  "released",
  "expired"
] as const;

export type InventoryReservationState =
  (typeof inventoryReservationStates)[number];

export const orderEventSources = [
  "system",
  "customer",
  "merchant",
  "payment"
] as const;

export type OrderEventSource =
  (typeof orderEventSources)[number];

export interface OrderTotalsRecord {
  itemsSubtotal: number;
  productDiscount: number;
  couponDiscount: number;
  preDeliveryTotal: number;
  deliveryBase: number;
  urgencySurcharge: number;
  productDeliverySurcharge: number;
  freeDeliveryDiscount: number;
  deliveryTotal: number;
  total: number;
}

export interface OrderPaymentSnapshot {
  attemptId: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  state: PaymentState;
  amount: number;
  currency: "AFN";
}

export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantTitle: string | null;
  imageUrl: string | null;
  quantity: number;
  unitListPrice: number;
  unitPrice: number;
  lineItemsSubtotal: number;
  lineProductDiscount: number;
  lineTotal: number;
  createdAt: string;
}

export interface InventoryReservationRecord {
  id: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  state: InventoryReservationState;
  expiresAt: string;
  committedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderFulfillmentRecord {
  id: string;
  orderId: string;
  type: OrderFulfillmentType;
  state:
    | "pending"
    | "preparing"
    | "ready"
    | "ready_for_pickup"
    | "out_for_delivery"
    | "delivered"
    | "picked_up"
    | "cancelled"
    | "delivery_failed";
  label: string;
  trackingCode: string | null;
  expectedMinAt: string | null;
  expectedMaxAt: string | null;
  startedAt: string | null;
  readyAt: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderEventRecord {
  id: string;
  orderId: string;
  fromState: OrderState | null;
  toState: OrderState;
  source: OrderEventSource;
  actorUserId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  checkoutSessionId: string;
  customerUserId: string;
  storeId: string;
  storeName: string;
  storeHandle: string;
  storePhone: string;
  state: OrderState;
  fulfillmentType: OrderFulfillmentType;
  currency: "AFN";
  totals: OrderTotalsRecord;
  customerAddress: CustomerAddressRecord | null;
  delivery: DeliveryOptionQuote;
  payment: OrderPaymentSnapshot;
  cancellationReason: string | null;
  confirmationExpiresAt: string;
  placedAt: string;
  confirmedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  pickedUpAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemRecord[];
  fulfillment: OrderFulfillmentRecord;
  reservations: InventoryReservationRecord[];
  timeline: OrderEventRecord[];
}

export interface PlaceOrderInput {
  checkoutSessionId: string;
  idempotencyKey: string;
}

export interface PlaceOrderResponse {
  orders: OrderRecord[];
  reused: boolean;
}

export interface OrderListResponse {
  orders: OrderRecord[];
}

export const merchantOrderActions = [
  "confirm",
  "reject",
  "start_preparing",
  "mark_ready",
  "dispatch",
  "deliver",
  "mark_picked_up",
  "mark_delivery_failed",
  "cancel",
  "request_refund"
] as const;

export type MerchantOrderAction =
  (typeof merchantOrderActions)[number];

export interface MerchantOrderActionInput {
  action: MerchantOrderAction;
  reason?: string | null | undefined;
}

export interface CancelOrderInput {
  reason: string;
}

export const orderErrorCodes = [
  "invalid_request",
  "invalid_session",
  "account_unavailable",
  "forbidden",
  "order_not_found",
  "checkout_unavailable",
  "payment_not_ready",
  "inventory_unavailable",
  "order_state_conflict",
  "cancellation_not_allowed",
  "refund_not_available",
  "rate_limited",
  "service_unavailable"
] as const;

export type OrderErrorCode = (typeof orderErrorCodes)[number];

export interface OrderErrorResponse {
  error: {
    code: OrderErrorCode;
  };
}
