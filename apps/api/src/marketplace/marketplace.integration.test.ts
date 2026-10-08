import {
  closeDatabaseClient,
  createDatabaseClient,
  parseDatabaseConfig,
  storeSubscriptions,
  stores,
  users
} from "@bazaarlink/database";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  afterAll,
  describe,
  expect,
  it,
  vi
} from "vitest";

import { INTEGRATION_TEST_TIMEOUT_MS } from "../test/load-integration-env.js";
import { buildApp } from "../app.js";
import { parseAuthConfig } from "../auth/config.js";
import { DatabaseAuthRepository } from "../auth/repository.js";
import { AuthService } from "../auth/service.js";
import { DatabaseCatalogRepository } from "../catalog/repository.js";
import { CatalogService } from "../catalog/service.js";
import { DatabaseStoreRepository } from "../store/repository.js";
import { StoreService } from "../store/service.js";
import { DatabaseMarketplaceRepository } from "./repository.js";
import { MarketplaceService } from "./service.js";

vi.setConfig({ testTimeout: INTEGRATION_TEST_TIMEOUT_MS });

const hasDatabase = Boolean(process.env.DATABASE_URL);
const PHONES_CATEGORY_ID = "10000000-0000-4000-8000-000000000011";

describe.skipIf(!hasDatabase)("database-backed public marketplace discovery", () => {
  const client = createDatabaseClient(parseDatabaseConfig());
  const authService = new AuthService(
    new DatabaseAuthRepository(client.db),
    parseAuthConfig()
  );
  const storeService = new StoreService(
    new DatabaseStoreRepository(client.db)
  );
  const catalogService = new CatalogService(
    new DatabaseCatalogRepository(client.db)
  );
  const marketplaceService = new MarketplaceService(
    new DatabaseMarketplaceRepository(client.db)
  );
  const app = buildApp({
    authService,
    storeService,
    catalogService,
    marketplaceService
  });

  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await client.db.delete(stores).where(eq(stores.ownerUserId, userId));
      await client.db.delete(users).where(eq(users.id, userId));
    }

    await app.close();
    await closeDatabaseClient(client);
  });

  it("discovers only public products with search, filters, details, stores, and popularity views", async () => {
    const owner = await authService.register({
      email: "marketplace-owner-" + randomUUID() + "@example.com",
      password: "marketplace-password",
      displayName: "Marketplace Owner",
      preferredLocale: "fa-AF"
    });
    createdUserIds.push(owner.user.id);

    const handle = "market-" + randomUUID().slice(0, 8);
    const store = await storeService.createStore(owner.user.id, {
      name: "Kabul Mobile Market",
      handle,
      category: "Electronics",
      province: "Kabul",
      cityDistrict: "Karte 4",
      phone: "+93700000000",
      preferredLocale: "fa-AF",
      description: "Public marketplace integration store."
    });

    await client.db
      .update(storeSubscriptions)
      .set({ plan: "pro", updatedAt: new Date() })
      .where(eq(storeSubscriptions.storeId, store.id));

    const category = await catalogService.createCategory(
      owner.user.id,
      store.id,
      {
        name: "Mobile Devices",
        sortOrder: 1
      }
    );

    const visibleProduct = await catalogService.createProduct(
      owner.user.id,
      store.id,
      {
        name: "Galaxy Marketplace Phone",
        categoryId: category.id,
        marketplaceCategoryId: PHONES_CATEGORY_ID,
        price: 23000,
        compareAtPrice: 25000,
        brand: "Galaxy Test",
        description: "Searchable marketplace product.",
        tags: ["phone", "android"],
        availableQuantity: 4,
        lowStockThreshold: 1,
        images: [
          {
            url: "https://example.com/market-phone.jpg",
            altText: "Marketplace phone"
          }
        ]
      }
    );

    await catalogService.publishProduct(
      owner.user.id,
      store.id,
      visibleProduct.id
    );

    const hiddenDraft = await catalogService.createProduct(
      owner.user.id,
      store.id,
      {
        name: "Hidden Draft Phone",
        categoryId: category.id,
        marketplaceCategoryId: PHONES_CATEGORY_ID,
        price: 1000,
        availableQuantity: 2
      }
    );

    const hiddenBeforeStorePublish = await app.inject({
      method: "GET",
      url:
        "/marketplace/products?q=" +
        encodeURIComponent("Galaxy Marketplace Phone")
    });
    expect(hiddenBeforeStorePublish.statusCode).toBe(200);
    expect(hiddenBeforeStorePublish.json().products).toEqual([]);

    await storeService.publishStore(owner.user.id, store.id);

    const browse = await app.inject({
      method: "GET",
      url:
        "/marketplace/products?q=" +
        encodeURIComponent("Galaxy") +
        "&categoryId=" +
        PHONES_CATEGORY_ID +
        "&province=Kabul&minPrice=20000&maxPrice=24000" +
        "&inStock=true&discount=true&sort=relevance"
    });

    expect(browse.statusCode).toBe(200);
    expect(browse.json()).toMatchObject({
      products: [
        {
          id: visibleProduct.id,
          name: "Galaxy Marketplace Phone",
          price: 23000,
          inStock: true,
          hasDiscount: true,
          store: {
            handle,
            province: "Kabul"
          },
          marketplaceCategory: {
            id: PHONES_CATEGORY_ID,
            slug: "phones"
          }
        }
      ],
      pageInfo: {
        offset: 0,
        total: 1,
        hasMore: false
      }
    });
    expect(
      browse
        .json()
        .products.some(
          (product: { id: string }) => product.id === hiddenDraft.id
        )
    ).toBe(false);
    expect(browse.json().filterCapabilities.rating).toBe(true);
    expect(browse.json().filterCapabilities.verifiedStore).toBe(true);

    const suggestions = await app.inject({
      method: "GET",
      url: "/marketplace/search/suggestions?q=Galaxy"
    });
    expect(suggestions.statusCode).toBe(200);
    expect(suggestions.json().suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "product",
          id: visibleProduct.id
        })
      ])
    );

    const detail = await app.inject({
      method: "GET",
      url: "/marketplace/products/" + visibleProduct.id
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({
      product: {
        id: visibleProduct.id,
        name: "Galaxy Marketplace Phone",
        tags: ["phone", "android"]
      }
    });

    const view = await app.inject({
      method: "POST",
      url: "/marketplace/products/" + visibleProduct.id + "/view"
    });
    expect(view.statusCode).toBe(204);

    const home = await app.inject({
      method: "GET",
      url:
        "/marketplace/home?province=Kabul&recentProductIds=" +
        visibleProduct.id
    });
    expect(home.statusCode).toBe(200);
    expect(home.json().categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: PHONES_CATEGORY_ID,
          slug: "phones"
        })
      ])
    );
    expect(home.json().recommended).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: visibleProduct.id })
      ])
    );
    expect(home.json().nearby).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: visibleProduct.id })
      ])
    );
    expect(home.json().recentlyViewed[0].id).toBe(visibleProduct.id);

    const storePage = await app.inject({
      method: "GET",
      url: "/marketplace/stores/" + handle
    });
    expect(storePage.statusCode).toBe(200);
    expect(storePage.json()).toMatchObject({
      store: {
        id: store.id,
        handle
      },
      products: [
        {
          id: visibleProduct.id
        }
      ]
    });

    await client.db
      .update(stores)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(stores.id, store.id));

    const hiddenAfterSuspension = await app.inject({
      method: "GET",
      url: "/marketplace/products/" + visibleProduct.id
    });
    expect(hiddenAfterSuspension.statusCode).toBe(404);
    expect(hiddenAfterSuspension.json()).toEqual({
      error: {
        code: "product_not_found"
      }
    });
  });
});
