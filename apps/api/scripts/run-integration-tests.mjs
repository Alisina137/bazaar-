import { spawnSync } from "node:child_process";
import process from "node:process";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const result = spawnSync(
  pnpmCommand,
  [
    "exec",
    "vitest",
    "run",
    "src/auth/auth.integration.test.ts",
    "src/store/store.integration.test.ts",
    "src/catalog/catalog.integration.test.ts",
    "src/marketplace/marketplace.integration.test.ts",
    "src/cart-pricing/cart-pricing.integration.test.ts",
    "src/delivery/delivery.integration.test.ts",
    "src/payment/payment.integration.test.ts",
    "src/order/order.integration.test.ts",
    "--no-file-parallelism"
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      RUN_DATABASE_INTEGRATION_TESTS: "true"
    },
    stdio: "inherit"
  }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
