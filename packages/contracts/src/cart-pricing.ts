import type { MarketplaceStoreSummary } from "./marketplace.js";

export type CouponDiscountType = "percentage" | "fixed";

export interface CustomerAddressRecord {
  id: string;
  userId: string;
  label: string | null;
  recipientName: string;
  country: string;
  province: string;
  districtCity: string;
  areaNeighborhood: string | null;
  addressDescription: string;
  nearestLandmark: string | null;
  phone: string;
  mapLatitude: number | null;
  mapLongitude: number | null;
  deliveryInstructions: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerAddressInput {
  label?: string | null | undefined;
  recipientName: string;
  country?: string | undefined;
  province: string;
  districtCity: string;
  areaNeighborhood?: string | null | undefined;
  addressDescription: string;
  nearestLandmark?: string | null | undefined;
  phone: string;
  mapLatitude?: number | null | undefined;
  mapLongitude?: number | null | undefined;
  deliveryInstructions?: string | null | undefined;
  isDefault?: boolean | undefined;
}

export interface UpdateCustomerAddressInput {
  label?: string | null | undefined;
  recipientName?: string | undefined;
  country?: string | undefined;
  province?: string | undefined;
  districtCity?: string | undefined;
  areaNeighborhood?: string | null | undefined;
  addressDescription?: string | undefined;
  nearestLandmark?: string | null | undefined;
  phone?: string | undefined;
  mapLatitude?: number | null | undefined;
  mapLongitude?: number | null | undefined;
  deliveryInstructions?: string | null | undefined;
  isDefault?: boolean | undefined;
}

export interface CartItemPricingRecord {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantTitle: string | null;
  imageUrl: string | null;
  quantity: number;
  unitListPrice: number;
  unitPrice: number;
  lineItemsSubtotal: number;
  lineProductDiscount: number;
  lineTotal: number;
  inStock: boolean;
  availableQuantity: number;
  priceChanged: boolean;
  unavailableReason:
    | "product_unavailable"
    | "variant_unavailable"
    | "insufficient_stock"
    | null;
}

export interface AppliedCouponRecord {
  code: string;
  type: CouponDiscountType;
  value: number;
  minimumOrderAmount: number | null;
  discountAmount: number;
  valid: boolean;
  invalidReason:
    | "coupon_invalid"
    | "coupon_not_eligible"
    | null;
}

export interface MerchantCartGroup {
  store: MarketplaceStoreSummary;
  items: CartItemPricingRecord[];
  itemsSubtotal: number;
  productDiscount: number;
  subtotalAfterProductDiscount: number;
  coupon: AppliedCouponRecord | null;
  couponDiscount: number;
  preDeliveryTotal: number;
  deliveryStatus: "pending_phase_6";
  paymentStatus: "pending_phase_7";
  hasBlockingIssues: boolean;
}

export interface CartPricingTotals {
  itemsSubtotal: number;
  productDiscount: number;
  couponDiscount: number;
  preDeliveryTotal: number;
}

export interface CartResponse {
  id: string;
  currency: "AFN";
  groups: MerchantCartGroup[];
  totals: CartPricingTotals;
  itemCount: number;
  hasBlockingIssues: boolean;
  priceChanged: boolean;
  updatedAt: string;
}

export interface AddCartItemInput {
  productId: string;
  variantId?: string | null | undefined;
  quantity: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}

export interface ApplyCartCouponInput {
  storeId: string;
  code: string;
}

export interface CustomerAddressListResponse {
  addresses: CustomerAddressRecord[];
}

export interface CheckoutQuoteInput {
  addressId: string;
}

export interface CheckoutStepState {
  address: "ready";
  delivery: "pending_phase_6";
  payment: "pending_phase_7";
  review: "pricing_ready";
  placeOrder: "blocked_until_delivery_payment";
}

export interface CheckoutQuoteResponse {
  sessionId: string;
  status: "quoted";
  address: CustomerAddressRecord;
  cart: CartResponse;
  steps: CheckoutStepState;
  canProceedToDelivery: boolean;
  canPlaceOrder: false;
  expiresAt: string;
}

export const cartPricingErrorCodes = [
  "invalid_request",
  "invalid_session",
  "account_unavailable",
  "forbidden",
  "cart_empty",
  "cart_item_not_found",
  "product_unavailable",
  "variant_unavailable",
  "insufficient_stock",
  "address_not_found",
  "coupon_invalid",
  "coupon_not_eligible",
  "checkout_unavailable",
  "rate_limited",
  "service_unavailable"
] as const;

export type CartPricingErrorCode =
  (typeof cartPricingErrorCodes)[number];

export interface CartPricingErrorResponse {
  error: {
    code: CartPricingErrorCode;
  };
}
