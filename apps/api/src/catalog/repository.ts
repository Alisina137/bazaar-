import type {
  CatalogCategoryRecord,
  CatalogProductRecord,
  CreateCategoryInput,
  CreateProductImageInput,
  CreateProductInput,
  CreateProductVariantInput,
  InventoryLowStockItem,
  InventoryMovementRecord,
  ProductStatus,
  ProductVariantRecord,
  PublicStoreCatalogResponse,
  SubscriptionPlanCode,
  SubscriptionStatus,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateProductVariantInput
} from "@bazaarlink/contracts";
import {
  categories,
  inventoryMovements,
  productImages,
  products,
  productVariants,
  storeSubscriptions,
  stores,
  type CatalogCategory,
  type CatalogProduct,
  type Database,
  type InventoryMovement,
  type NewCatalogProduct,
  type ProductImage,
  type ProductVariant
} from "@bazaarlink/database";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  ne,
  notExists,
  or,
  sql
} from "drizzle-orm";

import {
  CatalogRepositoryInventoryError,
  CatalogRepositoryLimitError
} from "./errors.js";

export interface CatalogStoreAccess {
  storeId: string;
  plan: SubscriptionPlanCode;
  subscriptionStatus: SubscriptionStatus;
  storeStatus: "draft" | "published" | "suspended";
}

export interface ProductListQuery {
  offset: number;
  limit: number;
  status?: ProductStatus | undefined;
  categoryId?: string | undefined;
}

export interface CatalogRepository {
  getStoreAccess(
    ownerUserId: string,
    storeId: string
  ): Promise<CatalogStoreAccess | null>;
  listCategories(storeId: string): Promise<CatalogCategoryRecord[]>;
  countActiveCategories(storeId: string): Promise<number>;
  countNonArchivedProducts(storeId: string): Promise<number>;
  countNonArchivedProductsInCategory(
    storeId: string,
    categoryId: string
  ): Promise<number>;
  countActiveChildCategories(
    storeId: string,
    categoryId: string
  ): Promise<number>;
  findCategory(
    storeId: string,
    categoryId: string
  ): Promise<CatalogCategoryRecord | null>;
  createCategory(
    storeId: string,
    input: CreateCategoryInput,
    categoryLimit: number | null
  ): Promise<CatalogCategoryRecord>;
  updateCategory(
    storeId: string,
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<CatalogCategoryRecord | null>;
  archiveCategory(
    storeId: string,
    categoryId: string
  ): Promise<CatalogCategoryRecord | null>;
  restoreCategory(
    storeId: string,
    categoryId: string,
    categoryLimit: number | null
  ): Promise<CatalogCategoryRecord | null>;
  listProducts(
    storeId: string,
    query: ProductListQuery
  ): Promise<{ products: CatalogProductRecord[]; total: number }>;
  findProduct(
    storeId: string,
    productId: string
  ): Promise<CatalogProductRecord | null>;
  createProduct(
    storeId: string,
    input: CreateProductInput,
    productLimit: number
  ): Promise<CatalogProductRecord>;
  updateProduct(
    storeId: string,
    productId: string,
    input: UpdateProductInput
  ): Promise<CatalogProductRecord | null>;
  setProductStatus(
    storeId: string,
    productId: string,
    status: ProductStatus,
    publishedAt?: Date | null | undefined
  ): Promise<CatalogProductRecord | null>;
  restoreProduct(
    storeId: string,
    productId: string,
    productLimit: number
  ): Promise<CatalogProductRecord | null>;
  addImage(
    productId: string,
    input: CreateProductImageInput
  ): Promise<CatalogProductRecord["images"][number]>;
  deleteImage(productId: string, imageId: string): Promise<boolean>;
  addVariant(
    storeId: string,
    productId: string,
    input: CreateProductVariantInput
  ): Promise<ProductVariantRecord>;
  updateVariant(
    productId: string,
    variantId: string,
    input: UpdateProductVariantInput
  ): Promise<ProductVariantRecord | null>;
  deleteVariant(productId: string, variantId: string): Promise<boolean>;
  adjustInventory(
    storeId: string,
    productId: string,
    variantId: string | null,
    delta: number,
    reason: string | null
  ): Promise<InventoryMovementRecord>;
  inventoryHistory(
    storeId: string,
    productId: string
  ): Promise<InventoryMovementRecord[]>;
  listLowStock(storeId: string): Promise<InventoryLowStockItem[]>;
  getPublicCatalog(handle: string): Promise<PublicStoreCatalogResponse | null>;
}

function toCategoryRecord(row: CatalogCategory): CatalogCategoryRecord {
  return {
    id: row.id,
    storeId: row.storeId,
    parentId: row.parentId,
    name: row.name,
    imageUrl: row.imageUrl,
    icon: row.icon,
    sortOrder: row.sortOrder,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toImageRecord(row: ProductImage) {
  return {
    id: row.id,
    productId: row.productId,
    url: row.url,
    altText: row.altText,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString()
  };
}

function toVariantRecord(row: ProductVariant): ProductVariantRecord {
  return {
    id: row.id,
    productId: row.productId,
    title: row.title,
    optionValues: row.optionValues,
    sku: row.sku,
    priceOverride:
      row.priceOverride === null ? null : Number(row.priceOverride),
    imageUrl: row.imageUrl,
    available: row.available,
    availableQuantity: row.availableQuantity,
    reservedQuantity: row.reservedQuantity,
    lowStockThreshold: row.lowStockThreshold,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toMovementRecord(row: InventoryMovement): InventoryMovementRecord {
  return {
    id: row.id,
    storeId: row.storeId,
    productId: row.productId,
    variantId: row.variantId,
    delta: row.delta,
    previousQuantity: row.previousQuantity,
    newQuantity: row.newQuantity,
    reason: row.reason,
    createdAt: row.createdAt.toISOString()
  };
}

function toProductRecord(
  row: CatalogProduct,
  images: ProductImage[],
  variants: ProductVariant[]
): CatalogProductRecord {
  return {
    id: row.id,
    storeId: row.storeId,
    categoryId: row.categoryId,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    compareAtPrice:
      row.compareAtPrice === null ? null : Number(row.compareAtPrice),
    sku: row.sku,
    brand: row.brand,
    barcode: row.barcode,
    weightGrams: row.weightGrams,
    dimensions: row.dimensions,
    tags: row.tags,
    shippingClass: row.shippingClass,
    deliveryRestrictions: row.deliveryRestrictions,
    status: row.status,
    availableQuantity: row.availableQuantity,
    reservedQuantity: row.reservedQuantity,
    lowStockThreshold: row.lowStockThreshold,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    images: images.map(toImageRecord),
    variants: variants.map(toVariantRecord)
  };
}

function numberToDecimal(value: number): string {
  return value.toFixed(2);
}

export class DatabaseCatalogRepository implements CatalogRepository {
  constructor(private readonly db: Database) {}

  private async hydrateProducts(
    rows: CatalogProduct[]
  ): Promise<CatalogProductRecord[]> {
    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.id);
    const [imageRows, variantRows] = await Promise.all([
      this.db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, ids))
        .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt)),
      this.db
        .select()
        .from(productVariants)
        .where(inArray(productVariants.productId, ids))
        .orderBy(asc(productVariants.createdAt))
    ]);

    return rows.map((row) =>
      toProductRecord(
        row,
        imageRows.filter((image) => image.productId === row.id),
        variantRows.filter((variant) => variant.productId === row.id)
      )
    );
  }

  async getStoreAccess(
    ownerUserId: string,
    storeId: string
  ): Promise<CatalogStoreAccess | null> {
    const [row] = await this.db
      .select({
        storeId: stores.id,
        plan: storeSubscriptions.plan,
        subscriptionStatus: storeSubscriptions.status,
        storeStatus: stores.status
      })
      .from(stores)
      .innerJoin(
        storeSubscriptions,
        eq(storeSubscriptions.storeId, stores.id)
      )
      .where(
        and(
          eq(stores.id, storeId),
          eq(stores.ownerUserId, ownerUserId)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listCategories(storeId: string): Promise<CatalogCategoryRecord[]> {
    const rows = await this.db
      .select()
      .from(categories)
      .where(eq(categories.storeId, storeId))
      .orderBy(
        asc(categories.sortOrder),
        asc(categories.name),
        asc(categories.createdAt)
      );

    return rows.map(toCategoryRecord);
  }

  async countActiveCategories(storeId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(categories)
      .where(
        and(
          eq(categories.storeId, storeId),
          eq(categories.status, "active")
        )
      );

    return row?.value ?? 0;
  }

  async countNonArchivedProducts(storeId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          ne(products.status, "archived")
        )
      );

    return row?.value ?? 0;
  }

  async countNonArchivedProductsInCategory(
    storeId: string,
    categoryId: string
  ): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.categoryId, categoryId),
          ne(products.status, "archived")
        )
      );

    return row?.value ?? 0;
  }

  async countActiveChildCategories(
    storeId: string,
    categoryId: string
  ): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(categories)
      .where(
        and(
          eq(categories.storeId, storeId),
          eq(categories.parentId, categoryId),
          eq(categories.status, "active")
        )
      );

    return row?.value ?? 0;
  }

  async findCategory(
    storeId: string,
    categoryId: string
  ): Promise<CatalogCategoryRecord | null> {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.storeId, storeId),
          eq(categories.id, categoryId)
        )
      )
      .limit(1);

    return row ? toCategoryRecord(row) : null;
  }

  async createCategory(
    storeId: string,
    input: CreateCategoryInput,
    categoryLimit: number | null
  ): Promise<CatalogCategoryRecord> {
    const row = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from ${storeSubscriptions}
          where ${storeSubscriptions.storeId} = ${storeId}
          for update`
      );

      if (categoryLimit !== null) {
        const [usage] = await tx
          .select({ value: count() })
          .from(categories)
          .where(
            and(
              eq(categories.storeId, storeId),
              eq(categories.status, "active")
            )
          );

        if ((usage?.value ?? 0) >= categoryLimit) {
          throw new CatalogRepositoryLimitError("category");
        }
      }

      const [created] = await tx
        .insert(categories)
        .values({
          storeId,
          parentId: input.parentId ?? null,
          name: input.name,
          imageUrl: input.imageUrl ?? null,
          icon: input.icon ?? null,
          sortOrder: input.sortOrder ?? 0
        })
        .returning();

      if (!created) {
        throw new Error("category_insert_failed");
      }

      return created;
    });

    return toCategoryRecord(row);
  }

  async updateCategory(
    storeId: string,
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<CatalogCategoryRecord | null> {
    const [row] = await this.db
      .update(categories)
      .set({
        ...input,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(categories.storeId, storeId),
          eq(categories.id, categoryId)
        )
      )
      .returning();

    return row ? toCategoryRecord(row) : null;
  }

  async archiveCategory(
    storeId: string,
    categoryId: string
  ): Promise<CatalogCategoryRecord | null> {
    const [row] = await this.db
      .update(categories)
      .set({
        status: "archived",
        updatedAt: new Date()
      })
      .where(
        and(
          eq(categories.storeId, storeId),
          eq(categories.id, categoryId)
        )
      )
      .returning();

    return row ? toCategoryRecord(row) : null;
  }

  async restoreCategory(
    storeId: string,
    categoryId: string,
    categoryLimit: number | null
  ): Promise<CatalogCategoryRecord | null> {
    const row = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from ${storeSubscriptions}
          where ${storeSubscriptions.storeId} = ${storeId}
          for update`
      );

      if (categoryLimit !== null) {
        const [usage] = await tx
          .select({ value: count() })
          .from(categories)
          .where(
            and(
              eq(categories.storeId, storeId),
              eq(categories.status, "active")
            )
          );

        if ((usage?.value ?? 0) >= categoryLimit) {
          throw new CatalogRepositoryLimitError("category");
        }
      }

      const [restored] = await tx
        .update(categories)
        .set({
          status: "active",
          updatedAt: new Date()
        })
        .where(
          and(
            eq(categories.storeId, storeId),
            eq(categories.id, categoryId)
          )
        )
        .returning();

      return restored ?? null;
    });

    return row ? toCategoryRecord(row) : null;
  }

  async listProducts(
    storeId: string,
    query: ProductListQuery
  ): Promise<{ products: CatalogProductRecord[]; total: number }> {
    const conditions = [eq(products.storeId, storeId)];

    if (query.status) {
      conditions.push(eq(products.status, query.status));
    }

    if (query.categoryId) {
      conditions.push(eq(products.categoryId, query.categoryId));
    }

    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(products)
        .where(where)
        .orderBy(desc(products.updatedAt), desc(products.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ value: count() })
        .from(products)
        .where(where)
    ]);

    return {
      products: await this.hydrateProducts(rows),
      total: totalRows[0]?.value ?? 0
    };
  }

  async findProduct(
    storeId: string,
    productId: string
  ): Promise<CatalogProductRecord | null> {
    const [row] = await this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.id, productId)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return (await this.hydrateProducts([row]))[0] ?? null;
  }

  async createProduct(
    storeId: string,
    input: CreateProductInput,
    productLimit: number
  ): Promise<CatalogProductRecord> {
    const productId = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from ${storeSubscriptions}
          where ${storeSubscriptions.storeId} = ${storeId}
          for update`
      );

      const [usage] = await tx
        .select({ value: count() })
        .from(products)
        .where(
          and(
            eq(products.storeId, storeId),
            ne(products.status, "archived")
          )
        );

      if ((usage?.value ?? 0) >= productLimit) {
        throw new CatalogRepositoryLimitError("product");
      }

      const hasVariants = (input.variants?.length ?? 0) > 0;
      const values: NewCatalogProduct = {
        storeId,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description ?? null,
        price: numberToDecimal(input.price),
        compareAtPrice:
          input.compareAtPrice === null ||
          input.compareAtPrice === undefined
            ? null
            : numberToDecimal(input.compareAtPrice),
        sku: input.sku ?? null,
        brand: input.brand ?? null,
        barcode: input.barcode ?? null,
        weightGrams: input.weightGrams ?? null,
        dimensions: input.dimensions ?? null,
        tags: input.tags ?? [],
        shippingClass: input.shippingClass ?? null,
        deliveryRestrictions: input.deliveryRestrictions ?? null,
        availableQuantity: hasVariants ? 0 : input.availableQuantity,
        lowStockThreshold: input.lowStockThreshold ?? 0
      };

      const [created] = await tx
        .insert(products)
        .values(values)
        .returning();

      if (!created) {
        throw new Error("product_insert_failed");
      }

      if (input.images?.length) {
        await tx.insert(productImages).values(
          input.images.map((image) => ({
            productId: created.id,
            url: image.url,
            altText: image.altText ?? null,
            sortOrder: image.sortOrder ?? 0
          }))
        );
      }

      if (input.variants?.length) {
        const createdVariants = await tx
          .insert(productVariants)
          .values(
            input.variants.map((variant) => ({
              productId: created.id,
              title: variant.title,
              optionValues: variant.optionValues,
              sku: variant.sku ?? null,
              priceOverride:
                variant.priceOverride === null ||
                variant.priceOverride === undefined
                  ? null
                  : numberToDecimal(variant.priceOverride),
              imageUrl: variant.imageUrl ?? null,
              available: variant.available ?? true,
              availableQuantity: variant.availableQuantity,
              lowStockThreshold: variant.lowStockThreshold ?? 0
            }))
          )
          .returning();

        const initialMovements = createdVariants
          .filter((variant) => variant.availableQuantity !== 0)
          .map((variant) => ({
            storeId,
            productId: created.id,
            variantId: variant.id,
            delta: variant.availableQuantity,
            previousQuantity: 0,
            newQuantity: variant.availableQuantity,
            reason: "initial_stock"
          }));

        if (initialMovements.length > 0) {
          await tx.insert(inventoryMovements).values(initialMovements);
        }
      } else if (created.availableQuantity !== 0) {
        await tx.insert(inventoryMovements).values({
          storeId,
          productId: created.id,
          variantId: null,
          delta: created.availableQuantity,
          previousQuantity: 0,
          newQuantity: created.availableQuantity,
          reason: "initial_stock"
        });
      }

      return created.id;
    });

    const created = await this.findProduct(storeId, productId);
    if (!created) {
      throw new Error("product_read_after_insert_failed");
    }

    return created;
  }

  async updateProduct(
    storeId: string,
    productId: string,
    input: UpdateProductInput
  ): Promise<CatalogProductRecord | null> {
    const changes: Partial<NewCatalogProduct> & { updatedAt: Date } = {
      updatedAt: new Date()
    };

    if (input.name !== undefined) changes.name = input.name;
    if (input.categoryId !== undefined) changes.categoryId = input.categoryId;
    if (input.price !== undefined) changes.price = numberToDecimal(input.price);
    if (input.description !== undefined) changes.description = input.description;
    if (input.sku !== undefined) changes.sku = input.sku;
    if (input.brand !== undefined) changes.brand = input.brand;
    if (input.compareAtPrice !== undefined) {
      changes.compareAtPrice =
        input.compareAtPrice === null
          ? null
          : numberToDecimal(input.compareAtPrice);
    }
    if (input.barcode !== undefined) changes.barcode = input.barcode;
    if (input.weightGrams !== undefined) changes.weightGrams = input.weightGrams;
    if (input.dimensions !== undefined) changes.dimensions = input.dimensions;
    if (input.tags !== undefined) changes.tags = input.tags;
    if (input.shippingClass !== undefined) changes.shippingClass = input.shippingClass;
    if (input.deliveryRestrictions !== undefined) {
      changes.deliveryRestrictions = input.deliveryRestrictions;
    }
    if (input.lowStockThreshold !== undefined) {
      changes.lowStockThreshold = input.lowStockThreshold;
    }

    const [updated] = await this.db
      .update(products)
      .set(changes)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.id, productId)
        )
      )
      .returning({ id: products.id });

    return updated ? this.findProduct(storeId, productId) : null;
  }

  async setProductStatus(
    storeId: string,
    productId: string,
    status: ProductStatus,
    publishedAt?: Date | null
  ): Promise<CatalogProductRecord | null> {
    const [updated] = await this.db
      .update(products)
      .set({
        status,
        publishedAt:
          publishedAt === undefined
            ? undefined
            : publishedAt,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.id, productId)
        )
      )
      .returning({ id: products.id });

    return updated ? this.findProduct(storeId, productId) : null;
  }

  async restoreProduct(
    storeId: string,
    productId: string,
    productLimit: number
  ): Promise<CatalogProductRecord | null> {
    const restored = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from ${storeSubscriptions}
          where ${storeSubscriptions.storeId} = ${storeId}
          for update`
      );

      const [usage] = await tx
        .select({ value: count() })
        .from(products)
        .where(
          and(
            eq(products.storeId, storeId),
            ne(products.status, "archived")
          )
        );

      if ((usage?.value ?? 0) >= productLimit) {
        throw new CatalogRepositoryLimitError("product");
      }

      const [row] = await tx
        .update(products)
        .set({
          status: "draft",
          publishedAt: null,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(products.storeId, storeId),
            eq(products.id, productId),
            eq(products.status, "archived")
          )
        )
        .returning({ id: products.id });

      return row?.id ?? null;
    });

    return restored ? this.findProduct(storeId, restored) : null;
  }

  async addImage(
    productId: string,
    input: CreateProductImageInput
  ): Promise<CatalogProductRecord["images"][number]> {
    const [row] = await this.db
      .insert(productImages)
      .values({
        productId,
        url: input.url,
        altText: input.altText ?? null,
        sortOrder: input.sortOrder ?? 0
      })
      .returning();

    if (!row) {
      throw new Error("product_image_insert_failed");
    }

    return toImageRecord(row);
  }

  async deleteImage(productId: string, imageId: string): Promise<boolean> {
    const [row] = await this.db
      .delete(productImages)
      .where(
        and(
          eq(productImages.id, imageId),
          eq(productImages.productId, productId)
        )
      )
      .returning({ id: productImages.id });

    return Boolean(row);
  }

  async addVariant(
    storeId: string,
    productId: string,
    input: CreateProductVariantInput
  ): Promise<ProductVariantRecord> {
    const row = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(productVariants)
        .values({
          productId,
          title: input.title,
          optionValues: input.optionValues,
          sku: input.sku ?? null,
          priceOverride:
            input.priceOverride === null ||
            input.priceOverride === undefined
              ? null
              : numberToDecimal(input.priceOverride),
          imageUrl: input.imageUrl ?? null,
          available: input.available ?? true,
          availableQuantity: input.availableQuantity,
          lowStockThreshold: input.lowStockThreshold ?? 0
        })
        .returning();

      if (!created) {
        throw new Error("product_variant_insert_failed");
      }

      if (created.availableQuantity > 0) {
        await tx.insert(inventoryMovements).values({
          storeId,
          productId,
          variantId: created.id,
          delta: created.availableQuantity,
          previousQuantity: 0,
          newQuantity: created.availableQuantity,
          reason: "initial_stock"
        });
      }

      return created;
    });

    return toVariantRecord(row);
  }

  async updateVariant(
    productId: string,
    variantId: string,
    input: UpdateProductVariantInput
  ): Promise<ProductVariantRecord | null> {
    const changes: Partial<typeof productVariants.$inferInsert> & {
      updatedAt: Date;
    } = {
      updatedAt: new Date()
    };

    if (input.title !== undefined) changes.title = input.title;
    if (input.optionValues !== undefined) changes.optionValues = input.optionValues;
    if (input.sku !== undefined) changes.sku = input.sku;
    if (input.priceOverride !== undefined) {
      changes.priceOverride =
        input.priceOverride === null
          ? null
          : numberToDecimal(input.priceOverride);
    }
    if (input.imageUrl !== undefined) changes.imageUrl = input.imageUrl;
    if (input.available !== undefined) changes.available = input.available;
    if (input.lowStockThreshold !== undefined) {
      changes.lowStockThreshold = input.lowStockThreshold;
    }

    const [row] = await this.db
      .update(productVariants)
      .set(changes)
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.productId, productId)
        )
      )
      .returning();

    return row ? toVariantRecord(row) : null;
  }

  async deleteVariant(productId: string, variantId: string): Promise<boolean> {
    const [row] = await this.db
      .delete(productVariants)
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.productId, productId)
        )
      )
      .returning({ id: productVariants.id });

    return Boolean(row);
  }

  async adjustInventory(
    storeId: string,
    productId: string,
    variantId: string | null,
    delta: number,
    reason: string | null
  ): Promise<InventoryMovementRecord> {
    const movement = await this.db.transaction(async (tx) => {
      const [product] = await tx
        .select()
        .from(products)
        .where(
          and(
            eq(products.storeId, storeId),
            eq(products.id, productId)
          )
        )
        .limit(1);

      if (!product) {
        throw new CatalogRepositoryInventoryError(
          "inventory_target_invalid"
        );
      }

      let previousQuantity: number;
      let newQuantity: number;

      if (variantId) {
        const [variant] = await tx
          .select()
          .from(productVariants)
          .where(
            and(
              eq(productVariants.id, variantId),
              eq(productVariants.productId, productId)
            )
          )
          .limit(1);

        if (!variant) {
          throw new CatalogRepositoryInventoryError(
            "inventory_target_invalid"
          );
        }

        previousQuantity = variant.availableQuantity;
        newQuantity = previousQuantity + delta;

        if (newQuantity < 0) {
          throw new CatalogRepositoryInventoryError(
            "inventory_would_be_negative"
          );
        }

        await tx
          .update(productVariants)
          .set({
            availableQuantity: newQuantity,
            updatedAt: new Date()
          })
          .where(eq(productVariants.id, variantId));
      } else {
        const [variantUsage] = await tx
          .select({ value: count() })
          .from(productVariants)
          .where(eq(productVariants.productId, productId));

        if ((variantUsage?.value ?? 0) > 0) {
          throw new CatalogRepositoryInventoryError(
            "inventory_target_invalid"
          );
        }

        previousQuantity = product.availableQuantity;
        newQuantity = previousQuantity + delta;

        if (newQuantity < 0) {
          throw new CatalogRepositoryInventoryError(
            "inventory_would_be_negative"
          );
        }

        await tx
          .update(products)
          .set({
            availableQuantity: newQuantity,
            updatedAt: new Date()
          })
          .where(eq(products.id, productId));
      }

      const [row] = await tx
        .insert(inventoryMovements)
        .values({
          storeId,
          productId,
          variantId,
          delta,
          previousQuantity,
          newQuantity,
          reason
        })
        .returning();

      if (!row) {
        throw new Error("inventory_movement_insert_failed");
      }

      return row;
    });

    return toMovementRecord(movement);
  }

  async inventoryHistory(
    storeId: string,
    productId: string
  ): Promise<InventoryMovementRecord[]> {
    const rows = await this.db
      .select()
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.storeId, storeId),
          eq(inventoryMovements.productId, productId)
        )
      )
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(100);

    return rows.map(toMovementRecord);
  }

  async listLowStock(storeId: string): Promise<InventoryLowStockItem[]> {
    const productRows = await this.db
      .select({
        productId: products.id,
        productName: products.name,
        availableQuantity: products.availableQuantity,
        reservedQuantity: products.reservedQuantity,
        lowStockThreshold: products.lowStockThreshold
      })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          ne(products.status, "archived"),
          sql`${products.availableQuantity} - ${products.reservedQuantity} <= ${products.lowStockThreshold}`,
          notExists(
            this.db
              .select({ id: productVariants.id })
              .from(productVariants)
              .where(eq(productVariants.productId, products.id))
          )
        )
      )
      .orderBy(asc(products.name))
      .limit(100);

    const variantRows = await this.db
      .select({
        productId: products.id,
        productName: products.name,
        variantId: productVariants.id,
        variantTitle: productVariants.title,
        availableQuantity: productVariants.availableQuantity,
        reservedQuantity: productVariants.reservedQuantity,
        lowStockThreshold: productVariants.lowStockThreshold
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          eq(products.storeId, storeId),
          ne(products.status, "archived"),
          eq(productVariants.available, true),
          sql`${productVariants.availableQuantity} - ${productVariants.reservedQuantity} <= ${productVariants.lowStockThreshold}`
        )
      )
      .orderBy(asc(products.name), asc(productVariants.title))
      .limit(100);

    return [
      ...productRows.map((row) => ({
        productId: row.productId,
        productName: row.productName,
        variantId: null,
        variantTitle: null,
        availableQuantity: row.availableQuantity,
        reservedQuantity: row.reservedQuantity,
        lowStockThreshold: row.lowStockThreshold
      })),
      ...variantRows
    ];
  }

  async getPublicCatalog(
    handle: string
  ): Promise<PublicStoreCatalogResponse | null> {
    const [store] = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(
        and(
          eq(stores.handle, handle),
          eq(stores.status, "published")
        )
      )
      .limit(1);

    if (!store) {
      return null;
    }

    const [categoryRows, productRows] = await Promise.all([
      this.db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.storeId, store.id),
            eq(categories.status, "active")
          )
        )
        .orderBy(asc(categories.sortOrder), asc(categories.name)),
      this.db
        .select()
        .from(products)
        .where(
          and(
            eq(products.storeId, store.id),
            or(
              eq(products.status, "active"),
              eq(products.status, "out_of_stock")
            )
          )
        )
        .orderBy(desc(products.updatedAt))
        .limit(200)
    ]);

    const hydrated = await this.hydrateProducts(productRows);

    return {
      categories: categoryRows.map((category) => ({
        id: category.id,
        parentId: category.parentId,
        name: category.name,
        imageUrl: category.imageUrl,
        icon: category.icon,
        sortOrder: category.sortOrder
      })),
      products: hydrated.map((product) => ({
        id: product.id,
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        brand: product.brand,
        status:
          product.status === "out_of_stock"
            ? "out_of_stock"
            : "active",
        images: product.images.map((image) => ({
          id: image.id,
          url: image.url,
          altText: image.altText,
          sortOrder: image.sortOrder
        })),
        variants: product.variants.map((variant) => ({
          id: variant.id,
          title: variant.title,
          optionValues: variant.optionValues,
          priceOverride: variant.priceOverride,
          imageUrl: variant.imageUrl,
          available: variant.available
        }))
      }))
    };
  }
}
