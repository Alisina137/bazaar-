import { config as loadEnv } from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve } from "node:path";

import {
  closeDatabaseClient,
  createDatabaseClient
} from "../src/client.js";
import { parseDatabaseConfig } from "../src/env.js";
import { describeDatabaseRuntimeError } from "./runtime-error.js";

loadEnv({
  path: resolve(process.cwd(), "../../.env"),
  quiet: true
});

const databaseConfig = parseDatabaseConfig();
const client = createDatabaseClient({
  ...databaseConfig,
  maxConnections: 1,
  prepareStatements: false
});

try {
  await migrate(client.db, {
    migrationsFolder: resolve(process.cwd(), "drizzle")
  });

  process.stdout.write("Database migrations applied successfully.\n");
} catch (error) {
  process.stderr.write(describeDatabaseRuntimeError(error) + "\n");
  process.exitCode = 1;
} finally {
  await closeDatabaseClient(client);
}
