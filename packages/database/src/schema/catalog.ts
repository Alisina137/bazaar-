import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn
} from "drizzle-orm/pg-core";

import { stores } from "./store.js";

export const categoryStatus = pgEnum("category_status", [
  "active",
  "archived"
]);

export const productStatus = pgEnum("product_status", [
  "draft",
  "active",
  "out_of_stock",
  "archived",
  "plan_restricted"
]);

export const platformCategories = pgTable(
  "platform_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => platformCategories.id,
      { onDelete: "restrict" }
    ),
    slug: varchar("slug", { length: 100 }).notNull(),
    nameFa: varchar("name_fa", { length: 120 }).notNull(),
    namePs: varchar("name_ps", { length: 120 }).notNull(),
    nameEn: varchar("name_en", { length: 120 }).notNull(),
    imageUrl: text("image_url"),
    icon: varchar("icon", { length: 80 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index("platform_categories_parent_id_idx").on(table.parentId),
    index("platform_categories_sort_idx").on(table.sortOrder),
    index("platform_categories_active_idx").on(table.active),
    index("platform_categories_slug_idx").on(table.slug)
  ]
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => categories.id,
      { onDelete: "restrict" }
    ),
    name: varchar("name", { length: 120 }).notNull(),
    imageUrl: text("image_url"),
    icon: varchar("icon", { length: 80 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    status: categoryStatus("status").default("active").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index("categories_store_id_idx").on(table.storeId),
    index("categories_parent_id_idx").on(table.parentId),
    index("categories_status_idx").on(table.status),
    index("categories_store_sort_idx").on(table.storeId, table.sortOrder)
  ]
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    marketplaceCategoryId: uuid("marketplace_category_id").references(
      () => platformCategories.id,
      { onDelete: "set null" }
    ),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description"),
    price: numeric("price", { precision: 14, scale: 2 }).notNull(),
    compareAtPrice: numeric("compare_at_price", { precision: 14, scale: 2 }),
    sku: varchar("sku", { length: 100 }),
    brand: varchar("brand", { length: 120 }),
    barcode: varchar("barcode", { length: 120 }),
    weightGrams: integer("weight_grams"),
    dimensions: varchar("dimensions", { length: 160 }),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    shippingClass: varchar("shipping_class", { length: 120 }),
    deliveryRestrictions: text("delivery_restrictions"),
    status: productStatus("status").default("draft").notNull(),
    availableQuantity: integer("available_quantity").default(0).notNull(),
    reservedQuantity: integer("reserved_quantity").default(0).notNull(),
    lowStockThreshold: integer("low_stock_threshold").default(0).notNull(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "date"
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index("products_store_id_idx").on(table.storeId),
    index("products_category_id_idx").on(table.categoryId),
    index("products_marketplace_category_idx").on(table.marketplaceCategoryId),
    index("products_status_idx").on(table.status),
    index("products_price_idx").on(table.price),
    index("products_published_at_idx").on(table.publishedAt),
    index("products_store_created_idx").on(table.storeId, table.createdAt),
    check("products_price_nonnegative", sql`${table.price} >= 0`),
    check(
      "products_available_quantity_nonnegative",
      sql`${table.availableQuantity} >= 0`
    ),
    check(
      "products_reserved_quantity_nonnegative",
      sql`${table.reservedQuantity} >= 0`
    ),
    check(
      "products_low_stock_threshold_nonnegative",
      sql`${table.lowStockThreshold} >= 0`
    )
  ]
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: varchar("alt_text", { length: 200 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index("product_images_product_id_idx").on(table.productId),
    index("product_images_product_sort_idx").on(
      table.productId,
      table.sortOrder
    )
  ]
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 180 }).notNull(),
    optionValues: jsonb("option_values")
      .$type<Record<string, string>>()
      .default({})
      .notNull(),
    sku: varchar("sku", { length: 100 }),
    priceOverride: numeric("price_override", { precision: 14, scale: 2 }),
    imageUrl: text("image_url"),
    available: boolean("available").default(true).notNull(),
    availableQuantity: integer("available_quantity").default(0).notNull(),
    reservedQuantity: integer("reserved_quantity").default(0).notNull(),
    lowStockThreshold: integer("low_stock_threshold").default(0).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index("product_variants_product_id_idx").on(table.productId),
    index("product_variants_product_sku_idx").on(table.productId, table.sku),
    check(
      "product_variants_available_quantity_nonnegative",
      sql`${table.availableQuantity} >= 0`
    ),
    check(
      "product_variants_reserved_quantity_nonnegative",
      sql`${table.reservedQuantity} >= 0`
    ),
    check(
      "product_variants_low_stock_threshold_nonnegative",
      sql`${table.lowStockThreshold} >= 0`
    )
  ]
);


export const marketplaceProductMetrics = pgTable(
  "marketplace_product_metrics",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    viewCount: integer("view_count").default(0).notNull(),
    lastViewedAt: timestamp("last_viewed_at", {
      withTimezone: true,
      mode: "date"
    }),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index("marketplace_product_metrics_view_count_idx").on(table.viewCount),
    index("marketplace_product_metrics_last_viewed_idx").on(table.lastViewedAt)
  ]
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "cascade"
    }),
    delta: integer("delta").notNull(),
    previousQuantity: integer("previous_quantity").notNull(),
    newQuantity: integer("new_quantity").notNull(),
    reason: varchar("reason", { length: 160 }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index("inventory_movements_store_id_idx").on(table.storeId),
    index("inventory_movements_product_id_idx").on(table.productId),
    index("inventory_movements_variant_id_idx").on(table.variantId),
    index("inventory_movements_created_at_idx").on(table.createdAt)
  ]
);

export type PlatformCategory = typeof platformCategories.$inferSelect;
export type NewPlatformCategory = typeof platformCategories.$inferInsert;
export type MarketplaceProductMetric = typeof marketplaceProductMetrics.$inferSelect;
export type NewMarketplaceProductMetric = typeof marketplaceProductMetrics.$inferInsert;
export type CatalogCategory = typeof categories.$inferSelect;
export type NewCatalogCategory = typeof categories.$inferInsert;
export type CatalogProduct = typeof products.$inferSelect;
export type NewCatalogProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type NewInventoryMovement = typeof inventoryMovements.$inferInsert;
