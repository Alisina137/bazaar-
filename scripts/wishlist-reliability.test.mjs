import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("apps/mobile/src/account/wishlist-api.ts", "utf8");
const page = readFileSync("apps/mobile/src/app/marketplace/product/[productId].tsx", "utf8");
const list = readFileSync("apps/mobile/src/app/account/wishlist.tsx", "utf8");
const routes = readFileSync("apps/api/src/wishlist/routes.ts", "utf8");
const translations = readFileSync("apps/mobile/src/account/wishlist-messages.ts", "utf8");

function client(fetch) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports, fetch, AbortController, setTimeout, clearTimeout,
    process: { env: { EXPO_PUBLIC_API_URL: "https://bazaar-test.invalid" } }
  });
  return exports;
}

test("API preserves actionable HTTP error codes and statuses", async () => {
  const wishlist = client(async () => ({
    ok: false, status: 401,
    json: async () => ({ error: { code: "invalid_session" } })
  }));
  await assert.rejects(
    wishlist.getWishlist("expired"), error =>
      error.code === "invalid_session" && error.httpStatus === 401
  );
  const serverDown = client(async () => ({
    ok: false, status: 503,
    json: async () => ({ error: { code: "service_unavailable" } })
  }));
  await assert.rejects(
    serverDown.getWishlist("token"), error =>
      error.code === "service_unavailable" && error.httpStatus === 503
  );
});

test("network failures cannot masquerade as a server HTTP response", async () => {
  const wishlist = client(async () => { throw new Error("offline"); });
  await assert.rejects(
    wishlist.getWishlist("token"), error =>
      error.code === "service_unavailable" && error.httpStatus === null
  );
});

test("save and remove use authenticated product-scoped idempotent routes", async () => {
  const requests = [];
  const wishlist = client(async (url, init) => {
    requests.push({ url, init });
    return {
      ok: true, status: 200,
      json: async () => ({ saved: init.method === "PUT", productId: "abc" })
    };
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(await wishlist.saveWishlistProduct("safe-token", "abc"))),
    { saved: true, productId: "abc" }
  );
  await wishlist.removeWishlistProduct("safe-token", "abc");
  assert.deepEqual(requests.map(r => r.init.method), ["PUT", "DELETE"]);
  assert.ok(requests.every(r => r.init.headers.authorization === "Bearer safe-token"));
  assert.ok(requests.every(r => r.url.endsWith("/customer/wishlist/abc")));
});

test("loading a wishlist is not incorrectly announced as a failed update", () => {
  assert.match(page, /setWishlistLoadError\(wishlistErrorKey\(error, "load"\)\)/);
  assert.match(page, /setWishlistError\(wishlistErrorKey\(error, "write"\)\)/);
  assert.match(page, /if \(active && requestId === wishlistRequestEpoch\.current\)/);
  assert.match(page, /wishlistWriteLock\.current = true/);
  assert.match(page, /setWishlisted\(result\.saved\)/);
  assert.match(page, /if \(saved === shouldSave\) return/);
  assert.match(page, /account\.shopping\.retry/);
  assert.match(list, /setError\(wishlistErrorKey\(reason, "load"\)\)/);
  assert.match(translations, /account\.wishlist\.loadServerError/);
  assert.match(translations, /error\.httpStatus === null/);
});

test("database errors are recorded in API logs for migration troubleshooting", () => {
  assert.match(routes, /request\.log\.error\(\{ err: error \}/);
  assert.match(routes, /customer_wishlist table/);
  const migration = readFileSync("packages/database/drizzle/0015_customer_wishlist.sql", "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "customer_wishlist"/);
  const journal = readFileSync("packages/database/drizzle/meta/_journal.json", "utf8");
  assert.match(journal, /0015_customer_wishlist/);
});

test("specific errors are available in English, Dari, and Pashto", () => {
  const keys = [...translations.matchAll(/"account\.wishlist\.[^"]+"/g)]
    .map(match => match[0]);
  assert.ok(keys.length >= 8);
  for (const locale of ["en", "fa-AF", "ps-AF"]) {
    const text = readFileSync("packages/localization/src/locales/" + locale + ".ts", "utf8");
    for (const key of keys) {
      assert.ok(text.includes(key + ":"), key + " missing in " + locale);
    }
  }
});
