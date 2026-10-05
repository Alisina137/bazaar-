import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "./auth.js";
import { products } from "./catalog.js";
import { stores } from "./store.js";

export const couponDiscountType = pgEnum("coupon_discount_type", [
  "percentage",
  "fixed"
]);

export const checkoutSessionStatus = pgEnum("checkout_session_status", [
  "draft",
  "quoted",
  "expired"
]);

export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 80 }),
    recipientName: varchar("recipient_name", { length: 160 }).notNull(),
    country: varchar("country", { length: 100 })
      .default("Afghanistan")
      .notNull(),
    province: varchar("province", { length: 100 }).notNull(),
    districtCity: varchar("district_city", { length: 120 }).notNull(),
    areaNeighborhood: varchar("area_neighborhood", { length: 160 }),
    addressDescription: text("address_description").notNull(),
    nearestLandmark: varchar("nearest_landmark", { length: 240 }),
    phone: varchar("phone", { length: 32 }).notNull(),
    mapLatitude: doublePrecision("map_latitude"),
    mapLongitude: doublePrecision("map_longitude"),
    deliveryInstructions: text("delivery_instructions"),
    isDefault: boolean("is_default").default(false).notNull(),
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
    index("customer_addresses_user_id_idx").on(table.userId),
    index("customer_addresses_user_default_idx").on(
      table.userId,
      table.isDefault
    )
  ]
);

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 3 })
      .default("AFN")
      .notNull(),
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
    uniqueIndex("carts_user_id_uidx").on(table.userId),
    index("carts_updated_at_idx").on(table.updatedAt)
  ]
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id"),
    quantity: integer("quantity").notNull(),
    unitPriceSnapshot: numeric("unit_price_snapshot", {
      precision: 14,
      scale: 2
    }).notNull(),
    compareAtPriceSnapshot: numeric("compare_at_price_snapshot", {
      precision: 14,
      scale: 2
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
    index("cart_items_cart_id_idx").on(table.cartId),
    index("cart_items_product_id_idx").on(table.productId),
    index("cart_items_variant_id_idx").on(table.variantId),
    check("cart_items_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "cart_items_unit_price_nonnegative",
      sql`${table.unitPriceSnapshot} >= 0`
    )
  ]
);

export const storeCoupons = pgTable(
  "store_coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 64 }).notNull(),
    type: couponDiscountType("type").notNull(),
    value: numeric("value", { precision: 14, scale: 2 }).notNull(),
    minimumOrderAmount: numeric("minimum_order_amount", {
      precision: 14,
      scale: 2
    }),
    active: boolean("active").default(true).notNull(),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "date"
    }),
    endsAt: timestamp("ends_at", {
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
    uniqueIndex("store_coupons_store_code_uidx").on(
      table.storeId,
      table.code
    ),
    index("store_coupons_store_active_idx").on(table.storeId, table.active),
    check("store_coupons_value_positive", sql`${table.value} > 0`),
    check(
      "store_coupons_minimum_nonnegative",
      sql`${table.minimumOrderAmount} is null or ${table.minimumOrderAmount} >= 0`
    ),
    check(
      "store_coupons_percentage_max",
      sql`${table.type} <> 'percentage' or ${table.value} <= 100`
    )
  ]
);

export const cartStoreCoupons = pgTable(
  "cart_store_coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    couponCode: varchar("coupon_code", { length: 64 }).notNull(),
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
    uniqueIndex("cart_store_coupons_cart_store_uidx").on(
      table.cartId,
      table.storeId
    ),
    index("cart_store_coupons_cart_id_idx").on(table.cartId)
  ]
);

export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    addressId: uuid("address_id").references(() => customerAddresses.id, {
      onDelete: "set null"
    }),
    status: checkoutSessionStatus("status").default("draft").notNull(),
    pricingSnapshot: jsonb("pricing_snapshot")
      .$type<Record<string, unknown> | null>(),
    cartUpdatedAt: timestamp("cart_updated_at", {
      withTimezone: true,
      mode: "date"
    }),
    expiresAt: timestamp("expires_at", {
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
    index("checkout_sessions_user_id_idx").on(table.userId),
    index("checkout_sessions_cart_id_idx").on(table.cartId),
    index("checkout_sessions_status_idx").on(table.status),
    index("checkout_sessions_expires_at_idx").on(table.expiresAt)
  ]
);

export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type NewCustomerAddress = typeof customerAddresses.$inferInsert;
export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
export type StoreCoupon = typeof storeCoupons.$inferSelect;
export type NewStoreCoupon = typeof storeCoupons.$inferInsert;
export type CartStoreCoupon = typeof cartStoreCoupons.$inferSelect;
export type NewCartStoreCoupon = typeof cartStoreCoupons.$inferInsert;
export type CheckoutSession = typeof checkoutSessions.$inferSelect;
export type NewCheckoutSession = typeof checkoutSessions.$inferInsert;
