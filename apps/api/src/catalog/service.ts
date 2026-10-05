import type {
  CatalogCategoryRecord,
  CatalogProductRecord,
  CatalogUsage,
  CategoryListResponse,
  CreateCategoryInput,
  CreateProductImageInput,
  CreateProductInput,
  CreateProductVariantInput,
  InventoryAdjustmentInput,
  InventoryHistoryResponse,
  InventoryReservationInput,
  InventoryLowStockResponse,
  ProductListResponse,
  ProductStatus,
  PublicStoreCatalogResponse,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateProductVariantInput
} from "@bazaarlink/contracts";

import { getStoreEntitlements } from "../store/entitlements.js";
import {
  CatalogError,
  CatalogRepositoryInventoryError,
  CatalogRepositoryLimitError
} from "./errors.js";
import type {
  CatalogRepository,
  CatalogStoreAccess,
  ProductListQuery
} from "./repository.js";

export interface CatalogServiceContract {
  listCategories(
    ownerUserId: string,
    storeId: string
  ): Promise<CategoryListResponse>;
  createCategory(
    ownerUserId: string,
    storeId: string,
    input: CreateCategoryInput
  ): Promise<CatalogCategoryRecord>;
  updateCategory(
    ownerUserId: string,
    storeId: string,
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<CatalogCategoryRecord>;
  archiveCategory(
    ownerUserId: string,
    storeId: string,
    categoryId: string
  ): Promise<CatalogCategoryRecord>;
  restoreCategory(
    ownerUserId: string,
    storeId: string,
    categoryId: string
  ): Promise<CatalogCategoryRecord>;
  listProducts(
    ownerUserId: string,
    storeId: string,
    query: ProductListQuery
  ): Promise<ProductListResponse>;
  getProduct(
    ownerUserId: string,
    storeId: string,
    productId: string
  ): Promise<CatalogProductRecord>;
  createProduct(
    ownerUserId: string,
    storeId: string,
    input: CreateProductInput
  ): Promise<CatalogProductRecord>;
  updateProduct(
    ownerUserId: string,
    storeId: string,
    productId: string,
    input: UpdateProductInput
  ): Promise<CatalogProductRecord>;
  archiveProduct(
    ownerUserId: string,
    storeId: string,
    productId: string
  ): Promise<CatalogProductRecord>;
  restoreProduct(
    ownerUserId: string,
    storeId: string,
    productId: string
  ): Promise<CatalogProductRecord>;
  publishProduct(
    ownerUserId: string,
    storeId: string,
    productId: string
  ): Promise<CatalogProductRecord>;
  addImage(
    ownerUserId: string,
    storeId: string,
    productId: string,
    input: CreateProductImageInput
  ): Promise<CatalogProductRecord>;
  deleteImage(
    ownerUserId: string,
    storeId: string,
    productId: string,
    imageId: string
  ): Promise<CatalogProductRecord>;
  addVariant(
    ownerUserId: string,
    storeId: string,
    productId: string,
    input: CreateProductVariantInput
  ): Promise<CatalogProductRecord>;
  updateVariant(
    ownerUserId: string,
    storeId: string,
    productId: string,
    variantId: string,
    input: UpdateProductVariantInput
  ): Promise<CatalogProductRecord>;
  deleteVariant(
    ownerUserId: string,
    storeId: string,
    productId: string,
    variantId: string
  ): Promise<CatalogProductRecord>;
  adjustInventory(
    ownerUserId: string,
    storeId: string,
    productId: string,
    input: InventoryAdjustmentInput
  ): Promise<CatalogProductRecord>;
  reserveInventory(
    ownerUserId: string,
    storeId: string,
    productId: string,
    input: InventoryReservationInput
  ): Promise<CatalogProductRecord>;
  releaseInventory(
    ownerUserId: string,
    storeId: string,
    productId: string,
    input: InventoryReservationInput
  ): Promise<CatalogProductRecord>;
  inventoryHistory(
    ownerUserId: string,
    storeId: string,
    productId: string
  ): Promise<InventoryHistoryResponse>;
  lowStock(
    ownerUserId: string,
    storeId: string
  ): Promise<InventoryLowStockResponse>;
  getPublicCatalog(handle: string): Promise<PublicStoreCatalogResponse>;
}

function trimNullable(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCategoryInput(
  input: CreateCategoryInput
): CreateCategoryInput {
  return {
    ...input,
    name: input.name.trim(),
    imageUrl: trimNullable(input.imageUrl),
    icon: trimNullable(input.icon)
  };
}

function normalizeCategoryUpdate(
  input: UpdateCategoryInput
): UpdateCategoryInput {
  const result: UpdateCategoryInput = { ...input };

  if (input.name !== undefined) result.name = input.name.trim();
  if (input.imageUrl !== undefined) result.imageUrl = trimNullable(input.imageUrl);
  if (input.icon !== undefined) result.icon = trimNullable(input.icon);

  return result;
}

function normalizeOptionValues(
  values: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(values)) {
    const key = rawKey.trim();
    const value = rawValue.trim();

    if (key.length > 0 && value.length > 0) {
      result[key] = value;
    }
  }

  return result;
}

function normalizeVariant(
  input: CreateProductVariantInput
): CreateProductVariantInput {
  const optionValues = normalizeOptionValues(input.optionValues);

  return {
    ...input,
    title: input.title.trim(),
    optionValues,
    sku: trimNullable(input.sku),
    imageUrl: trimNullable(input.imageUrl)
  };
}

function normalizeVariantUpdate(
  input: UpdateProductVariantInput
): UpdateProductVariantInput {
  const result: UpdateProductVariantInput = { ...input };

  if (input.title !== undefined) result.title = input.title.trim();
  if (input.sku !== undefined) result.sku = trimNullable(input.sku);
  if (input.imageUrl !== undefined) result.imageUrl = trimNullable(input.imageUrl);
  if (input.optionValues !== undefined) {
    result.optionValues = normalizeOptionValues(input.optionValues);
  }

  return result;
}

function normalizeProductInput(input: CreateProductInput): CreateProductInput {
  return {
    ...input,
    name: input.name.trim(),
    description: trimNullable(input.description),
    sku: trimNullable(input.sku),
    brand: trimNullable(input.brand),
    barcode: trimNullable(input.barcode),
    dimensions: trimNullable(input.dimensions),
    tags: (input.tags ?? [])
      .map((tag) => tag.trim())
      .filter((tag, index, all) => tag.length > 0 && all.indexOf(tag) === index),
    shippingClass: trimNullable(input.shippingClass),
    deliveryRestrictions: trimNullable(input.deliveryRestrictions),
    images: input.images?.map((image) => ({
      ...image,
      url: image.url.trim(),
      altText: trimNullable(image.altText)
    })),
    variants: input.variants?.map(normalizeVariant)
  };
}

function normalizeProductUpdate(input: UpdateProductInput): UpdateProductInput {
  const result: UpdateProductInput = { ...input };

  if (input.name !== undefined) result.name = input.name.trim();
  if (input.description !== undefined) result.description = trimNullable(input.description);
  if (input.sku !== undefined) result.sku = trimNullable(input.sku);
  if (input.brand !== undefined) result.brand = trimNullable(input.brand);
  if (input.barcode !== undefined) result.barcode = trimNullable(input.barcode);
  if (input.dimensions !== undefined) result.dimensions = trimNullable(input.dimensions);
  if (input.tags !== undefined) {
    result.tags = input.tags
      .map((tag) => tag.trim())
      .filter((tag, index, all) => tag.length > 0 && all.indexOf(tag) === index);
  }
  if (input.shippingClass !== undefined) {
    result.shippingClass = trimNullable(input.shippingClass);
  }
  if (input.deliveryRestrictions !== undefined) {
    result.deliveryRestrictions = trimNullable(input.deliveryRestrictions);
  }

  return result;
}

function validateCompareAt(
  price: number,
  compareAtPrice: number | null | undefined
) {
  if (compareAtPrice !== null && compareAtPrice !== undefined && compareAtPrice <= price) {
    throw new CatalogError("invalid_request", 400);
  }
}

function freeStock(product: CatalogProductRecord): number {
  if (product.variants.length > 0) {
    return product.variants
      .filter((variant) => variant.available)
      .reduce(
        (sum, variant) =>
          sum + Math.max(0, variant.availableQuantity - variant.reservedQuantity),
        0
      );
  }

  return Math.max(
    0,
    product.availableQuantity - product.reservedQuantity
  );
}

export class CatalogService implements CatalogServiceContract {
  constructor(private readonly repository: CatalogRepository) {}

  private async requireStore(
    ownerUserId: string,
    storeId: string
  ): Promise<CatalogStoreAccess> {
    const access = await this.repository.getStoreAccess(ownerUserId, storeId);

    if (!access) {
      throw new CatalogError("store_not_found", 404);
    }

    return access;
  }

  private requireWritableSubscription(access: CatalogStoreAccess) {
    if (
      access.subscriptionStatus !== "active" &&
      access.subscriptionStatus !== "grace_period"
    ) {
      throw new CatalogError("subscription_unavailable", 409);
    }
  }

  private async usage(
    access: CatalogStoreAccess
  ): Promise<CatalogUsage> {
    const entitlements = getStoreEntitlements(access.plan);
    const [productCount, activeCategoryCount] = await Promise.all([
      this.repository.countNonArchivedProducts(access.storeId),
      this.repository.countActiveCategories(access.storeId)
    ]);

    return {
      plan: access.plan,
      productLimit: entitlements.productLimit,
      productCount,
      categoryLimit: entitlements.categoryLimit,
      activeCategoryCount
    };
  }

  private async requireActiveCategory(
    storeId: string,
    categoryId: string
  ): Promise<CatalogCategoryRecord> {
    const category = await this.repository.findCategory(storeId, categoryId);

    if (!category || category.status !== "active") {
      throw new CatalogError("category_not_found", 404);
    }

    return category;
  }

  private async validateCategoryParent(
    storeId: string,
    categoryId: string | null,
    parentId: string | null | undefined
  ) {
    if (parentId === undefined || parentId === null) {
      return;
    }

    if (categoryId && parentId === categoryId) {
      throw new CatalogError("invalid_request", 400);
    }

    let current = await this.requireActiveCategory(storeId, parentId);

    for (let depth = 0; depth < 20 && current.parentId; depth += 1) {
      if (categoryId && current.parentId === categoryId) {
        throw new CatalogError("invalid_request", 400);
      }

      const parent = await this.repository.findCategory(
        storeId,
        current.parentId
      );

      if (!parent) {
        break;
      }

      current = parent;
    }
  }

  private async requireProduct(
    storeId: string,
    productId: string
  ): Promise<CatalogProductRecord> {
    const product = await this.repository.findProduct(storeId, productId);

    if (!product) {
      throw new CatalogError("product_not_found", 404);
    }

    return product;
  }

  private async syncPublishedStockStatus(
    storeId: string,
    productId: string
  ): Promise<CatalogProductRecord> {
    const product = await this.requireProduct(storeId, productId);

    if (product.status !== "active" && product.status !== "out_of_stock") {
      return product;
    }

    const nextStatus: ProductStatus =
      freeStock(product) > 0 ? "active" : "out_of_stock";

    if (product.status === nextStatus) {
      return product;
    }

    const updated = await this.repository.setProductStatus(
      storeId,
      productId,
      nextStatus
    );

    if (!updated) {
      throw new CatalogError("product_not_found", 404);
    }

    return updated;
  }

  async listCategories(
    ownerUserId: string,
    storeId: string
  ): Promise<CategoryListResponse> {
    const access = await this.requireStore(ownerUserId, storeId);

    const [categories, usage] = await Promise.all([
      this.repository.listCategories(storeId),
      this.usage(access)
    ]);

    return { categories, usage };
  }

  async createCategory(
    ownerUserId: string,
    storeId: string,
    input: CreateCategoryInput
  ): Promise<CatalogCategoryRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    await this.validateCategoryParent(storeId, null, input.parentId);

    try {
      return await this.repository.createCategory(
        storeId,
        normalizeCategoryInput(input),
        getStoreEntitlements(access.plan).categoryLimit
      );
    } catch (error) {
      if (
        error instanceof CatalogRepositoryLimitError &&
        error.resource === "category"
      ) {
        throw new CatalogError("category_limit_reached", 409);
      }
      throw error;
    }
  }

  async updateCategory(
    ownerUserId: string,
    storeId: string,
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<CatalogCategoryRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    const existing = await this.repository.findCategory(storeId, categoryId);

    if (!existing) {
      throw new CatalogError("category_not_found", 404);
    }

    await this.validateCategoryParent(storeId, categoryId, input.parentId);

    const updated = await this.repository.updateCategory(
      storeId,
      categoryId,
      normalizeCategoryUpdate(input)
    );

    if (!updated) {
      throw new CatalogError("category_not_found", 404);
    }

    return updated;
  }

  async archiveCategory(
    ownerUserId: string,
    storeId: string,
    categoryId: string
  ): Promise<CatalogCategoryRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    const category = await this.repository.findCategory(storeId, categoryId);

    if (!category) {
      throw new CatalogError("category_not_found", 404);
    }

    const [productCount, activeChildCount] = await Promise.all([
      this.repository.countNonArchivedProductsInCategory(
        storeId,
        categoryId
      ),
      this.repository.countActiveChildCategories(
        storeId,
        categoryId
      )
    ]);

    if (productCount > 0 || activeChildCount > 0) {
      throw new CatalogError("category_in_use", 409);
    }

    const archived = await this.repository.archiveCategory(
      storeId,
      categoryId
    );

    if (!archived) {
      throw new CatalogError("category_not_found", 404);
    }

    return archived;
  }

  async restoreCategory(
    ownerUserId: string,
    storeId: string,
    categoryId: string
  ): Promise<CatalogCategoryRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    const existing = await this.repository.findCategory(storeId, categoryId);

    if (!existing) {
      throw new CatalogError("category_not_found", 404);
    }

    await this.validateCategoryParent(
      storeId,
      categoryId,
      existing.parentId
    );

    try {
      const restored = await this.repository.restoreCategory(
        storeId,
        categoryId,
        getStoreEntitlements(access.plan).categoryLimit
      );

      if (!restored) {
        throw new CatalogError("category_not_found", 404);
      }

      return restored;
    } catch (error) {
      if (
        error instanceof CatalogRepositoryLimitError &&
        error.resource === "category"
      ) {
        throw new CatalogError("category_limit_reached", 409);
      }
      throw error;
    }
  }

  async listProducts(
    ownerUserId: string,
    storeId: string,
    query: ProductListQuery
  ): Promise<ProductListResponse> {
    const access = await this.requireStore(ownerUserId, storeId);
    const [{ products: records, total }, usage] = await Promise.all([
      this.repository.listProducts(storeId, query),
      this.usage(access)
    ]);

    return {
      products: records,
      usage,
      pageInfo: {
        offset: query.offset,
        limit: query.limit,
        total,
        hasMore: query.offset + records.length < total
      }
    };
  }

  async getProduct(
    ownerUserId: string,
    storeId: string,
    productId: string
  ): Promise<CatalogProductRecord> {
    await this.requireStore(ownerUserId, storeId);
    return this.requireProduct(storeId, productId);
  }

  async createProduct(
    ownerUserId: string,
    storeId: string,
    input: CreateProductInput
  ): Promise<CatalogProductRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    await this.requireActiveCategory(storeId, input.categoryId);

    const normalized = normalizeProductInput(input);
    validateCompareAt(normalized.price, normalized.compareAtPrice);

    try {
      return await this.repository.createProduct(
        storeId,
        normalized,
        getStoreEntitlements(access.plan).productLimit
      );
    } catch (error) {
      if (
        error instanceof CatalogRepositoryLimitError &&
        error.resource === "product"
      ) {
        throw new CatalogError("product_limit_reached", 409);
      }
      throw error;
    }
  }

  async updateProduct(
    ownerUserId: string,
    storeId: string,
    productId: string,
    input: UpdateProductInput
  ): Promise<CatalogProductRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    const existing = await this.requireProduct(storeId, productId);

    if (input.categoryId !== undefined) {
      await this.requireActiveCategory(storeId, input.categoryId);
    }

    const normalized = normalizeProductUpdate(input);
    validateCompareAt(
      normalized.price ?? existing.price,
      normalized.compareAtPrice === undefined
        ? existing.compareAtPrice
        : normalized.compareAtPrice
    );

    const updated = await this.repository.updateProduct(
      storeId,
      productId,
      normalized
    );

    if (!updated) {
      throw new CatalogError("product_not_found", 404);
    }

    return updated;
  }

  async archiveProduct(
    ownerUserId: string,
    storeId: string,
    productId: string
  ): Promise<CatalogProductRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    await this.requireProduct(storeId, productId);

    const archived = await this.repository.setProductStatus(
      storeId,
      productId,
      "archived",
      null
    );

    if (!archived) {
      throw new CatalogError("product_not_found", 404);
    }

    return archived;
  }

  async restoreProduct(
    ownerUserId: string,
    storeId: string,
    productId: string
  ): Promise<CatalogProductRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    const existing = await this.requireProduct(storeId, productId);

    if (existing.status !== "archived") {
      return existing;
    }

    try {
      const restored = await this.repository.restoreProduct(
        storeId,
        productId,
        getStoreEntitlements(access.plan).productLimit
      );

      if (!restored) {
        throw new CatalogError("product_not_found", 404);
      }

      return restored;
    } catch (error) {
      if (
        error instanceof CatalogRepositoryLimitError &&
        error.resource === "product"
      ) {
        throw new CatalogError("product_limit_reached", 409);
      }
      throw error;
    }
  }

  async publishProduct(
    ownerUserId: string,
    storeId: string,
    productId: string
  ): Promise<CatalogProductRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    const product = await this.requireProduct(storeId, productId);

    if (product.status === "archived") {
      throw new CatalogError("product_archived", 409);
    }

    if (product.status === "plan_restricted") {
      throw new CatalogError("product_plan_restricted", 409);
    }

    await this.requireActiveCategory(storeId, product.categoryId);

    const status: ProductStatus =
      freeStock(product) > 0 ? "active" : "out_of_stock";

    const published = await this.repository.setProductStatus(
      storeId,
      productId,
      status,
      product.publishedAt ? undefined : new Date()
    );

    if (!published) {
      throw new CatalogError("product_not_found", 404);
    }

    return published;
  }

  async addImage(
    ownerUserId: string,
    storeId: string,
    productId: string,
    input: CreateProductImageInput
  ): Promise<CatalogProductRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    await this.requireProduct(storeId, productId);

    await this.repository.addImage(productId, {
      ...input,
      url: input.url.trim(),
      altText: trimNullable(input.altText)
    });

    return this.requireProduct(storeId, productId);
  }

  async deleteImage(
    ownerUserId: string,
    storeId: string,
    productId: string,
    imageId: string
  ): Promise<CatalogProductRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    await this.requireProduct(storeId, productId);

    const deleted = await this.repository.deleteImage(productId, imageId);
    if (!deleted) {
      throw new CatalogError("image_not_found", 404);
    }

    return this.requireProduct(storeId, productId);
  }

  async addVariant(
    ownerUserId: string,
    storeId: string,
    productId: string,
    input: CreateProductVariantInput
  ): Promise<CatalogProductRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    await this.requireProduct(storeId, productId);

    await this.repository.addVariant(storeId, productId, normalizeVariant(input));
    return this.syncPublishedStockStatus(storeId, productId);
  }

  async updateVariant(
    ownerUserId: string,
    storeId: string,
    productId: string,
    variantId: string,
    input: UpdateProductVariantInput
  ): Promise<CatalogProductRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    await this.requireProduct(storeId, productId);

    const updated = await this.repository.updateVariant(
      productId,
      variantId,
      normalizeVariantUpdate(input)
    );

    if (!updated) {
      throw new CatalogError("variant_not_found", 404);
    }

    return this.syncPublishedStockStatus(storeId, productId);
  }

  async deleteVariant(
    ownerUserId: string,
    storeId: string,
    productId: string,
    variantId: string
  ): Promise<CatalogProductRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    await this.requireProduct(storeId, productId);

    const deleted = await this.repository.deleteVariant(productId, variantId);
    if (!deleted) {
      throw new CatalogError("variant_not_found", 404);
    }

    return this.syncPublishedStockStatus(storeId, productId);
  }

  async adjustInventory(
    ownerUserId: string,
    storeId: string,
    productId: string,
    input: InventoryAdjustmentInput
  ): Promise<CatalogProductRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    await this.requireProduct(storeId, productId);

    try {
      await this.repository.adjustInventory(
        storeId,
        productId,
        input.variantId ?? null,
        input.delta,
        trimNullable(input.reason) ?? null
      );
    } catch (error) {
      if (error instanceof CatalogRepositoryInventoryError) {
        throw new CatalogError(error.code, 409);
      }
      throw error;
    }

    return this.syncPublishedStockStatus(storeId, productId);
  }

  async reserveInventory(
    ownerUserId: string,
    storeId: string,
    productId: string,
    input: InventoryReservationInput
  ): Promise<CatalogProductRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    await this.requireProduct(storeId, productId);

    try {
      await this.repository.reserveInventory(
        storeId,
        productId,
        input.variantId ?? null,
        input.quantity
      );
    } catch (error) {
      if (error instanceof CatalogRepositoryInventoryError) {
        throw new CatalogError(error.code, 409);
      }

      throw error;
    }

    return this.syncPublishedStockStatus(storeId, productId);
  }

  async releaseInventory(
    ownerUserId: string,
    storeId: string,
    productId: string,
    input: InventoryReservationInput
  ): Promise<CatalogProductRecord> {
    const access = await this.requireStore(ownerUserId, storeId);
    this.requireWritableSubscription(access);
    await this.requireProduct(storeId, productId);

    try {
      await this.repository.releaseInventory(
        storeId,
        productId,
        input.variantId ?? null,
        input.quantity
      );
    } catch (error) {
      if (error instanceof CatalogRepositoryInventoryError) {
        throw new CatalogError(error.code, 409);
      }

      throw error;
    }

    return this.syncPublishedStockStatus(storeId, productId);
  }

  async inventoryHistory(
    ownerUserId: string,
    storeId: string,
    productId: string
  ): Promise<InventoryHistoryResponse> {
    await this.requireStore(ownerUserId, storeId);
    await this.requireProduct(storeId, productId);

    return {
      movements: await this.repository.inventoryHistory(storeId, productId)
    };
  }

  async lowStock(
    ownerUserId: string,
    storeId: string
  ): Promise<InventoryLowStockResponse> {
    await this.requireStore(ownerUserId, storeId);

    return {
      items: await this.repository.listLowStock(storeId)
    };
  }

  async getPublicCatalog(handle: string): Promise<PublicStoreCatalogResponse> {
    const catalog = await this.repository.getPublicCatalog(
      handle.trim().toLowerCase()
    );

    if (!catalog) {
      throw new CatalogError("store_not_found", 404);
    }

    return catalog;
  }
}
