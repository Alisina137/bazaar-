import { index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth.js";
import { products } from "./catalog.js";

/** Saved items are private to a customer and are never shared between accounts. */
export const customerWishlist = pgTable("customer_wishlist", {
  userId: uuid("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow().notNull()
}, (table) => [
  primaryKey({ name: "customer_wishlist_pk", columns: [table.userId, table.productId] }),
  index("customer_wishlist_user_recent_idx").on(table.userId, table.createdAt)
]);

export type CustomerWishlistItem = typeof customerWishlist.$inferSelect;
