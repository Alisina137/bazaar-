import { configDefaults, defineConfig } from "vitest/config";

const runDatabaseIntegration =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true";

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      "dist/**",
      ...(runDatabaseIntegration
        ? []
        : ["**/*.integration.test.ts"])
    ]
  }
});
