import { configDefaults, defineConfig } from "vitest/config";

const runDatabaseIntegration =
  process.env.CI === "true" ||
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true";

export default defineConfig({
  test: {
    exclude: runDatabaseIntegration
      ? configDefaults.exclude
      : [
          ...configDefaults.exclude,
          "**/*.integration.test.ts"
        ]
  }
});
