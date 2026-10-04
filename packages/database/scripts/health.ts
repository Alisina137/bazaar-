import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

import {
  checkDatabaseConnection,
  closeDatabaseClient,
  createDatabaseClient
} from "../src/client.js";
import { parseDatabaseConfig } from "../src/env.js";

loadEnv({
  path: resolve(process.cwd(), "../../.env"),
  quiet: true
});

const client = createDatabaseClient(parseDatabaseConfig());

try {
  await checkDatabaseConnection(client);
  process.stdout.write("Database connection verified.\n");
} finally {
  await closeDatabaseClient(client);
}
