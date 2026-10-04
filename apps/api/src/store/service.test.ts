import type {
  CreateStoreInput,
  StoreRecord,
  UpdateStoreInput
} from "@bazaarlink/contracts";
import { describe, expect, it } from "vitest";

import { StoreRepositoryConflictError } from "./errors.js";
import type { StoreRepository } from "./repository.js";
import { StoreService } from "./service.js";

const now = new Date().toISOString();

function sampleStore(
  overrides: Partial<StoreRecord> = {}
): StoreRecord {
  return {
    id: "00000000-0000-4000-8000-000000000101",
    ownerUserId: "00000000-0000-4000-8000-000000000001",
    name: "Kabul Mobile Center",
    handle: "kabul-mobile-center",
    category: "Electronics",
    province: "Kabul",
    cityDistrict: "Karte 4",
    phone: "+93700000000",
    preferredLocale: "fa-AF",
    logoUrl: null,
    coverImageUrl: null,
    description: null,
    whatsappNumber: null,
    physicalAddress: null,
    mapLatitude: null,
    mapLongitude: null,
    businessHours: null,
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
        advancedAnalytics: false,
        premiumStorefront: false,
        customDomain: false
      }
    },
    ...overrides
  };
}

class FakeStoreRepository implements StoreRepository {
  store: StoreRecord | null = sampleStore();
  conflict = false;

  async listOwnedStores(): Promise<StoreRecord[]> {
    return this.store ? [this.store] : [];
  }

  async findOwnedStore(): Promise<StoreRecord | null> {
    return this.store;
  }

  async findPublicStoreByHandle(): Promise<StoreRecord | null> {
    return this.store?.status === "published" ? this.store : null;
  }

  async createStore(
    _ownerUserId: string,
    input: CreateStoreInput
  ): Promise<StoreRecord> {
    if (this.conflict) {
      throw new StoreRepositoryConflictError();
    }

    this.store = sampleStore({
      name: input.name,
      handle: input.handle
    });

    return this.store;
  }

  async updateStore(
    _ownerUserId: string,
    _storeId: string,
    input: UpdateStoreInput
  ): Promise<StoreRecord | null> {
    void _ownerUserId;
    void _storeId;
    void input;

    if (this.conflict) {
      throw new StoreRepositoryConflictError();
    }

    if (!this.store) return null;

    this.store = {
      ...this.store,
      updatedAt: new Date().toISOString()
    };

    return this.store;
  }

  async publishStore(): Promise<StoreRecord | null> {
    if (!this.store) return null;

    this.store = {
      ...this.store,
      status: "published",
      publishedAt: new Date().toISOString()
    };

    return this.store;
  }
}

describe("StoreService", () => {
  it("normalizes handles before store creation", async () => {
    const repository = new FakeStoreRepository();
    const service = new StoreService(repository);

    const created = await service.createStore(
      "00000000-0000-4000-8000-000000000001",
      {
        name: " Kabul Mobile Center ",
        handle: " Kabul_Mobile   Center ",
        category: " Electronics ",
        province: " Kabul ",
        cityDistrict: " Karte 4 ",
        phone: " +93700000000 ",
        preferredLocale: "fa-AF"
      }
    );

    expect(created.name).toBe("Kabul Mobile Center");
    expect(created.handle).toBe("kabul-mobile-center");
  });

  it("maps duplicate handles to a safe conflict", async () => {
    const repository = new FakeStoreRepository();
    repository.conflict = true;
    const service = new StoreService(repository);

    await expect(
      service.createStore(
        "00000000-0000-4000-8000-000000000001",
        {
          name: "Store",
          handle: "taken-handle",
          category: "Retail",
          province: "Kabul",
          cityDistrict: "Kabul",
          phone: "+93700000000",
          preferredLocale: "en"
        }
      )
    ).rejects.toMatchObject({
      code: "handle_in_use",
      statusCode: 409
    });
  });

  it("blocks publication when the subscription is unavailable", async () => {
    const repository = new FakeStoreRepository();
    repository.store = sampleStore({
      subscription: {
        ...sampleStore().subscription,
        status: "expired"
      }
    });

    const service = new StoreService(repository);

    await expect(
      service.publishStore(
        repository.store.ownerUserId,
        repository.store.id
      )
    ).rejects.toMatchObject({
      code: "subscription_unavailable",
      statusCode: 409
    });
  });

  it("blocks publication of suspended stores", async () => {
    const repository = new FakeStoreRepository();
    repository.store = sampleStore({
      status: "suspended"
    });

    const service = new StoreService(repository);

    await expect(
      service.publishStore(
        repository.store.ownerUserId,
        repository.store.id
      )
    ).rejects.toMatchObject({
      code: "store_suspended",
      statusCode: 403
    });
  });

  it("keeps repeated publish idempotent", async () => {
    const repository = new FakeStoreRepository();
    const publishedAt = new Date(Date.now() - 60_000).toISOString();
    repository.store = sampleStore({
      status: "published",
      publishedAt
    });

    const service = new StoreService(repository);
    const published = await service.publishStore(
      repository.store.ownerUserId,
      repository.store.id
    );

    expect(published.publishedAt).toBe(publishedAt);
  });

  it("returns only published stores publicly", async () => {
    const repository = new FakeStoreRepository();
    const service = new StoreService(repository);

    await expect(
      service.getPublicStore("kabul-mobile-center")
    ).rejects.toMatchObject({
      code: "store_not_found",
      statusCode: 404
    });

    repository.store = sampleStore({
      status: "published",
      publishedAt: now
    });

    const publicStore = await service.getPublicStore(
      "kabul-mobile-center"
    );

    expect(publicStore.handle).toBe("kabul-mobile-center");
    expect("ownerUserId" in publicStore).toBe(false);
    expect("subscription" in publicStore).toBe(false);
  });
});
