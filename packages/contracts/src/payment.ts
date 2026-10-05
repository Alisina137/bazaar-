import type {
  StoreEntitlements,
  StoreRecord
} from "./store.js";

export const paymentMethods = [
  "cash_on_delivery",
  "hesabpay",
  "card",
  "pay_at_store"
] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentProviders = [
  "manual",
  "hesabpay",
  "card_gateway"
] as const;
export type PaymentProvider = (typeof paymentProviders)[number];

export const paymentStates = [
  "created",
  "pending",
  "paid",
  "failed",
  "cancelled",
  "expired",
  "refund_pending",
  "refunded",
  "partially_refunded"
] as const;
export type PaymentState = (typeof paymentStates)[number];

export const paymentRefundStates = [
  "none",
  "pending",
  "partial",
  "refunded",
  "failed"
] as const;
export type PaymentRefundState = (typeof paymentRefundStates)[number];

export const paymentEventSources = [
  "system",
  "customer",
  "merchant",
  "provider_webhook",
  "admin"
] as const;
export type PaymentEventSource = (typeof paymentEventSources)[number];

export interface StorePaymentSettingsRecord {
  storeId: string;
  cashOnDeliveryEnabled: boolean;
  hesabpayEnabled: boolean;
  cardEnabled: boolean;
  payAtStoreEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateStorePaymentSettingsInput {
  cashOnDeliveryEnabled?: boolean | undefined;
  hesabpayEnabled?: boolean | undefined;
  cardEnabled?: boolean | undefined;
  payAtStoreEnabled?: boolean | undefined;
}

export interface MerchantPaymentConfigurationResponse {
  store: Pick<
    StoreRecord,
    "id" | "name" | "subscription"
  >;
  entitlements: StoreEntitlements;
  settings: StorePaymentSettingsRecord;
  providerReadiness: {
    hesabpay: boolean;
    cardGateway: boolean;
  };
}

export interface PaymentAttemptRecord {
  id: string;
  userId: string;
  checkoutSessionId: string;
  storeId: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  state: PaymentState;
  amount: number;
  currency: "AFN";
  idempotencyKey: string;
  providerSessionId: string | null;
  providerTransactionId: string | null;
  providerReference: string | null;
  hostedCheckoutUrl: string | null;
  failureCode: string | null;
  failureReason: string | null;
  refundState: PaymentRefundState;
  refundedAmount: number;
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStateEventRecord {
  id: string;
  paymentAttemptId: string;
  fromState: PaymentState | null;
  toState: PaymentState;
  source: PaymentEventSource;
  providerEventId: string | null;
  deduplicationKey: string | null;
  payloadFingerprint: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface PaymentMethodAvailability {
  storeId: string;
  method: PaymentMethod;
  available: boolean;
  unavailableReason:
    | "merchant_disabled"
    | "provider_unavailable"
    | "pickup_required"
    | "delivery_required"
    | null;
}

export const paymentErrorCodes = [
  "invalid_request",
  "invalid_session",
  "account_unavailable",
  "forbidden",
  "store_not_found",
  "payment_configuration_not_found",
  "payment_method_unavailable",
  "payment_attempt_not_found",
  "payment_state_conflict",
  "checkout_unavailable",
  "provider_unavailable",
  "provider_rejected",
  "webhook_unverified",
  "rate_limited",
  "service_unavailable"
] as const;

export type PaymentErrorCode = (typeof paymentErrorCodes)[number];

export interface PaymentErrorResponse {
  error: {
    code: PaymentErrorCode;
  };
}
