import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { users } from "./auth.js";
import { products } from "./catalog.js";
import { orderItems, orders } from "./order.js";
import { stores } from "./store.js";

export const reviewStatus = pgEnum("review_status", [
  "published",
  "reported",
  "hidden",
  "removed"
]);

export const reviewReportStatus = pgEnum("review_report_status", [
  "open",
  "resolved",
  "dismissed"
]);

export const reviewReportReason = pgEnum("review_report_reason", [
  "spam",
  "abuse",
  "misleading",
  "inappropriate",
  "other"
]);

export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerUserId: uuid("customer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "restrict" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "restrict" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    rating: integer("rating").notNull(),
    text: text("text"),
    imageUrls: jsonb("image_urls")
      .$type<string[]>()
      .default([])
      .notNull(),
    status: reviewStatus("status").default("published").notNull(),
    moderatedByUserId: uuid("moderated_by_user_id").references(
      () => users.id,
      { onDelete: "set null" }
    ),
    moderationReason: text("moderation_reason"),
    moderatedAt: timestamp("moderated_at", {
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
    uniqueIndex("product_reviews_order_item_uidx").on(table.orderItemId),
    index("product_reviews_product_status_idx").on(
      table.productId,
      table.status
    ),
    index("product_reviews_store_status_idx").on(
      table.storeId,
      table.status
    ),
    index("product_reviews_customer_idx").on(table.customerUserId),
    index("product_reviews_rating_idx").on(table.rating),
    index("product_reviews_created_at_idx").on(table.createdAt),
    check(
      "product_reviews_rating_range",
      sql`${table.rating} between 1 and 5`
    ),
    check(
      "product_reviews_image_limit",
      sql`jsonb_array_length(${table.imageUrls}) <= 5`
    )
  ]
);

export const reviewReports = pgTable(
  "review_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => productReviews.id, { onDelete: "cascade" }),
    reporterUserId: uuid("reporter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reason: reviewReportReason("reason").notNull(),
    details: text("details"),
    status: reviewReportStatus("status").default("open").notNull(),
    resolvedByUserId: uuid("resolved_by_user_id").references(
      () => users.id,
      { onDelete: "set null" }
    ),
    resolutionNote: text("resolution_note"),
    resolvedAt: timestamp("resolved_at", {
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
    uniqueIndex("review_reports_review_reporter_uidx").on(
      table.reviewId,
      table.reporterUserId
    ),
    index("review_reports_review_id_idx").on(table.reviewId),
    index("review_reports_status_idx").on(table.status),
    index("review_reports_created_at_idx").on(table.createdAt)
  ]
);

export type ProductReview = typeof productReviews.$inferSelect;
export type NewProductReview = typeof productReviews.$inferInsert;
export type ReviewReport = typeof reviewReports.$inferSelect;
export type NewReviewReport = typeof reviewReports.$inferInsert;
