import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

import {
  checkDatabaseConnection,
  closeDatabaseClient,
  createDatabaseClient
} from "../src/client.js";
import { parseDatabaseConfig } from "../src/env.js";
import { describeDatabaseRuntimeError } from "./runtime-error.js";

loadEnv({ path: resolve(process.cwd(), "../../.env"), quiet: true });

/**
 * Non-destructive audit: no INSERT, UPDATE or DELETE is ever executed.
 * Audits the cart AND pricing/checkout dependencies referenced by getCart.
 * A healthy SELECT 1 /ready is insufficient if an older database is missing
 * product_promotions (migration 0012) or customer_addresses (migration 0005).
 */
const config = parseDatabaseConfig();
const client = createDatabaseClient({ ...config, maxConnections: 1, prepareStatements: false });

try {
  await checkDatabaseConnection(client);

  const result = await client.sql<{
    readonly_transaction: string;
    replica: boolean;
    carts_present: boolean;
    items_present: boolean;
    coupons_present: boolean;
    promotions_present: boolean;
    products_present: boolean;
    stores_present: boolean;
    subscriptions_present: boolean;
    images_present: boolean;
    variants_present: boolean;
    addresses_present: boolean;
    promotions_readable: boolean;
    cart_insert: boolean;
    cart_update: boolean;
    item_insert: boolean;
    item_update: boolean;
    item_delete: boolean;
  }[]>`
    select
      current_setting('transaction_read_only') as readonly_transaction,
      pg_is_in_recovery() as replica,
      to_regclass('public.carts') is not null as carts_present,
      to_regclass('public.cart_items') is not null as items_present,
      to_regclass('public.cart_store_coupons') is not null as coupons_present,
      to_regclass('public.product_promotions') is not null as promotions_present,
      to_regclass('public.products') is not null as products_present,
      to_regclass('public.stores') is not null as stores_present,
      to_regclass('public.store_subscriptions') is not null as subscriptions_present,
      to_regclass('public.product_images') is not null as images_present,
      to_regclass('public.product_variants') is not null as variants_present,
      to_regclass('public.customer_addresses') is not null as addresses_present,
      coalesce(has_table_privilege(current_user, to_regclass('public.product_promotions'), 'SELECT'), false) as promotions_readable,
      coalesce(has_table_privilege(current_user, to_regclass('public.carts'), 'INSERT'), false) as cart_insert,
      coalesce(has_table_privilege(current_user, to_regclass('public.carts'), 'UPDATE'), false) as cart_update,
      coalesce(has_table_privilege(current_user, to_regclass('public.cart_items'), 'INSERT'), false) as item_insert,
      coalesce(has_table_privilege(current_user, to_regclass('public.cart_items'), 'UPDATE'), false) as item_update,
      coalesce(has_table_privilege(current_user, to_regclass('public.cart_items'), 'DELETE'), false) as item_delete
  `;

  const row = result[0];
  if (!row) throw new Error("Cart audit returned no row");
  const checks: Record<string, boolean> = {
    "Database is writable": row.readonly_transaction === "off" && !row.replica,
    "carts table exists": row.carts_present,
    "cart_items table exists": row.items_present,
    "cart_store_coupons table exists": row.coupons_present,
    "product_promotions table exists (migration 0012)": row.promotions_present,
    "product_promotions SELECT privilege": row.promotions_readable,
    "products table exists": row.products_present,
    "stores table exists": row.stores_present,
    "store_subscriptions table exists": row.subscriptions_present,
    "product_images table exists": row.images_present,
    "product_variants table exists": row.variants_present,
    "customer_addresses table exists": row.addresses_present,
    "carts INSERT privilege": row.cart_insert,
    "carts UPDATE privilege": row.cart_update,
    "cart_items INSERT privilege": row.item_insert,
    "cart_items UPDATE privilege": row.item_update,
    "cart_items DELETE privilege": row.item_delete
  };
  for (const [label, ok] of Object.entries(checks)) {
    process.stdout.write("[cart:diagnose] " + (ok ? "PASS" : "FAIL") + ": " + label + "\n");
  }
  if (Object.values(checks).some(value => !value)) {
    process.stderr.write("[cart:diagnose] Cart/checkout reads or writes may fail. Check DATABASE_URL, required migrations (especially 0012_superb_roughhouse), privileges and pnpm db:migrate.\n");
    process.exitCode = 1;
  } else {
    process.stdout.write("[cart:diagnose] Static checks passed. If writes still return 503, inspect pnpm dev:api error log and share the request reference (no secrets).\n");
  }
} catch (error) {
  process.stderr.write(describeDatabaseRuntimeError(error) + "\n");
  process.exitCode = 1;
} finally {
  await closeDatabaseClient(client);
}
