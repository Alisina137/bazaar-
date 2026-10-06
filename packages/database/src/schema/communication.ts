import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

import { users } from "./auth.js";
import { orders } from "./order.js";
import { stores } from "./store.js";

export const notificationType = pgEnum("notification_type", [
  "order_placed",
  "payment_successful",
  "payment_failed",
  "order_confirmed",
  "order_cancelled",
  "order_preparing",
  "out_for_delivery",
  "delivered",
  "review_available",
  "low_stock",
  "new_review",
  "subscription_issue",
  "support_reply",
  "delivery_failed"
]);

export const pushPlatform = pgEnum("push_platform", [
  "android",
  "ios"
]);

export const pushDeliveryState = pgEnum("push_delivery_state", [
  "queued",
  "sent",
  "failed"
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    eventKey: varchar("event_key", { length: 220 }).notNull(),
    data: jsonb("data")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    deepLink: text("deep_link").notNull(),
    readAt: timestamp("read_at", {
      withTimezone: true,
      mode: "date"
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull()
  },
  (table) => [
    uniqueIndex("notifications_user_event_uidx").on(
      table.userId,
      table.eventKey
    ),
    index("notifications_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
    index("notifications_user_read_idx").on(table.userId, table.readAt)
  ]
);

export const pushDeviceTokens = pgTable(
  "push_device_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    platform: pushPlatform("platform").notNull(),
    deviceId: varchar("device_id", { length: 180 }),
    active: boolean("active").default(true).notNull(),
    lastRegisteredAt: timestamp("last_registered_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
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
    uniqueIndex("push_device_tokens_token_uidx").on(table.token),
    index("push_device_tokens_user_active_idx").on(
      table.userId,
      table.active
    )
  ]
);

export const pushDeliveries = pgTable(
  "push_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    deviceTokenId: uuid("device_token_id")
      .notNull()
      .references(() => pushDeviceTokens.id, { onDelete: "cascade" }),
    state: pushDeliveryState("state").default("queued").notNull(),
    providerTicketId: varchar("provider_ticket_id", { length: 180 }),
    error: text("error"),
    attemptedAt: timestamp("attempted_at", {
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
    uniqueIndex("push_deliveries_notification_token_uidx").on(
      table.notificationId,
      table.deviceTokenId
    ),
    index("push_deliveries_state_idx").on(table.state)
  ]
);

export const supportTicketStatus = pgEnum("support_ticket_status", [
  "open",
  "waiting_support",
  "waiting_customer",
  "closed"
]);

export const supportTicketCategory = pgEnum("support_ticket_category", [
  "order",
  "payment",
  "delivery",
  "product",
  "account",
  "merchant",
  "other"
]);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    storeId: uuid("store_id").references(() => stores.id, {
      onDelete: "set null"
    }),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null"
    }),
    category: supportTicketCategory("category").notNull(),
    subject: varchar("subject", { length: 240 }).notNull(),
    status: supportTicketStatus("status").default("open").notNull(),
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
      .notNull(),
    closedAt: timestamp("closed_at", {
      withTimezone: true,
      mode: "date"
    })
  },
  (table) => [
    index("support_tickets_user_updated_idx").on(
      table.userId,
      table.updatedAt
    ),
    index("support_tickets_store_idx").on(table.storeId),
    index("support_tickets_order_idx").on(table.orderId),
    index("support_tickets_status_updated_idx").on(
      table.status,
      table.updatedAt
    )
  ]
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    authorKind: varchar("author_kind", { length: 20 })
      .$type<"user" | "platform">()
      .notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date"
    })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index("support_messages_ticket_created_idx").on(
      table.ticketId,
      table.createdAt
    )
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type PushDeviceToken = typeof pushDeviceTokens.$inferSelect;
export type NewPushDeviceToken = typeof pushDeviceTokens.$inferInsert;
export type PushDelivery = typeof pushDeliveries.$inferSelect;
export type NewPushDelivery = typeof pushDeliveries.$inferInsert;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type NewSupportMessage = typeof supportMessages.$inferInsert;
