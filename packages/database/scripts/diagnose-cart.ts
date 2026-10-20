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
 * Shows whether the configured API DB principal can write cart rows,
 * rather than confusing a healthy SELECT 1 /ready with working mutations.
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
    process.stderr.write("[cart:diagnose] Cart writes cannot be guaranteed; check DATABASE_URL, privileges and pnpm db:migrate.\n");
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
