import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  categories,
  inventoryMovements,
  marketplaceProductMetrics,
  platformCategories,
  productImages,
  products,
  productVariants
} from "./catalog.js";

describe("catalog schema", () => {
  it("uses stable catalog table names", () => {
    expect(getTableName(categories)).toBe("categories");
    expect(getTableName(platformCategories)).toBe("platform_categories");
    expect(getTableName(products)).toBe("products");
    expect(getTableName(marketplaceProductMetrics)).toBe("marketplace_product_metrics");
    expect(getTableName(productImages)).toBe("product_images");
    expect(getTableName(productVariants)).toBe("product_variants");
    expect(getTableName(inventoryMovements)).toBe("inventory_movements");
  });

  it("defaults categories and products to safe states", () => {
    expect(categories.status.default).toBe("active");
    expect(products.status.default).toBe("draft");
    expect(products.availableQuantity.default).toBe(0);
    expect(productVariants.available.default).toBe(true);
  });

  it("keeps catalog ownership references as UUID strings", () => {
    expect(categories.storeId.dataType).toBe("string");
    expect(products.storeId.dataType).toBe("string");
    expect(products.categoryId.dataType).toBe("string");
    expect(products.marketplaceCategoryId.dataType).toBe("string");
    expect(platformCategories.id.dataType).toBe("string");
    expect(productVariants.productId.dataType).toBe("string");
  });
});
