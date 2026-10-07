import { describe, expect, it } from "vitest";

import {
  getStoreEntitlements,
  getSubscriptionPlans
} from "./entitlements.js";

describe("store subscription entitlements", () => {
  it("enforces Starter limits from the Product Specification", () => {
    expect(getStoreEntitlements("starter")).toMatchObject({
      productLimit: 15,
      categoryLimit: 5,
      staffLimit: 0,
      advancedInventory: false,
      advancedDelivery: false,
      discounts: false,
      coupons: false,
      promotions: false,
      advancedAnalytics: false,
      premiumStorefront: false
    });
  });

  it("enforces Pro limits without hardcoding plan pricing", () => {
    expect(getStoreEntitlements("pro")).toMatchObject({
      productLimit: 300,
      categoryLimit: null,
      staffLimit: 3,
      advancedInventory: true,
      advancedDelivery: true,
      discounts: true,
      coupons: true,
      promotions: true,
      advancedAnalytics: true,
      premiumStorefront: true
    });

    expect(
      getSubscriptionPlans().plans.find((plan) => plan.code === "pro")
    ).toMatchObject({
      paidUpgradeAvailable: true
    });
  });

  it("enforces Business limits from the Product Specification", () => {
    expect(getStoreEntitlements("business")).toMatchObject({
      productLimit: 1200,
      categoryLimit: null,
      staffLimit: 10,
      advancedInventory: true,
      advancedDelivery: true,
      discounts: true,
      coupons: true,
      promotions: true,
      advancedAnalytics: true,
      premiumStorefront: true
    });
  });
});
