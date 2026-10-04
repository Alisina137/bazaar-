import {
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

import { users } from "./auth.js";

export const storeStatus = pgEnum("store_status", [
  "draft",
  "published",
  "suspended"
]);

export const storeTheme = pgEnum("store_theme", [
  "minimal",
  "modern",
  "fashion",
  "electronics",
  "food"
]);

export const subscriptionPlan = pgEnum("subscription_plan", [
  "starter",
  "pro",
  "business"
]);

export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "grace_period",
  "expired",
  "canceled"
]);

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    handle: varchar("handle", { length: 80 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    province: varchar("province", { length: 100 }).notNull(),
    cityDistrict: varchar("city_district", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    preferredLocale: varchar("preferred_locale", { length: 10 })
      .default("fa-AF")
      .notNull(),
    logoUrl: text("logo_url"),
    coverImageUrl: text("cover_image_url"),
    description: text("description"),
    whatsappNumber: varchar("whatsapp_number", { length: 32 }),
    physicalAddress: text("physical_address"),
    mapLatitude: doublePrecision("map_latitude"),
    mapLongitude: doublePrecision("map_longitude"),
    businessHours: text("business_hours"),
    theme: storeTheme("theme").default("minimal").notNull(),
    accentColor: varchar("accent_color", { length: 7 })
      .default("#0F766E")
      .notNull(),
    status: storeStatus("status").default("draft").notNull(),
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
    uniqueIndex("stores_handle_uidx").on(table.handle),
    index("stores_owner_user_id_idx").on(table.ownerUserId),
    index("stores_status_idx").on(table.status),
    index("stores_created_at_idx").on(table.createdAt)
  ]
);

export const storeSubscriptions = pgTable(
  "store_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    plan: subscriptionPlan("plan").default("starter").notNull(),
    status: subscriptionStatus("status").default("active").notNull(),
    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true,
      mode: "date"
    }),
    gracePeriodEnd: timestamp("grace_period_end", {
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
    uniqueIndex("store_subscriptions_store_id_uidx").on(table.storeId),
    index("store_subscriptions_plan_idx").on(table.plan),
    index("store_subscriptions_status_idx").on(table.status)
  ]
);

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
export type StoreSubscription = typeof storeSubscriptions.$inferSelect;
export type NewStoreSubscription = typeof storeSubscriptions.$inferInsert;
