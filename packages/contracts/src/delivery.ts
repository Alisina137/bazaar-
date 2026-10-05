import type {
  CartResponse,
  CustomerAddressRecord
} from "./cart-pricing.js";
import type {
  StoreEntitlements,
  StoreRecord
} from "./store.js";

export const deliveryDistanceRuleTypes = [
  "tier",
  "base_per_km"
] as const;
export type DeliveryDistanceRuleType =
  (typeof deliveryDistanceRuleTypes)[number];

export const deliverySurchargeTypes = [
  "fixed",
  "multiplier"
] as const;
export type DeliverySurchargeType =
  (typeof deliverySurchargeTypes)[number];

export const deliverySpeedKinds = [
  "economy",
  "standard",
  "same_day",
  "express",
  "custom"
] as const;
export type DeliverySpeedKind =
  (typeof deliverySpeedKinds)[number];

export const productDeliveryProfiles = [
  "normal",
  "bulky",
  "fragile",
  "pickup_only",
  "no_express",
  "seller_delivery_only",
  "digital_no_delivery"
] as const;
export type ProductDeliveryProfile =
  (typeof productDeliveryProfiles)[number];

export interface StoreDeliverySettingsRecord {
  storeId: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  originAddress: string | null;
  originProvince: string | null;
  originDistrict: string | null;
  originArea: string | null;
  originLatitude: number | null;
  originLongitude: number | null;
  defaultDeliveryFee: number | null;
  freeDeliveryThreshold: number | null;
  minimumOrderAmount: number | null;
  operatingWeekdays: number[];
  cutoffTime: string | null;
  pickupMinMinutes: number;
  pickupMaxMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateStoreDeliverySettingsInput {
  deliveryEnabled?: boolean | undefined;
  pickupEnabled?: boolean | undefined;
  originAddress?: string | null | undefined;
  originProvince?: string | null | undefined;
  originDistrict?: string | null | undefined;
  originArea?: string | null | undefined;
  originLatitude?: number | null | undefined;
  originLongitude?: number | null | undefined;
  defaultDeliveryFee?: number | null | undefined;
  freeDeliveryThreshold?: number | null | undefined;
  minimumOrderAmount?: number | null | undefined;
  operatingWeekdays?: number[] | undefined;
  cutoffTime?: string | null | undefined;
  pickupMinMinutes?: number | undefined;
  pickupMaxMinutes?: number | undefined;
}

export interface DeliveryZoneRecord {
  id: string;
  storeId: string;
  name: string;
  province: string | null;
  districtCity: string | null;
  areaNeighborhood: string | null;
  fee: number;
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryZoneInput {
  name: string;
  province?: string | null | undefined;
  districtCity?: string | null | undefined;
  areaNeighborhood?: string | null | undefined;
  fee: number;
  priority?: number | undefined;
  active?: boolean | undefined;
}

export interface UpdateDeliveryZoneInput {
  name?: string | undefined;
  province?: string | null | undefined;
  districtCity?: string | null | undefined;
  areaNeighborhood?: string | null | undefined;
  fee?: number | undefined;
  priority?: number | undefined;
  active?: boolean | undefined;
}

export interface DeliveryDistanceRuleRecord {
  id: string;
  storeId: string;
  name: string;
  type: DeliveryDistanceRuleType;
  minDistanceKm: number;
  maxDistanceKm: number | null;
  fee: number | null;
  baseFee: number | null;
  perKmFee: number | null;
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryDistanceRuleInput {
  name: string;
  type: DeliveryDistanceRuleType;
  minDistanceKm?: number | undefined;
  maxDistanceKm?: number | null | undefined;
  fee?: number | null | undefined;
  baseFee?: number | null | undefined;
  perKmFee?: number | null | undefined;
  priority?: number | undefined;
  active?: boolean | undefined;
}

export interface UpdateDeliveryDistanceRuleInput {
  name?: string | undefined;
  type?: DeliveryDistanceRuleType | undefined;
  minDistanceKm?: number | undefined;
  maxDistanceKm?: number | null | undefined;
  fee?: number | null | undefined;
  baseFee?: number | null | undefined;
  perKmFee?: number | null | undefined;
  priority?: number | undefined;
  active?: boolean | undefined;
}

export interface DeliverySpeedRecord {
  id: string;
  storeId: string;
  name: string;
  kind: DeliverySpeedKind;
  surchargeType: DeliverySurchargeType;
  surchargeValue: number;
  minEtaMinutes: number;
  maxEtaMinutes: number;
  minimumOrderAmount: number | null;
  maxRangeKm: number | null;
  cutoffTime: string | null;
  supportedWeekdays: number[];
  maxWeightGrams: number | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliverySpeedInput {
  name: string;
  kind: DeliverySpeedKind;
  surchargeType?: DeliverySurchargeType | undefined;
  surchargeValue?: number | undefined;
  minEtaMinutes: number;
  maxEtaMinutes: number;
  minimumOrderAmount?: number | null | undefined;
  maxRangeKm?: number | null | undefined;
  cutoffTime?: string | null | undefined;
  supportedWeekdays?: number[] | undefined;
  maxWeightGrams?: number | null | undefined;
  sortOrder?: number | undefined;
  active?: boolean | undefined;
}

export interface UpdateDeliverySpeedInput {
  name?: string | undefined;
  kind?: DeliverySpeedKind | undefined;
  surchargeType?: DeliverySurchargeType | undefined;
  surchargeValue?: number | undefined;
  minEtaMinutes?: number | undefined;
  maxEtaMinutes?: number | undefined;
  minimumOrderAmount?: number | null | undefined;
  maxRangeKm?: number | null | undefined;
  cutoffTime?: string | null | undefined;
  supportedWeekdays?: number[] | undefined;
  maxWeightGrams?: number | null | undefined;
  sortOrder?: number | undefined;
  active?: boolean | undefined;
}

export interface StoreDeliveryConfigurationResponse {
  store: Pick<
    StoreRecord,
    "id" | "name" | "province" | "cityDistrict" | "subscription"
  >;
  entitlements: StoreEntitlements;
  settings: StoreDeliverySettingsRecord;
  zones: DeliveryZoneRecord[];
  distanceRules: DeliveryDistanceRuleRecord[];
  speeds: DeliverySpeedRecord[];
}

export type DeliveryRuleType =
  | "zone"
  | "distance_tier"
  | "base_per_km"
  | "store_default"
  | "pickup"
  | "digital"
  | "free_delivery";

export interface DeliveryRuleAudit {
  type: DeliveryRuleType;
  id: string | null;
  label: string;
  zoneId: string | null;
  distanceKm: number | null;
  distanceSource:
    | "straight_line_fallback"
    | "not_required"
    | "unavailable";
}

export interface DeliveryPriceBreakdown {
  baseDelivery: number;
  urgencySurcharge: number;
  productDeliverySurcharge: number;
  freeDeliveryDiscount: number;
  finalDeliveryPrice: number;
}

export interface DeliveryOptionQuote {
  optionId: string;
  storeId: string;
  fulfillmentType: "delivery" | "pickup" | "digital";
  label: string;
  speedKind: DeliverySpeedKind | null;
  price: DeliveryPriceBreakdown;
  estimatedMinAt: string | null;
  estimatedMaxAt: string | null;
  ruleUsed: DeliveryRuleAudit;
}

export interface DeliveryMerchantQuote {
  storeId: string;
  storeName: string;
  available: boolean;
  unavailableReason:
    | "delivery_disabled"
    | "outside_coverage"
    | "minimum_order"
    | "operating_day"
    | "cutoff_missed"
    | "product_restriction"
    | "address_location_required"
    | null;
  options: DeliveryOptionQuote[];
}

export interface DeliveryOptionsInput {
  addressId: string;
}

export interface DeliveryOptionsResponse {
  address: CustomerAddressRecord;
  cart: CartResponse;
  merchantGroups: DeliveryMerchantQuote[];
  canContinue: boolean;
  quotedAt: string;
}

export interface DeliverySelectionInput {
  storeId: string;
  optionId: string;
}

export interface CreateDeliveryCheckoutQuoteInput {
  addressId: string;
  selections: DeliverySelectionInput[];
}

export interface DeliveryCheckoutTotals {
  itemsSubtotal: number;
  productDiscount: number;
  couponDiscount: number;
  preDeliveryTotal: number;
  deliveryBase: number;
  urgencySurcharge: number;
  productDeliverySurcharge: number;
  freeDeliveryDiscount: number;
  deliveryTotal: number;
  disclosedFees: number;
  configuredTax: number;
  finalBeforePaymentTotal: number;
}

export interface DeliveryCheckoutQuoteResponse {
  sessionId: string;
  status: "quoted";
  address: CustomerAddressRecord;
  cart: CartResponse;
  deliverySelections: DeliveryOptionQuote[];
  totals: DeliveryCheckoutTotals;
  steps: {
    address: "ready";
    delivery: "ready";
    payment: "pending_phase_7";
    review: "delivery_pricing_ready";
    placeOrder: "blocked_until_payment";
  };
  canProceedToPayment: boolean;
  canPlaceOrder: false;
  expiresAt: string;
}

export const deliveryErrorCodes = [
  "invalid_request",
  "invalid_session",
  "account_unavailable",
  "forbidden",
  "store_not_found",
  "subscription_unavailable",
  "advanced_delivery_unavailable",
  "delivery_configuration_not_found",
  "delivery_zone_not_found",
  "delivery_distance_rule_not_found",
  "delivery_speed_not_found",
  "address_not_found",
  "cart_empty",
  "delivery_unavailable",
  "delivery_option_invalid",
  "checkout_unavailable",
  "rate_limited",
  "service_unavailable"
] as const;

export type DeliveryErrorCode =
  (typeof deliveryErrorCodes)[number];

export interface DeliveryErrorResponse {
  error: {
    code: DeliveryErrorCode;
  };
}
