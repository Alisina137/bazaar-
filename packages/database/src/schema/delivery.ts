import { sql } from "drizzle-orm";
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
  uuid,
  varchar
} from "drizzle-orm/pg-core";

import { stores } from "./store.js";

export const deliveryDistanceRuleType = pgEnum(
  "delivery_distance_rule_type",
  ["tier", "base_per_km"]
);

export const deliverySurchargeType = pgEnum(
  "delivery_surcharge_type",
  ["fixed", "multiplier"]
);

export const deliverySpeedKind = pgEnum("delivery_speed_kind", [
  "economy",
  "standard",
  "same_day",
  "express",
  "custom"
]);

export const storeDeliverySettings = pgTable(
  "store_delivery_settings",
  {
    storeId: uuid("store_id")
      .primaryKey()
      .references(() => stores.id, { onDelete: "cascade" }),
    deliveryEnabled: boolean("delivery_enabled").default(false).notNull(),
    pickupEnabled: boolean("pickup_enabled").default(true).notNull(),
    originAddress: text("origin_address"),
    originProvince: varchar("origin_province", { length: 100 }),
    originDistrict: varchar("origin_district", { length: 120 }),
    originArea: varchar("origin_area", { length: 160 }),
    originLatitude: doublePrecision("origin_latitude"),
    originLongitude: doublePrecision("origin_longitude"),
    defaultDeliveryFee: numeric("default_delivery_fee", {
      precision: 14,
      scale: 2
    }),
    freeDeliveryThreshold: numeric("free_delivery_threshold", {
      precision: 14,
      scale: 2
    }),
    minimumOrderAmount: numeric("minimum_order_amount", {
      precision: 14,
      scale: 2
    }),
    operatingWeekdays: jsonb("operating_weekdays")
      .$type<number[]>()
      .default([0, 1, 2, 3, 4, 5, 6])
      .notNull(),
    cutoffTime: varchar("cutoff_time", { length: 5 }),
    pickupMinMinutes: integer("pickup_min_minutes").default(30).notNull(),
    pickupMaxMinutes: integer("pickup_max_minutes").default(120).notNull(),
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
    index("store_delivery_settings_enabled_idx").on(table.deliveryEnabled),
    check(
      "store_delivery_settings_default_fee_nonnegative",
      sql`${table.defaultDeliveryFee} is null or ${table.defaultDeliveryFee} >= 0`
    ),
    check(
      "store_delivery_settings_free_threshold_nonnegative",
      sql`${table.freeDeliveryThreshold} is null or ${table.freeDeliveryThreshold} >= 0`
    ),
    check(
      "store_delivery_settings_minimum_order_nonnegative",
      sql`${table.minimumOrderAmount} is null or ${table.minimumOrderAmount} >= 0`
    ),
    check(
      "store_delivery_settings_pickup_eta_valid",
      sql`${table.pickupMinMinutes} >= 0 and ${table.pickupMaxMinutes} >= ${table.pickupMinMinutes}`
    )
  ]
);

export const deliveryZones = pgTable(
  "delivery_zones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    province: varchar("province", { length: 100 }),
    districtCity: varchar("district_city", { length: 120 }),
    areaNeighborhood: varchar("area_neighborhood", { length: 160 }),
    fee: numeric("fee", { precision: 14, scale: 2 }).notNull(),
    priority: integer("priority").default(0).notNull(),
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
    index("delivery_zones_store_id_idx").on(table.storeId),
    index("delivery_zones_store_active_idx").on(table.storeId, table.active),
    index("delivery_zones_priority_idx").on(table.storeId, table.priority),
    check("delivery_zones_fee_nonnegative", sql`${table.fee} >= 0`),
    check(
      "delivery_zones_matcher_required",
      sql`${table.province} is not null or ${table.districtCity} is not null or ${table.areaNeighborhood} is not null`
    )
  ]
);

export const deliveryDistanceRules = pgTable(
  "delivery_distance_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    type: deliveryDistanceRuleType("type").notNull(),
    minDistanceKm: numeric("min_distance_km", {
      precision: 10,
      scale: 2
    })
      .default("0")
      .notNull(),
    maxDistanceKm: numeric("max_distance_km", {
      precision: 10,
      scale: 2
    }),
    fee: numeric("fee", { precision: 14, scale: 2 }),
    baseFee: numeric("base_fee", { precision: 14, scale: 2 }),
    perKmFee: numeric("per_km_fee", { precision: 14, scale: 2 }),
    priority: integer("priority").default(0).notNull(),
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
    index("delivery_distance_rules_store_id_idx").on(table.storeId),
    index("delivery_distance_rules_store_active_idx").on(
      table.storeId,
      table.active
    ),
    index("delivery_distance_rules_priority_idx").on(
      table.storeId,
      table.priority
    ),
    check(
      "delivery_distance_rules_min_nonnegative",
      sql`${table.minDistanceKm} >= 0`
    ),
    check(
      "delivery_distance_rules_max_valid",
      sql`${table.maxDistanceKm} is null or ${table.maxDistanceKm} > ${table.minDistanceKm}`
    ),
    check(
      "delivery_distance_rules_tier_fee",
      sql`(${table.type} <> 'tier') or (${table.fee} is not null and ${table.fee} >= 0)`
    ),
    check(
      "delivery_distance_rules_base_per_km",
      sql`(${table.type} <> 'base_per_km') or (
        ${table.baseFee} is not null and ${table.baseFee} >= 0
        and ${table.perKmFee} is not null and ${table.perKmFee} >= 0
      )`
    )
  ]
);

export const deliverySpeeds = pgTable(
  "delivery_speeds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    kind: deliverySpeedKind("kind").notNull(),
    surchargeType: deliverySurchargeType("surcharge_type")
      .default("fixed")
      .notNull(),
    surchargeValue: numeric("surcharge_value", {
      precision: 14,
      scale: 2
    })
      .default("0")
      .notNull(),
    minEtaMinutes: integer("min_eta_minutes").notNull(),
    maxEtaMinutes: integer("max_eta_minutes").notNull(),
    minimumOrderAmount: numeric("minimum_order_amount", {
      precision: 14,
      scale: 2
    }),
    maxRangeKm: numeric("max_range_km", {
      precision: 10,
      scale: 2
    }),
    cutoffTime: varchar("cutoff_time", { length: 5 }),
    supportedWeekdays: jsonb("supported_weekdays")
      .$type<number[]>()
      .default([0, 1, 2, 3, 4, 5, 6])
      .notNull(),
    maxWeightGrams: integer("max_weight_grams"),
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
    index("delivery_speeds_store_id_idx").on(table.storeId),
    index("delivery_speeds_store_active_idx").on(table.storeId, table.active),
    index("delivery_speeds_sort_idx").on(table.storeId, table.sortOrder),
    check(
      "delivery_speeds_surcharge_nonnegative",
      sql`${table.surchargeValue} >= 0`
    ),
    check(
      "delivery_speeds_multiplier_minimum",
      sql`${table.surchargeType} <> 'multiplier' or ${table.surchargeValue} >= 1`
    ),
    check(
      "delivery_speeds_eta_valid",
      sql`${table.minEtaMinutes} >= 0 and ${table.maxEtaMinutes} >= ${table.minEtaMinutes}`
    ),
    check(
      "delivery_speeds_minimum_order_nonnegative",
      sql`${table.minimumOrderAmount} is null or ${table.minimumOrderAmount} >= 0`
    ),
    check(
      "delivery_speeds_range_positive",
      sql`${table.maxRangeKm} is null or ${table.maxRangeKm} > 0`
    ),
    check(
      "delivery_speeds_weight_positive",
      sql`${table.maxWeightGrams} is null or ${table.maxWeightGrams} > 0`
    )
  ]
);

export type StoreDeliverySettings =
  typeof storeDeliverySettings.$inferSelect;
export type NewStoreDeliverySettings =
  typeof storeDeliverySettings.$inferInsert;
export type DeliveryZone = typeof deliveryZones.$inferSelect;
export type NewDeliveryZone = typeof deliveryZones.$inferInsert;
export type DeliveryDistanceRule =
  typeof deliveryDistanceRules.$inferSelect;
export type NewDeliveryDistanceRule =
  typeof deliveryDistanceRules.$inferInsert;
export type DeliverySpeed = typeof deliverySpeeds.$inferSelect;
export type NewDeliverySpeed = typeof deliverySpeeds.$inferInsert;
