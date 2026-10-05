import type {
  CatalogCategoryRecord,
  CatalogProductRecord
} from "@bazaarlink/contracts";
import { describe, expect, it } from "vitest";

import {
  CatalogRepositoryInventoryError,
  CatalogRepositoryLimitError
} from "./errors.js";
import type {
  CatalogRepository,
  CatalogStoreAccess
} from "./repository.js";
import { CatalogService } from "./service.js";

const storeAccess: CatalogStoreAccess = {
  storeId: "00000000-0000-4000-8000-000000000101",
  plan: "starter",
  subscriptionStatus: "active",
  storeStatus: "published"
};

const category: CatalogCategoryRecord = {
  id: "00000000-0000-4000-8000-000000000201",
  storeId: storeAccess.storeId,
  parentId: null,
  name: "Phones",
  imageUrl: null,
  icon: null,
  sortOrder: 0,
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

function product(
  status: CatalogProductRecord["status"] = "draft"
): CatalogProductRecord {
  const now = new Date().toISOString();
  return {
    id: "00000000-0000-4000-8000-000000000301",
    storeId: storeAccess.storeId,
    categoryId: category.id,
    name: "Phone",
    description: null,
    price: 100,
    compareAtPrice: null,
    sku: null,
    brand: null,
    barcode: null,
    weightGrams: null,
    dimensions: null,
    tags: [],
    shippingClass: null,
    deliveryRestrictions: null,
    status,
    availableQuantity: 5,
    reservedQuantity: 0,
    lowStockThreshold: 1,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    images: [],
    variants: []
  };
}

function repository(
  overrides: Partial<CatalogRepository> = {}
): CatalogRepository {
  return {
    getStoreAccess: async () => storeAccess,
    listCategories: async () => [category],
    countActiveCategories: async () => 1,
    countNonArchivedProducts: async () => 1,
    countNonArchivedProductsInCategory: async () => 0,
    countActiveChildCategories: async () => 0,
    findCategory: async () => category,
    createCategory: async () => category,
    updateCategory: async () => category,
    archiveCategory: async () => category,
    restoreCategory: async () => category,
    listProducts: async () => ({
      products: [product()],
      total: 1
    }),
    findProduct: async () => product(),
    createProduct: async () => product(),
    updateProduct: async () => product(),
    setProductStatus: async (_storeId, _productId, status) => product(status),
    restoreProduct: async () => product(),
    addImage: async () => {
      throw new Error("not_used");
    },
    deleteImage: async () => true,
    addVariant: async () => {
      throw new Error("not_used");
    },
    updateVariant: async () => null,
    deleteVariant: async () => true,
    adjustInventory: async () => {
      throw new Error("not_used");
    },
    inventoryHistory: async () => [],
    listLowStock: async () => [],
    getPublicCatalog: async () => ({
      categories: [],
      products: []
    }),
    ...overrides
  };
}

describe("CatalogService", () => {
  it("maps the repository product limit to the public plan-limit error", async () => {
    const service = new CatalogService(
      repository({
        createProduct: async () => {
          throw new CatalogRepositoryLimitError("product");
        }
      })
    );

    await expect(
      service.createProduct(
        "00000000-0000-4000-8000-000000000001",
        storeAccess.storeId,
        {
          name: "Phone",
          categoryId: category.id,
          price: 100,
          availableQuantity: 1
        }
      )
    ).rejects.toMatchObject({
      code: "product_limit_reached",
      statusCode: 409
    });
  });

  it("prevents plan-restricted products from being republished", async () => {
    const service = new CatalogService(
      repository({
        findProduct: async () => product("plan_restricted")
      })
    );

    await expect(
      service.publishProduct(
        "00000000-0000-4000-8000-000000000001",
        storeAccess.storeId,
        product().id
      )
    ).rejects.toMatchObject({
      code: "product_plan_restricted",
      statusCode: 409
    });
  });

  it("publishes zero-stock products as out of stock instead of active", async () => {
    const zeroStock = product("draft");
    zeroStock.availableQuantity = 0;

    const service = new CatalogService(
      repository({
        findProduct: async () => zeroStock,
        setProductStatus: async (_storeId, _productId, status) =>
          product(status)
      })
    );

    const published = await service.publishProduct(
      "00000000-0000-4000-8000-000000000001",
      storeAccess.storeId,
      zeroStock.id
    );

    expect(published.status).toBe("out_of_stock");
  });

  it("maps negative inventory protection to a safe catalog error", async () => {
    const service = new CatalogService(
      repository({
        adjustInventory: async () => {
          throw new CatalogRepositoryInventoryError(
            "inventory_would_be_negative"
          );
        }
      })
    );

    await expect(
      service.adjustInventory(
        "00000000-0000-4000-8000-000000000001",
        storeAccess.storeId,
        product().id,
        {
          delta: -10
        }
      )
    ).rejects.toMatchObject({
      code: "inventory_would_be_negative",
      statusCode: 409
    });
  });
});
