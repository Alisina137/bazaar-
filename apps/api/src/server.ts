import {
  checkDatabaseConnection,
  closeDatabaseClient,
  createDatabaseClient,
  parseDatabaseConfig
} from "@bazaarlink/database";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

import { buildApp } from "./app.js";
import { parseAuthConfig } from "./auth/config.js";
import { DatabaseAuthRepository } from "./auth/repository.js";
import { AuthService } from "./auth/service.js";
import { DatabaseStoreRepository } from "./store/repository.js";
import { StoreService } from "./store/service.js";

loadEnv({
  path: resolve(process.cwd(), "../../.env"),
  quiet: true
});

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

const databaseClient = createDatabaseClient(parseDatabaseConfig());
const authRepository = new DatabaseAuthRepository(databaseClient.db);
const authService = new AuthService(
  authRepository,
  parseAuthConfig()
);
const storeRepository = new DatabaseStoreRepository(databaseClient.db);
const storeService = new StoreService(storeRepository);

const app = buildApp({
  databaseHealthCheck: () => checkDatabaseConnection(databaseClient),
  authService,
  storeService
});

app.addHook("onClose", async () => {
  await closeDatabaseClient(databaseClient);
});

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  await closeDatabaseClient(databaseClient);
  process.exit(1);
}
