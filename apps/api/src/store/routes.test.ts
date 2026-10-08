import type {
  AuthSessionResponse,
  AuthSuccessResponse,
  PublicStoreRecord,
  StoreListResponse,
  StorePlansResponse,
  StoreRecord
} from "@bazaarlink/contracts";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import { AuthError } from "../auth/errors.js";
import type { AuthServiceContract } from "../auth/service.js";
import { StoreError } from "./errors.js";
import type { StoreServiceContract } from "./service.js";

const now = new Date().toISOString();

const authSession: AuthSessionResponse = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    displayName: "Merchant",
    preferredLocale: "en",
    status: "active",
    roles: ["customer"]
  },
  expiresAt: new Date(Date.now() + 60_000).toISOString()
};

const store: StoreRecord = {
  id: "00000000-0000-4000-8000-000000000101",
  ownerUserId: authSession.user.id,
  name: "Kabul Mobile Center",
  handle: "kabul-mobile-center",
  category: "Electronics",
  province: "Kabul",
  cityDistrict: "Karte 4",
  phone: "+93700000000",
  preferredLocale: "en",
  logoUrl: null,
  coverImageUrl: null,
  description: null,
  whatsappNumber: null,
  physicalAddress: null,
  mapLatitude: null,
  mapLongitude: null,
  businessHours: null,
  featuredCategoryIds: [],
  featuredProductIds: [],
  customDomain: null,
  theme: "minimal",
  accentColor: "#0F766E",
  status: "draft",
  publishedAt: null,
  createdAt: now,
  updatedAt: now,
  subscription: {
    plan: "starter",
    status: "active",
    currentPeriodEnd: null,
    gracePeriodEnd: null,
    entitlements: {
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
  }
};

class FakeAuthService implements AuthServiceContract {
  async register(): Promise<AuthSuccessResponse> {
    throw new Error("not_used");
  }

  async login(): Promise<AuthSuccessResponse> {
    throw new Error("not_used");
  }

  async authenticateToken(token: string): Promise<AuthSessionResponse> {
    if (token !== "valid-token") {
      throw new AuthError("invalid_session", 401);
    }

    return authSession;
  }

  async logout(): Promise<void> {}
}

class FakeStoreService implements StoreServiceContract {
  createCalls = 0;
  ownedStore: StoreRecord | null = store;

  async listOwnedStores(): Promise<StoreListResponse> {
    return {
      stores: this.ownedStore ? [this.ownedStore] : []
    };
  }

  async getOwnedStore(): Promise<StoreRecord> {
    if (!this.ownedStore) {
      throw new StoreError("store_not_found", 404);
    }

    return this.ownedStore;
  }

  async createStore(): Promise<StoreRecord> {
    this.createCalls += 1;
    return store;
  }

  async updateStore(): Promise<StoreRecord> {
    return store;
  }

  async publishStore(): Promise<StoreRecord> {
    return {
      ...store,
      status: "published",
      publishedAt: now
    };
  }

  async getPublicStore(): Promise<PublicStoreRecord> {
    const {
      ownerUserId,
      subscription,
      ...publicStore
    } = {
      ...store,
      status: "published" as const,
      publishedAt: now
    };

    void ownerUserId;
    void subscription;

    return publicStore;
  }

  getPlans(): StorePlansResponse {
    return {
      plans: []
    };
  }
}

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("store routes", () => {
  it("requires authentication for seller store access", async () => {
    const app = buildApp({
      authService: new FakeAuthService(),
      storeService: new FakeStoreService()
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/seller/stores"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "invalid_session"
      }
    });
  });

  it("creates a valid empty store for an authenticated user", async () => {
    const service = new FakeStoreService();
    const app = buildApp({
      authService: new FakeAuthService(),
      storeService: service
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/seller/stores",
      headers: {
        authorization: "Bearer valid-token"
      },
      payload: {
        name: "Kabul Mobile Center",
        handle: "kabul-mobile-center",
        category: "Electronics",
        province: "Kabul",
        cityDistrict: "Karte 4",
        phone: "+93700000000",
        preferredLocale: "en"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(service.createCalls).toBe(1);
    expect(response.json()).toMatchObject({
      handle: "kabul-mobile-center",
      status: "draft"
    });
  });

  it("rejects unknown store fields and malformed handles", async () => {
    const service = new FakeStoreService();
    const app = buildApp({
      authService: new FakeAuthService(),
      storeService: service
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/seller/stores",
      headers: {
        authorization: "Bearer valid-token"
      },
      payload: {
        name: "Store",
        handle: "@@@",
        category: "Retail",
        province: "Kabul",
        cityDistrict: "Kabul",
        phone: "+93700000000",
        preferredLocale: "en",
        subscriptionPlan: "business"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(service.createCalls).toBe(0);
  });

  it("keeps public storefront access separate from seller authentication", async () => {
    const app = buildApp({
      authService: new FakeAuthService(),
      storeService: new FakeStoreService()
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/stores/kabul-mobile-center"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      handle: "kabul-mobile-center",
      status: "published"
    });
  });
});
