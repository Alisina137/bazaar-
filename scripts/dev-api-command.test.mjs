import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;

test("pnpm dev:api is canonical and launches the combined API and ngrok runner", () => {
  assert.equal(scripts["dev:api"], "node scripts/dev-api-with-ngrok.mjs");
  assert.equal(scripts["api:dev"], "pnpm dev:api");
  assert.equal(scripts["api:dev:server"], "pnpm --filter @bazaarlink/api dev");
});
