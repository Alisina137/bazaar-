import type {
  MerchantCouponRecord,
  SubscriptionChangeRecord
} from "@bazaarlink/contracts";
import { describe, expect, it, vi } from "vitest";

import type {
  GrowthRepository,
  ResolvedGrowthAccess
} from "./repository.js";
import { GrowthService } from "./service.js";

const STORE_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "22222222-2222-4222-8222-222222222222";
const STAFF_ID = "33333333-3333-4333-8333-333333333333";

function access(
  plan: "starter" | "pro" | "business",
  role: "owner" | "staff" = "owner",
  permissions: ResolvedGrowthAccess["permissions"] = []
): ResolvedGrowthAccess {
  return {
    storeId: STORE_ID,
    ownerUserId: OWNER_ID,
    plan,
    subscriptionStatus: "active",
    role,
    permissions:
      role === "owner"
        ? [
            "products",
            "inventory",
            "orders",
            "customers",
            "discounts",
            "analytics",
            "delivery",
            "storefront"
          ]
        : permissions
  };
}

function coupon(): MerchantCouponRecord {
  const now = new Date().toISOString();
  return {
    id: "44444444-4444-4444-8444-444444444444",
    storeId: STORE_ID,
    code: "SAVE10",
    type: "percentage",
    value: 10,
    minimumOrderAmount: null,
    active: true,
    startsAt: null,
    endsAt: null,
    createdAt: now,
    updatedAt: now
  };
}

function change(
  fromPlan: "starter" | "pro" | "business",
  toPlan: "starter" | "pro" | "business"
): SubscriptionChangeRecord {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    storeId: STORE_ID,
    fromPlan,
    toPlan,
    direction:
      ({ starter: 0, pro: 1, business: 2 }[toPlan] >
      { starter: 0, pro: 1, business: 2 }[fromPlan]
        ? "upgrade"
        : "downgrade"),
    changedAt: new Date().toISOString(),
    gracePeriodEnd: null,
    restrictedProductCount: 0,
    restoredProductCount: 0,
    entitlements:
      toPlan === "starter"
        ? {
            productLimit: 15,
            categoryLimit: 5,
            staffLimit: 0,
            advancedInventory: false,
            advancedDelivery: false,
            discounts: false,
            coupons: false,
            promotions: false,
            advancedAnalytics: false,
            premiumStorefront: false,
            customDomain: false
          }
        : {
            productLimit: toPlan === "pro" ? 300 : 1200,
            categoryLimit: null,
            staffLimit: toPlan === "pro" ? 3 : 10,
            advancedInventory: true,
            advancedDelivery: true,
            discounts: true,
            coupons: true,
            promotions: true,
            advancedAnalytics: true,
            premiumStorefront: true,
            customDomain: true
          }
  };
}

describe("GrowthService", () => {
  it("blocks Starter from coupon tools", async () => {
    const repository = {
      resolveAccess: vi.fn().mockResolvedValue(access("starter")),
      listCoupons: vi.fn()
    } as unknown as GrowthRepository;

    const service = new GrowthService(repository);

    await expect(
      service.listCoupons(OWNER_ID, STORE_ID)
    ).rejects.toMatchObject({
      code: "feature_not_available",
      statusCode: 409
    });
    expect(repository.listCoupons).not.toHaveBeenCalled();
  });

  it("allows Pro coupon tools", async () => {
    const repository = {
      resolveAccess: vi.fn().mockResolvedValue(access("pro")),
      listCoupons: vi.fn().mockResolvedValue([coupon()])
    } as unknown as GrowthRepository;

    const result = await new GrowthService(repository).listCoupons(
      OWNER_ID,
      STORE_ID
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.code).toBe("SAVE10");
  });

  it("enforces granular staff permissions on the server", async () => {
    const repository = {
      resolveAccess: vi.fn().mockResolvedValue(
        access("pro", "staff", ["products"])
      ),
      analytics: vi.fn()
    } as unknown as GrowthRepository;

    await expect(
      new GrowthService(repository).analytics(STAFF_ID, STORE_ID, 30)
    ).rejects.toMatchObject({
      code: "forbidden",
      statusCode: 403
    });
    expect(repository.analytics).not.toHaveBeenCalled();
  });

  it("returns paged downgrade resources without loading the full catalog", async () => {
    const repository = {
      resolveAccess: vi.fn().mockResolvedValue(access("business")),
      subscriptionResourcePage: vi.fn().mockResolvedValue({
        type: "products",
        items: [
          { id: "p1", label: "Product 1", status: "active" }
        ],
        pageInfo: {
          offset: 0,
          limit: 50,
          total: 1200,
          hasMore: true
        }
      })
    } as unknown as GrowthRepository;

    const result = await new GrowthService(repository).subscriptionResources(
      OWNER_ID,
      STORE_ID,
      "products",
      0,
      50
    );

    expect(result.pageInfo.total).toBe(1200);
    expect(result.pageInfo.hasMore).toBe(true);
    expect(repository.subscriptionResourcePage).toHaveBeenCalledWith(
      STORE_ID,
      "products",
      0,
      50
    );
  });

  it("requires exact resource selections when a downgrade exceeds limits", async () => {
    const repository = {
      resolveAccess: vi.fn().mockResolvedValue(access("business")),
      planUsage: vi.fn().mockResolvedValue({
        productCount: 16,
        productLimit: 1200,
        activeCategoryCount: 6,
        categoryLimit: null,
        activeStaffCount: 2,
        staffLimit: 10,
        restrictedProductCount: 0
      })
    } as unknown as GrowthRepository;

    await expect(
      new GrowthService(repository).changeSubscription(
        OWNER_ID,
        STORE_ID,
        {
          plan: "starter",
          keepProductIds: ["p1"],
          keepCategoryIds: ["c1"]
        }
      )
    ).rejects.toMatchObject({
      code: "invalid_request",
      statusCode: 400
    });
  });

  it("downgrades without deleting data and passes only selected resources", async () => {
    const productIds = Array.from({ length: 15 }, (_, i) => "p" + i);
    const categoryIds = Array.from({ length: 5 }, (_, i) => "c" + i);
    const applySubscriptionChange = vi.fn().mockResolvedValue(
      change("business", "starter")
    );
    const repository = {
      resolveAccess: vi.fn().mockResolvedValue(access("business")),
      planUsage: vi.fn()
        .mockResolvedValueOnce({
          productCount: 16,
          productLimit: 1200,
          activeCategoryCount: 6,
          categoryLimit: null,
          activeStaffCount: 2,
          staffLimit: 10,
          restrictedProductCount: 0
        })
        .mockResolvedValueOnce({
          productCount: 15,
          productLimit: 15,
          activeCategoryCount: 5,
          categoryLimit: 5,
          activeStaffCount: 0,
          staffLimit: 0,
          restrictedProductCount: 1
        }),
      validateSubscriptionResourceIds: vi.fn().mockResolvedValue(true),
      applySubscriptionChange,
      recordEvent: vi.fn().mockResolvedValue(undefined)
    } as unknown as GrowthRepository;

    const result = await new GrowthService(repository).changeSubscription(
      OWNER_ID,
      STORE_ID,
      {
        plan: "starter",
        keepProductIds: productIds,
        keepCategoryIds: categoryIds,
        keepStaffIds: []
      }
    );

    expect(result.usage).toMatchObject({
      productCount: 15,
      categoryLimit: 5,
      staffLimit: 0,
      restrictedProductCount: 1
    });
    expect(applySubscriptionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: OWNER_ID,
        storeId: STORE_ID,
        toPlan: "starter",
        keepProductIds: productIds,
        keepCategoryIds: categoryIds,
        keepStaffIds: []
      })
    );
  });

  it("changes to a higher plan without forcing downgrade selections", async () => {
    const applySubscriptionChange = vi.fn().mockResolvedValue(
      change("starter", "pro")
    );
    const repository = {
      resolveAccess: vi.fn().mockResolvedValue(access("starter")),
      planUsage: vi.fn()
        .mockResolvedValueOnce({
          productCount: 15,
          productLimit: 15,
          activeCategoryCount: 5,
          categoryLimit: 5,
          activeStaffCount: 0,
          staffLimit: 0,
          restrictedProductCount: 0
        })
        .mockResolvedValueOnce({
          productCount: 15,
          productLimit: 300,
          activeCategoryCount: 5,
          categoryLimit: null,
          activeStaffCount: 0,
          staffLimit: 3,
          restrictedProductCount: 0
        }),
      applySubscriptionChange,
      recordEvent: vi.fn().mockResolvedValue(undefined)
    } as unknown as GrowthRepository;

    await new GrowthService(repository).changeSubscription(
      OWNER_ID,
      STORE_ID,
      { plan: "pro" }
    );

    expect(applySubscriptionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        keepProductIds: null,
        keepCategoryIds: null,
        keepStaffIds: null
      })
    );
  });
});
