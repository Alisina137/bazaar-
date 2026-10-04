export const storeStatuses = [
  "draft",
  "published",
  "suspended"
] as const;

export type StoreStatus = (typeof storeStatuses)[number];

export const storeThemes = [
  "minimal",
  "modern",
  "fashion",
  "electronics",
  "food"
] as const;

export type StoreTheme = (typeof storeThemes)[number];

export const subscriptionPlanCodes = [
  "starter",
  "pro",
  "business"
] as const;

export type SubscriptionPlanCode =
  (typeof subscriptionPlanCodes)[number];

export const subscriptionStatuses = [
  "active",
  "grace_period",
  "expired",
  "canceled"
] as const;

export type SubscriptionStatus =
  (typeof subscriptionStatuses)[number];

export interface StoreEntitlements {
  productLimit: number;
  categoryLimit: number | null;
  staffLimit: number;
  advancedInventory: boolean;
  advancedDelivery: boolean;
  discounts: boolean;
  coupons: boolean;
  advancedAnalytics: boolean;
  premiumStorefront: boolean;
  customDomain: boolean;
}

export interface SubscriptionPlanSummary {
  code: SubscriptionPlanCode;
  entitlements: StoreEntitlements;
  paidUpgradeAvailable: boolean;
}

export interface StoreSubscription {
  plan: SubscriptionPlanCode;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  gracePeriodEnd: string | null;
  entitlements: StoreEntitlements;
}

export interface StoreRecord {
  id: string;
  ownerUserId: string;
  name: string;
  handle: string;
  category: string;
  province: string;
  cityDistrict: string;
  phone: string;
  preferredLocale: "fa-AF" | "ps-AF" | "en";
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  whatsappNumber: string | null;
  physicalAddress: string | null;
  mapLatitude: number | null;
  mapLongitude: number | null;
  businessHours: string | null;
  theme: StoreTheme;
  accentColor: string;
  status: StoreStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: StoreSubscription;
}

export type PublicStoreRecord = Omit<
  StoreRecord,
  "ownerUserId" | "subscription"
>;

export interface CreateStoreInput {
  name: string;
  handle: string;
  category: string;
  province: string;
  cityDistrict: string;
  phone: string;
  preferredLocale: "fa-AF" | "ps-AF" | "en";
  logoUrl?: string | null | undefined;
  coverImageUrl?: string | null | undefined;
  description?: string | null | undefined;
  whatsappNumber?: string | null | undefined;
  physicalAddress?: string | null | undefined;
  mapLatitude?: number | null | undefined;
  mapLongitude?: number | null | undefined;
  businessHours?: string | null | undefined;
  theme?: StoreTheme | undefined;
  accentColor?: string | undefined;
}

export interface UpdateStoreInput {
  name?: string | undefined;
  handle?: string | undefined;
  category?: string | undefined;
  province?: string | undefined;
  cityDistrict?: string | undefined;
  phone?: string | undefined;
  preferredLocale?: "fa-AF" | "ps-AF" | "en" | undefined;
  logoUrl?: string | null | undefined;
  coverImageUrl?: string | null | undefined;
  description?: string | null | undefined;
  whatsappNumber?: string | null | undefined;
  physicalAddress?: string | null | undefined;
  mapLatitude?: number | null | undefined;
  mapLongitude?: number | null | undefined;
  businessHours?: string | null | undefined;
  theme?: StoreTheme | undefined;
  accentColor?: string | undefined;
}

export const storeErrorCodes = [
  "invalid_request",
  "invalid_session",
  "account_unavailable",
  "forbidden",
  "rate_limited",
  "store_not_found",
  "handle_in_use",
  "store_suspended",
  "store_not_ready",
  "subscription_unavailable",
  "service_unavailable"
] as const;

export type StoreErrorCode =
  (typeof storeErrorCodes)[number];

export interface StoreErrorResponse {
  error: {
    code: StoreErrorCode;
  };
}

export interface StoreListResponse {
  stores: StoreRecord[];
}

export interface StorePlansResponse {
  plans: SubscriptionPlanSummary[];
}
