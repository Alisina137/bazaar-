import { sql } from "drizzle-orm";
import {
  check,
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

import { users } from "./auth.js";
import { products, productVariants } from "./catalog.js";
import { checkoutSessions } from "./commerce.js";
import { stores } from "./store.js";

export const orderState = pgEnum("order_state", [
  "pending_payment",
  "pending_confirmation",
  "confirmed",
  "preparing",
  "ready",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "picked_up",
  "cancelled",
  "payment_failed",
  "refund_pending",
  "refunded",
  "delivery_failed"
]);

export const orderFulfillmentType = pgEnum("order_fulfillment_type", [
  "delivery",
  "pickup",
  "digital"
]);

export const fulfillmentState = pgEnum("fulfillment_state", [
  "pending",
  "preparing",
  "ready",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "picked_up",
  "cancelled",
  "delivery_failed"
]);

export const inventoryReservationState = pgEnum(
  "inventory_reservation_state",
  ["reserved", "committed", "released", "expired"]
);

export const orderEventSource = pgEnum("order_event_source", [
  "system",
  "customer",
  "merchant",
  "payment"
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: varchar("order_number", { length: 40 }).notNull(),
    checkoutSessionId: uuid("checkout_session_id")
      .notNull()
      .references(() => checkoutSessions.id, { onDelete: "restrict" }),
    customerUserId: uuid("customer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "restrict" }),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    state: orderState("state").default("pending_confirmation").notNull(),
    fulfillmentType: orderFulfillmentType("fulfillment_type").notNull(),
    currency: varchar("currency", { length: 3 }).default("AFN").notNull(),
    itemsSubtotal: numeric("items_subtotal", {
      precision: 14,
      scale: 2
    }).notNull(),
    productDiscount: numeric("product_discount", {
      precision: 14,
      scale: 2
    }).notNull(),
    couponDiscount: numeric("coupon_discount", {
      precision: 14,
      scale: 2
    }).notNull(),
    preDeliveryTotal: numeric("pre_delivery_total", {
      precision: 14,
      scale: 2
    }).notNull(),
    deliveryBase: numeric("delivery_base", {
      precision: 14,
      scale: 2
    }).notNull(),
    urgencySurcharge: numeric("urgency_surcharge", {
      precision: 14,
      scale: 2
    }).notNull(),
    productDeliverySurcharge: numeric("product_delivery_surcharge", {
      precision: 14,
      scale: 2
    }).notNull(),
    freeDeliveryDiscount: numeric("free_delivery_discount", {
      precision: 14,
      scale: 2
    }).notNull(),
    deliveryTotal: numeric("delivery_total", {
      precision: 14,
      scale: 2
    }).notNull(),
    total: numeric("total", { precision: 14, scale: 2 }).notNull(),
    customerAddressSnapshot: jsonb("customer_address_snapshot")
      .$type<Record<string, unknown> | null>(),
    deliverySnapshot: jsonb("delivery_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    paymentSnapshot: jsonb("payment_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    cancellationReason: text("cancellation_reason"),
    cancelledBy: varchar("cancelled_by", { length: 24 }),
    confirmationExpiresAt: timestamp("confirmation_expires_at", {
      withTimezone: true,
      mode: "date"
    }).notNull(),
    placedAt: timestamp("placed_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull(),
    confirmedAt: timestamp("confirmed_at", {
      withTimezone: true,
      mode: "date"
    }),
    preparingAt: timestamp("preparing_at", {
      withTimezone: true,
      mode: "date"
    }),
    readyAt: timestamp("ready_at", {
      withTimezone: true,
      mode: "date"
    }),
    dispatchedAt: timestamp("dispatched_at", {
      withTimezone: true,
      mode: "date"
    }),
    deliveredAt: timestamp("delivered_at", {
      withTimezone: true,
      mode: "date"
    }),
    pickedUpAt: timestamp("picked_up_at", {
      withTimezone: true,
      mode: "date"
    }),
    cancelledAt: timestamp("cancelled_at", {
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
    uniqueIndex("orders_order_number_uidx").on(table.orderNumber),
    uniqueIndex("orders_checkout_store_uidx").on(
      table.checkoutSessionId,
      table.storeId
    ),
    uniqueIndex("orders_idempotency_store_uidx").on(
      table.idempotencyKey,
      table.storeId
    ),
    index("orders_customer_user_id_idx").on(table.customerUserId),
    index("orders_store_id_idx").on(table.storeId),
    index("orders_store_state_idx").on(table.storeId, table.state),
    index("orders_customer_state_idx").on(
      table.customerUserId,
      table.state
    ),
    index("orders_placed_at_idx").on(table.placedAt),
    index("orders_confirmation_expiry_idx").on(
      table.state,
      table.confirmationExpiresAt
    ),
    check("orders_items_subtotal_nonnegative", sql`${table.itemsSubtotal} >= 0`),
    check("orders_product_discount_nonnegative", sql`${table.productDiscount} >= 0`),
    check("orders_coupon_discount_nonnegative", sql`${table.couponDiscount} >= 0`),
    check("orders_pre_delivery_total_nonnegative", sql`${table.preDeliveryTotal} >= 0`),
    check("orders_delivery_base_nonnegative", sql`${table.deliveryBase} >= 0`),
    check("orders_urgency_surcharge_nonnegative", sql`${table.urgencySurcharge} >= 0`),
    check("orders_product_delivery_surcharge_nonnegative", sql`${table.productDeliverySurcharge} >= 0`),
    check("orders_free_delivery_discount_nonnegative", sql`${table.freeDeliveryDiscount} >= 0`),
    check("orders_delivery_total_nonnegative", sql`${table.deliveryTotal} >= 0`),
    check("orders_total_nonnegative", sql`${table.total} >= 0`)
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "restrict"
    }),
    productName: varchar("product_name", { length: 180 }).notNull(),
    variantTitle: varchar("variant_title", { length: 180 }),
    imageUrl: text("image_url"),
    quantity: integer("quantity").notNull(),
    unitListPrice: numeric("unit_list_price", {
      precision: 14,
      scale: 2
    }).notNull(),
    unitPrice: numeric("unit_price", {
      precision: 14,
      scale: 2
    }).notNull(),
    lineItemsSubtotal: numeric("line_items_subtotal", {
      precision: 14,
      scale: 2
    }).notNull(),
    lineProductDiscount: numeric("line_product_discount", {
      precision: 14,
      scale: 2
    }).notNull(),
    lineTotal: numeric("line_total", {
      precision: 14,
      scale: 2
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_product_id_idx").on(table.productId),
    index("order_items_variant_id_idx").on(table.variantId),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    check("order_items_unit_list_price_nonnegative", sql`${table.unitListPrice} >= 0`),
    check("order_items_unit_price_nonnegative", sql`${table.unitPrice} >= 0`),
    check("order_items_line_subtotal_nonnegative", sql`${table.lineItemsSubtotal} >= 0`),
    check("order_items_line_discount_nonnegative", sql`${table.lineProductDiscount} >= 0`),
    check("order_items_line_total_nonnegative", sql`${table.lineTotal} >= 0`)
  ]
);

export const orderFulfillments = pgTable(
  "order_fulfillments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: orderFulfillmentType("type").notNull(),
    state: fulfillmentState("state").default("pending").notNull(),
    label: varchar("label", { length: 180 }).notNull(),
    trackingCode: varchar("tracking_code", { length: 120 }),
    expectedMinAt: timestamp("expected_min_at", {
      withTimezone: true,
      mode: "date"
    }),
    expectedMaxAt: timestamp("expected_max_at", {
      withTimezone: true,
      mode: "date"
    }),
    ruleSnapshot: jsonb("rule_snapshot")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date"
    }),
    readyAt: timestamp("ready_at", {
      withTimezone: true,
      mode: "date"
    }),
    dispatchedAt: timestamp("dispatched_at", {
      withTimezone: true,
      mode: "date"
    }),
    completedAt: timestamp("completed_at", {
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
    uniqueIndex("order_fulfillments_order_id_uidx").on(table.orderId),
    index("order_fulfillments_state_idx").on(table.state),
    index("order_fulfillments_tracking_code_idx").on(table.trackingCode)
  ]
);

export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "restrict"
    }),
    quantity: integer("quantity").notNull(),
    state: inventoryReservationState("state").default("reserved").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date"
    }).notNull(),
    committedAt: timestamp("committed_at", {
      withTimezone: true,
      mode: "date"
    }),
    releasedAt: timestamp("released_at", {
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
    uniqueIndex("inventory_reservations_order_item_uidx").on(
      table.orderItemId
    ),
    index("inventory_reservations_order_id_idx").on(table.orderId),
    index("inventory_reservations_product_id_idx").on(table.productId),
    index("inventory_reservations_variant_id_idx").on(table.variantId),
    index("inventory_reservations_state_expiry_idx").on(
      table.state,
      table.expiresAt
    ),
    check("inventory_reservations_quantity_positive", sql`${table.quantity} > 0`)
  ]
);

export const orderStateEvents = pgTable(
  "order_state_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromState: orderState("from_state"),
    toState: orderState("to_state").notNull(),
    source: orderEventSource("source").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null"
    }),
    reason: text("reason"),
    details: jsonb("details")
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
    index("order_state_events_order_id_idx").on(table.orderId),
    index("order_state_events_created_at_idx").on(table.createdAt)
  ]
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type OrderFulfillment = typeof orderFulfillments.$inferSelect;
export type NewOrderFulfillment = typeof orderFulfillments.$inferInsert;
export type InventoryReservation =
  typeof inventoryReservations.$inferSelect;
export type NewInventoryReservation =
  typeof inventoryReservations.$inferInsert;
export type OrderStateEvent = typeof orderStateEvents.$inferSelect;
export type NewOrderStateEvent = typeof orderStateEvents.$inferInsert;
