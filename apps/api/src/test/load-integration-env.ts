import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";

const rootEnvPath = fileURLToPath(
  new URL("../../../../.env", import.meta.url)
);

loadEnv({
  path: rootEnvPath,
  quiet: true,
  // Local verification should use the same project .env as the API and
  // database scripts, even if PowerShell still has a stale DATABASE_URL.
  // CI intentionally keeps its workflow-provided PostgreSQL environment.
  override: process.env.CI !== "true"
});

export const INTEGRATION_TEST_TIMEOUT_MS = 60_000;
