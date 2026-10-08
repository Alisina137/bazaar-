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
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

import { users } from "./auth.js";
import { products } from "./catalog.js";
import { stores, subscriptionPlan } from "./store.js";

export const merchantStaffStatus = pgEnum("merchant_staff_status", [
  "active",
  "suspended"
]);

export const merchantStaffInviteStatus = pgEnum(
  "merchant_staff_invite_status",
  ["pending", "accepted", "revoked", "expired"]
);

export const subscriptionChangeDirection = pgEnum(
  "subscription_change_direction",
  ["upgrade", "downgrade"]
);

export const storeStaff = pgTable(
  "store_staff",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissions: jsonb("permissions")
      .$type<string[]>()
      .default([])
      .notNull(),
    status: merchantStaffStatus("status").default("active").notNull(),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
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
    uniqueIndex("store_staff_store_user_uidx").on(
      table.storeId,
      table.userId
    ),
    index("store_staff_user_status_idx").on(table.userId, table.status),
    index("store_staff_store_status_idx").on(table.storeId, table.status)
  ]
);

export const storeStaffInvites = pgTable(
  "store_staff_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    permissions: jsonb("permissions")
      .$type<string[]>()
      .default([])
      .notNull(),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    status: merchantStaffInviteStatus("status")
      .default("pending")
      .notNull(),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date"
    }).notNull(),
    acceptedAt: timestamp("accepted_at", {
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
    uniqueIndex("store_staff_invites_token_uidx").on(table.tokenHash),
    index("store_staff_invites_store_status_idx").on(
      table.storeId,
      table.status
    ),
    index("store_staff_invites_email_idx").on(table.email),
    index("store_staff_invites_expiry_idx").on(table.expiresAt)
  ]
);

export const productPromotions = pgTable(
  "product_promotions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    promotionalPrice: numeric("promotional_price", {
      precision: 14,
      scale: 2
    }).notNull(),
    active: boolean("active").default(true).notNull(),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "date"
    }).notNull(),
    endsAt: timestamp("ends_at", {
      withTimezone: true,
      mode: "date"
    }).notNull(),
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
    index("product_promotions_product_schedule_idx").on(
      table.productId,
      table.active,
      table.startsAt,
      table.endsAt
    ),
    index("product_promotions_store_schedule_idx").on(
      table.storeId,
      table.active,
      table.startsAt,
      table.endsAt
    ),
    check(
      "product_promotions_price_nonnegative",
      sql`${table.promotionalPrice} >= 0`
    ),
    check(
      "product_promotions_schedule_valid",
      sql`${table.endsAt} > ${table.startsAt}`
    )
  ]
);

export const growthAnalyticsEvents = pgTable(
  "growth_analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null"
    }),
    storeId: uuid("store_id").references(() => stores.id, {
      onDelete: "cascade"
    }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null"
    }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index("growth_events_name_created_idx").on(
      table.name,
      table.createdAt
    ),
    index("growth_events_store_created_idx").on(
      table.storeId,
      table.createdAt
    ),
    index("growth_events_product_created_idx").on(
      table.productId,
      table.createdAt
    )
  ]
);

export const subscriptionChanges = pgTable(
  "subscription_changes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    fromPlan: subscriptionPlan("from_plan").notNull(),
    toPlan: subscriptionPlan("to_plan").notNull(),
    direction: subscriptionChangeDirection("direction").notNull(),
    changedByUserId: uuid("changed_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    gracePeriodEnd: timestamp("grace_period_end", {
      withTimezone: true,
      mode: "date"
    }),
    restrictedProductCount: integer("restricted_product_count")
      .default(0)
      .notNull(),
    restoredProductCount: integer("restored_product_count")
      .default(0)
      .notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index("subscription_changes_store_created_idx").on(
      table.storeId,
      table.createdAt
    )
  ]
);

export type StoreStaff = typeof storeStaff.$inferSelect;
export type NewStoreStaff = typeof storeStaff.$inferInsert;
export type StoreStaffInvite = typeof storeStaffInvites.$inferSelect;
export type NewStoreStaffInvite = typeof storeStaffInvites.$inferInsert;
export type ProductPromotion = typeof productPromotions.$inferSelect;
export type NewProductPromotion = typeof productPromotions.$inferInsert;
export type GrowthAnalyticsEventRow = typeof growthAnalyticsEvents.$inferSelect;
export type NewGrowthAnalyticsEvent =
  typeof growthAnalyticsEvents.$inferInsert;
export type SubscriptionChange = typeof subscriptionChanges.$inferSelect;
export type NewSubscriptionChange = typeof subscriptionChanges.$inferInsert;
