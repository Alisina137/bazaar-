import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
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
import { checkoutSessions } from "./commerce.js";
import { stores } from "./store.js";

export const paymentMethod = pgEnum("payment_method", [
  "cash_on_delivery",
  "hesabpay",
  "card",
  "pay_at_store"
]);

export const paymentProvider = pgEnum("payment_provider", [
  "manual",
  "hesabpay",
  "card_gateway"
]);

export const paymentState = pgEnum("payment_state", [
  "created",
  "pending",
  "paid",
  "failed",
  "cancelled",
  "expired",
  "refund_pending",
  "refunded",
  "partially_refunded"
]);

export const paymentRefundState = pgEnum("payment_refund_state", [
  "none",
  "pending",
  "partial",
  "refunded",
  "failed"
]);

export const paymentEventSource = pgEnum("payment_event_source", [
  "system",
  "customer",
  "merchant",
  "provider_webhook",
  "admin"
]);

export const storePaymentSettings = pgTable(
  "store_payment_settings",
  {
    storeId: uuid("store_id")
      .primaryKey()
      .references(() => stores.id, { onDelete: "cascade" }),
    cashOnDeliveryEnabled: boolean("cash_on_delivery_enabled")
      .default(true)
      .notNull(),
    hesabpayEnabled: boolean("hesabpay_enabled").default(false).notNull(),
    cardEnabled: boolean("card_enabled").default(false).notNull(),
    payAtStoreEnabled: boolean("pay_at_store_enabled").default(true).notNull(),
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
    index("store_payment_settings_cod_idx").on(
      table.cashOnDeliveryEnabled
    ),
    index("store_payment_settings_hesabpay_idx").on(table.hesabpayEnabled),
    index("store_payment_settings_card_idx").on(table.cardEnabled)
  ]
);

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    checkoutSessionId: uuid("checkout_session_id")
      .notNull()
      .references(() => checkoutSessions.id, { onDelete: "restrict" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "restrict" }),
    method: paymentMethod("method").notNull(),
    provider: paymentProvider("provider").notNull(),
    state: paymentState("state").default("created").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("AFN").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    providerSessionId: varchar("provider_session_id", { length: 255 }),
    providerTransactionId: varchar("provider_transaction_id", {
      length: 255
    }),
    providerReference: varchar("provider_reference", { length: 255 }),
    hostedCheckoutUrl: text("hosted_checkout_url"),
    failureCode: varchar("failure_code", { length: 120 }),
    failureReason: text("failure_reason"),
    refundState: paymentRefundState("refund_state").default("none").notNull(),
    refundedAmount: numeric("refunded_amount", {
      precision: 14,
      scale: 2
    })
      .default("0")
      .notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date"
    }),
    paidAt: timestamp("paid_at", {
      withTimezone: true,
      mode: "date"
    }),
    failedAt: timestamp("failed_at", {
      withTimezone: true,
      mode: "date"
    }),
    cancelledAt: timestamp("cancelled_at", {
      withTimezone: true,
      mode: "date"
    }),
    refundedAt: timestamp("refunded_at", {
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
    uniqueIndex("payment_attempts_idempotency_uidx").on(
      table.idempotencyKey
    ),
    uniqueIndex("payment_attempts_provider_tx_uidx").on(
      table.provider,
      table.providerTransactionId
    ),
    index("payment_attempts_user_id_idx").on(table.userId),
    index("payment_attempts_checkout_session_idx").on(
      table.checkoutSessionId
    ),
    index("payment_attempts_store_id_idx").on(table.storeId),
    index("payment_attempts_state_idx").on(table.state),
    index("payment_attempts_method_idx").on(table.method),
    check("payment_attempts_amount_nonnegative", sql`${table.amount} >= 0`),
    check(
      "payment_attempts_refunded_nonnegative",
      sql`${table.refundedAmount} >= 0`
    ),
    check(
      "payment_attempts_refunded_not_over_amount",
      sql`${table.refundedAmount} <= ${table.amount}`
    )
  ]
);

export const paymentStateEvents = pgTable(
  "payment_state_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentAttemptId: uuid("payment_attempt_id")
      .notNull()
      .references(() => paymentAttempts.id, { onDelete: "cascade" }),
    fromState: paymentState("from_state"),
    toState: paymentState("to_state").notNull(),
    source: paymentEventSource("source").notNull(),
    providerEventId: varchar("provider_event_id", { length: 255 }),
    deduplicationKey: varchar("deduplication_key", { length: 255 }),
    payloadFingerprint: varchar("payload_fingerprint", { length: 128 }),
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
    index("payment_state_events_attempt_idx").on(table.paymentAttemptId),
    index("payment_state_events_source_idx").on(table.source),
    uniqueIndex("payment_state_events_deduplication_uidx").on(
      table.deduplicationKey
    )
  ]
);

export type StorePaymentSettings = typeof storePaymentSettings.$inferSelect;
export type NewStorePaymentSettings =
  typeof storePaymentSettings.$inferInsert;
export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type NewPaymentAttempt = typeof paymentAttempts.$inferInsert;
export type PaymentStateEvent = typeof paymentStateEvents.$inferSelect;
export type NewPaymentStateEvent = typeof paymentStateEvents.$inferInsert;
