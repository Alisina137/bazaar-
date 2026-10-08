import { index, jsonb, numeric, pgTable, timestamp, uuid, varchar, text } from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { subscriptionPlan } from "./store.js";

export const platformAuditLogs = pgTable("platform_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  action: varchar("action", { length: 120 }).notNull(),
  resource: varchar("resource", { length: 80 }).notNull(),
  targetId: varchar("target_id", { length: 120 }).notNull(),
  reason: text("reason").notNull(),
  before: jsonb("before").$type<Record<string, unknown>>(),
  after: jsonb("after").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull()
}, (table) => [
  index("platform_audit_actor_created_idx").on(table.actorUserId, table.createdAt),
  index("platform_audit_resource_target_idx").on(table.resource, table.targetId),
  index("platform_audit_created_idx").on(table.createdAt)
]);

export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").$type<string>().notNull(),
  updatedByUserId: uuid("updated_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull()
});

export const platformPlanPrices = pgTable("platform_plan_prices", {
  plan: subscriptionPlan("plan").primaryKey(),
  monthlyAfn: numeric("monthly_afn", { precision: 14, scale: 2 }).notNull(),
  updatedByUserId: uuid("updated_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull()
});
