import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = path => readFileSync(path, "utf8");
const mobile = read("apps/mobile/src/cart-pricing/api.ts");
const apiRoutes = read("apps/api/src/cart-pricing/routes.ts");
const contract = read("packages/contracts/src/cart-pricing.ts");
const cart = read("apps/mobile/src/app/(tabs)/cart.tsx");
const product = read("apps/mobile/src/app/marketplace/product/[productId].tsx");
const diagnostic = read("packages/database/scripts/diagnose-cart.ts");
const integration = read("apps/api/src/cart-pricing/cart-pricing.integration.test.ts");

test("Unexpected API 503 attaches only non-secret request reference and logs route/method", () => {
  assert.match(apiRoutes, /const reference = String\(reply\.request\.id\)/);
  assert.match(apiRoutes, /operation: reply\.request\.method/);
  assert.match(apiRoutes, /route: reply\.request\.routeOptions\.url/);
  assert.match(apiRoutes, /error: \{ code: "service_unavailable", reference \}/);
  assert.match(contract, /reference\?: string/);
  assert.doesNotMatch(apiRoutes, /error: \{ code: "service_unavailable", message: error/);
});

test("client retains sanitized server error reference on an HTTP 503", async () => {
  const compiled = ts.transpileModule(mobile, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    fetch: async () => ({ok: false, status: 503, json: async () => ({
      error: {code: "service_unavailable", reference: "req-72"}
    })}),
    AbortController: globalThis.AbortController,
    setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout,
    process: {env: {EXPO_PUBLIC_API_URL: "https://cart.example.test"}}
  });
  await assert.rejects(exports.getCart("token"), e => 
    e.code === "service_unavailable" && e.httpStatus === 503 && e.reference === "req-72"
  );
});

test("cart and product show same granular errors and reference for server incident reports", () => {
  assert.match(cart, /cartPricingRequestErrorKey\(error\)/);
  assert.match(cart, /error\.reference/);
  assert.match(product, /cartPricingRequestErrorKey\(error\)/);
  assert.match(product, /purchaseErrorRef/);
  assert.match(product, /marketplace\.product\.purchaseHint/);
  assert.doesNotMatch(product, /marketplace\.product\.cartPhaseReady/);
});

test("read-only diagnostic checks mutations without changing real cart data", () => {
  for (const sql of [
    "transaction_read_only", "pg_is_in_recovery",
    "public.carts", "public.cart_items", "public.cart_store_coupons",
    "'INSERT'", "'UPDATE'", "'DELETE'"
  ]) assert.ok(diagnostic.includes(sql), "missing check "+sql);
  assert.doesNotMatch(diagnostic, /client\.sql[^]*\b(insert into|delete from|update public\.)/i);
});

test("database integration covers POST PATCH DELETE and customer ownership", () => {
  for (const method of ['"POST"', '"PATCH"', '"DELETE"']) {
    assert.ok(integration.includes('method: ' + method), method);
  }
  assert.match(integration, /expect\(removed\.statusCode\)\.toBe\(200\)/);
  assert.match(integration, /expect\(addedBack\.statusCode\)\.toBe\(201\)/);
  assert.match(integration, /expect\(quantityChanged\.statusCode\)\.toBe\(200\)/);
  assert.match(integration, /expect\(crossCustomerRemoval\.statusCode\)\.toBe\(404\)/);
});

test("English, Dari and Pashto have updated error references and purchase hints", () => {
  for (const lng of ["en", "fa-AF", "ps-AF"]) {
    const locale = read("packages/localization/src/locales/"+lng+".ts");
    for (const key of ["cart.error.reference", "marketplace.product.purchaseHint"]) {
      assert.ok(locale.includes(JSON.stringify(key)+":"), key + " not translated in " + lng);
    }
  }
});
