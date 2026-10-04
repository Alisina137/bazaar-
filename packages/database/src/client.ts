import {
  drizzle,
  type PostgresJsDatabase
} from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import type { DatabaseConfig } from "./env.js";
import * as schema from "./schema/index.js";

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseClient {
  db: Database;
  sql: Sql;
}

export function createDatabaseClient(
  config: DatabaseConfig
): DatabaseClient {
  const sql = postgres(config.url, {
    max: config.maxConnections,
    connect_timeout: config.connectTimeoutSeconds,
    idle_timeout: config.idleTimeoutSeconds,
    prepare: config.prepareStatements
  });

  return {
    sql,
    db: drizzle(sql, { schema })
  };
}

export async function checkDatabaseConnection(
  client: DatabaseClient
): Promise<void> {
  const result = await client.sql<{ ok: number }[]>`
    select 1::int as ok
  `;

  if (result[0]?.ok !== 1) {
    throw new Error("Database health check returned an unexpected result");
  }
}

export async function closeDatabaseClient(
  client: DatabaseClient
): Promise<void> {
  await client.sql.end({ timeout: 5 });
}
