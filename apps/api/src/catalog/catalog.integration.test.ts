import {
  closeDatabaseClient,
  createDatabaseClient,
  parseDatabaseConfig,
  stores,
  users
} from "@bazaarlink/database";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  afterAll,
  describe,
  expect,
  it
} from "vitest";

import { buildApp } from "../app.js";
import { parseAuthConfig } from "../auth/config.js";
import { DatabaseAuthRepository } from "../auth/repository.js";
import { AuthService } from "../auth/service.js";
import { DatabaseStoreRepository } from "../store/repository.js";
import { StoreService } from "../store/service.js";
import { DatabaseCatalogRepository } from "./repository.js";
import { CatalogService } from "./service.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("database-backed catalog and inventory lifecycle", () => {
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
  const app = buildApp({
    authService,
    storeService,
    catalogService
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

  it("builds a sellable catalog with variants, images, stock, and public visibility", async () => {
    const owner = await authService.register({
      email: "catalog-owner-" + randomUUID() + "@example.com",
      password: "catalog-password",
      displayName: "Catalog Owner",
      preferredLocale: "fa-AF"
    });
    const other = await authService.register({
      email: "catalog-other-" + randomUUID() + "@example.com",
      password: "catalog-password",
      displayName: "Other Merchant",
      preferredLocale: "en"
    });

    createdUserIds.push(owner.user.id, other.user.id);

    const handle = "catalog-" + randomUUID().slice(0, 8);
    const store = await storeService.createStore(owner.user.id, {
      name: "Catalog Integration Store",
      handle,
      category: "Electronics",
      province: "Kabul",
      cityDistrict: "Karte 4",
      phone: "+93700000000",
      preferredLocale: "fa-AF"
    });

    const crossOwner = await app.inject({
      method: "GET",
      url: "/seller/stores/" + store.id + "/categories",
      headers: {
        authorization: "Bearer " + other.session.token
      }
    });
    expect(crossOwner.statusCode).toBe(404);

    const categoryResponse = await app.inject({
      method: "POST",
      url: "/seller/stores/" + store.id + "/categories",
      headers: {
        authorization: "Bearer " + owner.session.token
      },
      payload: {
        name: "Phones",
        sortOrder: 1
      }
    });
    expect(categoryResponse.statusCode).toBe(201);
    const category = categoryResponse.json();

    const productResponse = await app.inject({
      method: "POST",
      url: "/seller/stores/" + store.id + "/products",
      headers: {
        authorization: "Bearer " + owner.session.token
      },
      payload: {
        name: "Smart Phone",
        categoryId: category.id,
        price: 25000,
        compareAtPrice: 27000,
        availableQuantity: 0,
        lowStockThreshold: 2,
        description: "A catalog integration product.",
        brand: "Bazaar Test",
        images: [
          {
            url: "https://example.com/phone.jpg",
            altText: "Phone"
          }
        ],
        variants: [
          {
            title: "Black 128 GB",
            optionValues: {
              Color: "Black",
              Storage: "128 GB"
            },
            sku: "PHONE-BLK-128",
            availableQuantity: 5,
            lowStockThreshold: 1
          }
        ]
      }
    });

    expect(productResponse.statusCode).toBe(201);
    expect(productResponse.json()).toMatchObject({
      name: "Smart Phone",
      status: "draft"
    });
    expect(productResponse.json().images).toHaveLength(1);
    expect(productResponse.json().variants).toHaveLength(1);

    const product = productResponse.json();
    const variantId = product.variants[0].id as string;

    const archiveCategoryWhileUsed = await app.inject({
      method: "POST",
      url:
        "/seller/stores/" +
        store.id +
        "/categories/" +
        category.id +
        "/archive",
      headers: {
        authorization: "Bearer " + owner.session.token
      }
    });
    expect(archiveCategoryWhileUsed.statusCode).toBe(409);
    expect(archiveCategoryWhileUsed.json()).toEqual({
      error: {
        code: "category_in_use"
      }
    });

    const publishProduct = await app.inject({
      method: "POST",
      url:
        "/seller/stores/" +
        store.id +
        "/products/" +
        product.id +
        "/publish",
      headers: {
        authorization: "Bearer " + owner.session.token
      }
    });
    expect(publishProduct.statusCode).toBe(200);
    expect(publishProduct.json().status).toBe("active");

    const negativeInventory = await app.inject({
      method: "POST",
      url:
        "/seller/stores/" +
        store.id +
        "/products/" +
        product.id +
        "/inventory/adjust",
      headers: {
        authorization: "Bearer " + owner.session.token
      },
      payload: {
        variantId,
        delta: -6,
        reason: "invalid negative attempt"
      }
    });
    expect(negativeInventory.statusCode).toBe(409);
    expect(negativeInventory.json()).toEqual({
      error: {
        code: "inventory_would_be_negative"
      }
    });

    const inventory = await app.inject({
      method: "POST",
      url:
        "/seller/stores/" +
        store.id +
        "/products/" +
        product.id +
        "/inventory/adjust",
      headers: {
        authorization: "Bearer " + owner.session.token
      },
      payload: {
        variantId,
        delta: -5,
        reason: "stock count"
      }
    });
    expect(inventory.statusCode).toBe(200);
    expect(inventory.json().status).toBe("out_of_stock");

    const history = await app.inject({
      method: "GET",
      url:
        "/seller/stores/" +
        store.id +
        "/products/" +
        product.id +
        "/inventory/history",
      headers: {
        authorization: "Bearer " + owner.session.token
      }
    });
    expect(history.statusCode).toBe(200);
    expect(history.json().movements.length).toBeGreaterThanOrEqual(2);

    await storeService.publishStore(owner.user.id, store.id);

    const publicCatalog = await app.inject({
      method: "GET",
      url: "/stores/" + handle + "/catalog"
    });
    expect(publicCatalog.statusCode).toBe(200);
    expect(publicCatalog.json()).toMatchObject({
      categories: [
        {
          name: "Phones"
        }
      ],
      products: [
        {
          name: "Smart Phone",
          status: "out_of_stock"
        }
      ]
    });
    expect(publicCatalog.json().products[0]).not.toHaveProperty("sku");
    expect(publicCatalog.json().products[0]).not.toHaveProperty(
      "availableQuantity"
    );

    const archiveProduct = await app.inject({
      method: "POST",
      url:
        "/seller/stores/" +
        store.id +
        "/products/" +
        product.id +
        "/archive",
      headers: {
        authorization: "Bearer " + owner.session.token
      }
    });
    expect(archiveProduct.statusCode).toBe(200);

    const archiveCategory = await app.inject({
      method: "POST",
      url:
        "/seller/stores/" +
        store.id +
        "/categories/" +
        category.id +
        "/archive",
      headers: {
        authorization: "Bearer " + owner.session.token
      }
    });
    expect(archiveCategory.statusCode).toBe(200);

    const hiddenAfterArchive = await app.inject({
      method: "GET",
      url: "/stores/" + handle + "/catalog"
    });
    expect(hiddenAfterArchive.statusCode).toBe(200);
    expect(hiddenAfterArchive.json().products).toEqual([]);
    expect(hiddenAfterArchive.json().categories).toEqual([]);
  });

  it("enforces the Starter active category limit without deleting archived categories", async () => {
    const owner = await authService.register({
      email: "catalog-limit-" + randomUUID() + "@example.com",
      password: "catalog-password",
      displayName: "Limit Owner",
      preferredLocale: "en"
    });
    createdUserIds.push(owner.user.id);

    const store = await storeService.createStore(owner.user.id, {
      name: "Limit Store",
      handle: "limit-" + randomUUID().slice(0, 8),
      category: "Retail",
      province: "Kabul",
      cityDistrict: "Kabul",
      phone: "+93700000001",
      preferredLocale: "en"
    });

    const ids: string[] = [];

    for (let index = 0; index < 5; index += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/seller/stores/" + store.id + "/categories",
        headers: {
          authorization: "Bearer " + owner.session.token
        },
        payload: {
          name: "Category " + index
        }
      });
      expect(response.statusCode).toBe(201);
      ids.push(response.json().id as string);
    }

    const overLimit = await app.inject({
      method: "POST",
      url: "/seller/stores/" + store.id + "/categories",
      headers: {
        authorization: "Bearer " + owner.session.token
      },
      payload: {
        name: "Category 6"
      }
    });
    expect(overLimit.statusCode).toBe(409);
    expect(overLimit.json()).toEqual({
      error: {
        code: "category_limit_reached"
      }
    });

    const archived = await app.inject({
      method: "POST",
      url:
        "/seller/stores/" +
        store.id +
        "/categories/" +
        ids[0] +
        "/archive",
      headers: {
        authorization: "Bearer " + owner.session.token
      }
    });
    expect(archived.statusCode).toBe(200);

    const replacement = await app.inject({
      method: "POST",
      url: "/seller/stores/" + store.id + "/categories",
      headers: {
        authorization: "Bearer " + owner.session.token
      },
      payload: {
        name: "Replacement"
      }
    });
    expect(replacement.statusCode).toBe(201);

    const restoreAtLimit = await app.inject({
      method: "POST",
      url:
        "/seller/stores/" +
        store.id +
        "/categories/" +
        ids[0] +
        "/restore",
      headers: {
        authorization: "Bearer " + owner.session.token
      }
    });
    expect(restoreAtLimit.statusCode).toBe(409);
    expect(restoreAtLimit.json()).toEqual({
      error: {
        code: "category_limit_reached"
      }
    });
  });
});
