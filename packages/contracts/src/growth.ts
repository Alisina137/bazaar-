import type {
  SubscriptionPlanCode,
  StoreEntitlements
} from "./store.js";

export const merchantStaffPermissions = [
  "products",
  "inventory",
  "orders",
  "customers",
  "discounts",
  "analytics",
  "delivery",
  "storefront"
] as const;

export type MerchantStaffPermission =
  (typeof merchantStaffPermissions)[number];

export interface MerchantStoreAccess {
  role: "owner" | "staff";
  permissions: MerchantStaffPermission[];
}

export interface ResolvedGrowthAccess extends MerchantStoreAccess {
  storeId: string;
  ownerUserId: string;
  plan: SubscriptionPlanCode;
  subscriptionStatus:
    | "active"
    | "grace_period"
    | "expired"
    | "canceled";
}

export const growthAnalyticsEvents = [
  "signup_completed",
  "merchant_onboarding_started",
  "merchant_onboarding_completed",
  "store_published",
  "category_created",
  "product_created",
  "product_published",
  "marketplace_search",
  "product_viewed",
  "add_to_cart",
  "checkout_started",
  "delivery_option_selected",
  "payment_started",
  "payment_success",
  "payment_failed",
  "order_created",
  "order_confirmed",
  "order_delivered",
  "review_created",
  "upgrade_started",
  "subscription_upgraded",
  "subscription_downgraded"
] as const;

export type GrowthAnalyticsEvent =
  (typeof growthAnalyticsEvents)[number];

export interface AnalyticsMetricPoint {
  date: string;
  value: number;
}

export interface MerchantTopProduct {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  views: number;
}

export interface MerchantAnalyticsResponse {
  storeId: string;
  plan: SubscriptionPlanCode;
  advanced: boolean;
  periodDays: number;
  totalOrders: number;
  totalSales: number;
  totalCustomers: number;
  repeatCustomers: number | null;
  repeatCustomerRate: number | null;
  conversionRate: number | null;
  productDiscountTotal: number;
  couponDiscountTotal: number;
  deliveryCompletedCount: number | null;
  deliveryFailedCount: number | null;
  topProducts: MerchantTopProduct[];
  revenueTrend: AnalyticsMetricPoint[] | null;
  orderTrend: AnalyticsMetricPoint[] | null;
  trafficSourceAvailable: false;
}

export interface MerchantDashboardResponse {
  storeId: string;
  today: {
    orders: number;
    sales: number;
    customers: number;
  };
  needsAttention: {
    newOrders: number;
    lowStock: number;
    failedPayments: number;
    deliveryIssues: number;
  };
  store: {
    activeProducts: number;
    plan: SubscriptionPlanCode;
    productLimit: number;
    productCount: number;
    storeStatus: "draft" | "published" | "suspended";
  };
  recentActivity: Array<{
    id: string;
    type: "order" | "review" | "inventory";
    label: string;
    createdAt: string;
  }>;
}

export type GrowthCouponType = "percentage" | "fixed";

export interface MerchantCouponRecord {
  id: string;
  storeId: string;
  code: string;
  type: GrowthCouponType;
  value: number;
  minimumOrderAmount: number | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMerchantCouponInput {
  code: string;
  type: GrowthCouponType;
  value: number;
  minimumOrderAmount?: number | null | undefined;
  active?: boolean | undefined;
  startsAt?: string | null | undefined;
  endsAt?: string | null | undefined;
}

export type UpdateMerchantCouponInput =
  Partial<CreateMerchantCouponInput>;

export interface MerchantPromotionRecord {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  name: string;
  promotionalPrice: number;
  active: boolean;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMerchantPromotionInput {
  productId: string;
  name: string;
  promotionalPrice: number;
  startsAt: string;
  endsAt: string;
  active?: boolean | undefined;
}

export interface UpdateMerchantPromotionInput {
  name?: string | undefined;
  promotionalPrice?: number | undefined;
  startsAt?: string | undefined;
  endsAt?: string | undefined;
  active?: boolean | undefined;
}

export interface MerchantStaffRecord {
  id: string;
  storeId: string;
  userId: string;
  displayName: string | null;
  email: string | null;
  permissions: MerchantStaffPermission[];
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
}

export interface MerchantStaffInviteRecord {
  id: string;
  storeId: string;
  email: string;
  permissions: MerchantStaffPermission[];
  status: "pending" | "accepted" | "revoked" | "expired";
  inviteCode: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface CreateMerchantStaffInviteInput {
  email: string;
  permissions: MerchantStaffPermission[];
}

export interface UpdateMerchantStaffInput {
  permissions?: MerchantStaffPermission[] | undefined;
  status?: "active" | "suspended" | undefined;
}

export interface AcceptMerchantStaffInviteInput {
  inviteCode: string;
}

export interface MerchantStaffResponse {
  staff: MerchantStaffRecord[];
  invites: MerchantStaffInviteRecord[];
  staffLimit: number;
  activeStaffCount: number;
}

export interface SubscriptionChangeInput {
  plan: SubscriptionPlanCode;
  keepProductIds?: string[] | undefined;
  keepCategoryIds?: string[] | undefined;
  keepStaffIds?: string[] | undefined;
}

export interface SubscriptionChangeRecord {
  id: string;
  storeId: string;
  fromPlan: SubscriptionPlanCode;
  toPlan: SubscriptionPlanCode;
  direction: "upgrade" | "downgrade";
  changedAt: string;
  gracePeriodEnd: string | null;
  restrictedProductCount: number;
  restoredProductCount: number;
  entitlements: StoreEntitlements;
}

export type SubscriptionResourceType = "products" | "categories" | "staff";

export interface SubscriptionResourceItem {
  id: string;
  label: string;
  status: string;
}

export interface SubscriptionResourcePage {
  type: SubscriptionResourceType;
  items: SubscriptionResourceItem[];
  pageInfo: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface SubscriptionPlanUsage {
  productCount: number;
  productLimit: number;
  activeCategoryCount: number;
  categoryLimit: number | null;
  activeStaffCount: number;
  staffLimit: number;
  restrictedProductCount: number;
}

export interface SubscriptionGrowthResponse {
  change: SubscriptionChangeRecord;
  usage: SubscriptionPlanUsage;
}

export const growthErrorCodes = [
  "invalid_request",
  "invalid_session",
  "account_unavailable",
  "forbidden",
  "store_not_found",
  "product_not_found",
  "coupon_not_found",
  "coupon_code_in_use",
  "promotion_not_found",
  "promotion_conflict",
  "feature_not_available",
  "staff_not_found",
  "staff_limit_reached",
  "staff_invite_not_found",
  "staff_invite_expired",
  "staff_invite_email_mismatch",
  "subscription_unavailable",
  "same_subscription_plan",
  "rate_limited",
  "service_unavailable"
] as const;

export type GrowthErrorCode =
  (typeof growthErrorCodes)[number];

export interface GrowthErrorResponse {
  error: {
    code: GrowthErrorCode;
  };
}
