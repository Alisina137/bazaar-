import type {
  StoreEntitlements,
  StorePlansResponse,
  SubscriptionPlanCode,
  SubscriptionPlanSummary
} from "@bazaarlink/contracts";

const entitlementByPlan: Record<
  SubscriptionPlanCode,
  StoreEntitlements
> = {
  starter: {
    productLimit: 15,
    categoryLimit: 5,
    staffLimit: 0,
    advancedInventory: false,
    advancedDelivery: false,
    discounts: false,
    coupons: false,
    advancedAnalytics: false,
    premiumStorefront: false,
    customDomain: false
  },
  pro: {
    productLimit: 300,
    categoryLimit: null,
    staffLimit: 3,
    advancedInventory: true,
    advancedDelivery: true,
    discounts: true,
    coupons: true,
    advancedAnalytics: true,
    premiumStorefront: true,
    customDomain: true
  },
  business: {
    productLimit: 1200,
    categoryLimit: null,
    staffLimit: 10,
    advancedInventory: true,
    advancedDelivery: true,
    discounts: true,
    coupons: true,
    advancedAnalytics: true,
    premiumStorefront: true,
    customDomain: true
  }
};

export function getStoreEntitlements(
  plan: SubscriptionPlanCode
): StoreEntitlements {
  return entitlementByPlan[plan];
}

export function getSubscriptionPlans(): StorePlansResponse {
  const plans: SubscriptionPlanSummary[] = (
    Object.keys(entitlementByPlan) as SubscriptionPlanCode[]
  ).map((code) => ({
    code,
    entitlements: entitlementByPlan[code],
    paidUpgradeAvailable: false
  }));

  return {
    plans
  };
}
