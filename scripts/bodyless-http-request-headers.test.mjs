import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Regress the exact request-parser error reported by Fastify in production:
// FST_ERR_CTP_EMPTY_JSON_BODY. A request without a body must not claim
// Content-Type: application/json, including PUT/POST with empty bodies.
function loadClient(path, fetchImpl) {
  const source = readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  runInNewContext(output, {
    exports,
    fetch: fetchImpl,
    AbortController: globalThis.AbortController,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    process: { env: { EXPO_PUBLIC_API_URL: "https://bazaar.example.test" } }
  });
  return exports;
}

function createStrictServer() {
  const received = [];
  const fetchImpl = async (url, init) => {
    const headers = init.headers ?? {};
    const type = Object.entries(headers).find(([name]) => name.toLowerCase() === "content-type")?.[1];
    const hasBody = init.body !== undefined && init.body !== null;
    if (!hasBody && type === "application/json") {
      throw new Error("FST_ERR_CTP_EMPTY_JSON_BODY: Body cannot be empty when content-type is set to 'application/json'");
    }
    if (hasBody && type !== "application/json") {
      throw new Error("Expected application/json header for JSON request bodies");
    }
    assert.equal(headers.authorization, "Bearer test-session");
    received.push({ url, method: init.method, type: type ?? null, body: init.body ?? null });
    return {
      ok: true,
      status: url.includes("/customer/addresses/") && init.method === "DELETE" ? 204 : 200,
      json: async () => ({
        itemCount: 0, groups: [], saved: true, savedProductIds: [], stores: []
      })
    };
  };
  return { received, fetchImpl };
}

test("cart item DELETE must not send an empty JSON Content-Type", async () => {
  const server = createStrictServer();
  const cart = loadClient("apps/mobile/src/cart-pricing/api.ts", server.fetchImpl);
  await cart.removeCartItem("test-session", "item-1");
  assert.equal(server.received.length, 1);
  assert.equal(server.received[0].method, "DELETE");
  assert.equal(server.received[0].type, null);
  assert.equal(server.received[0].body, null);
});

test("all bodyless cart/pricing GET and DELETE requests omit JSON Content-Type", async () => {
  const server = createStrictServer();
  const cart = loadClient("apps/mobile/src/cart-pricing/api.ts", server.fetchImpl);
  await cart.getCart("test-session");
  await cart.removeCartCoupon("test-session", "store-1");
  await cart.listCustomerAddresses("test-session");
  await cart.deleteCustomerAddress("test-session", "address-1");
  await cart.getCheckoutQuote("test-session", "session-1");
  assert.deepEqual(server.received.map(x => x.method), ["GET", "DELETE", "GET", "DELETE", "GET"]);
  assert.ok(server.received.every(x => x.type === null && x.body === null));
});

test("JSON payload mutations retain application/json for POST/PATCH/PUT", async () => {
  const server = createStrictServer();
  const cart = loadClient("apps/mobile/src/cart-pricing/api.ts", server.fetchImpl);
  await cart.addCartItem("test-session", { productId: "product-1", quantity: 1 });
  await cart.updateCartItem("test-session", "item-1", { quantity: 2 });
  await cart.applyCartCoupon("test-session", { storeId: "store-1", code: "SAVE10" });
  await cart.createCustomerAddress("test-session", {
    label: "Home", recipientName: "Customer", phone: "0700000000",
    province: "Kabul", districtCity: "Kabul", addressDescription: "Street"
  });
  assert.deepEqual(server.received.map(x => x.method), ["POST", "PATCH", "PUT", "POST"]);
  assert.ok(server.received.every(x => x.type === "application/json" && x.body !== null));
});

test("wishlist GET/PUT/DELETE omit JSON header when sending no body", async () => {
  const server = createStrictServer();
  const wishlist = loadClient("apps/mobile/src/account/wishlist-api.ts", server.fetchImpl);
  await wishlist.getWishlist("test-session");
  await wishlist.saveWishlistProduct("test-session", "product-1");
  await wishlist.removeWishlistProduct("test-session", "product-1");
  assert.deepEqual(server.received.map(x => x.method), ["GET", "PUT", "DELETE"]);
  assert.ok(server.received.every(x => x.type === null && x.body === null));
});

test("store publish POST without body omits JSON header; create retains it", async () => {
  const server = createStrictServer();
  const store = loadClient("apps/mobile/src/store/api.ts", server.fetchImpl);
  await store.listStores("test-session");
  await store.publishStore("test-session", "store-1");
  await store.createStore("test-session", { name: "Test", handle: "test" });
  assert.deepEqual(server.received.map(x => x.method), ["GET", "POST", "POST"]);
  assert.deepEqual(server.received.map(x => x.type), [null, null, "application/json"]);
});

test("cart remove with recovery succeeds immediately without follow-up request", async () => {
  const server = createStrictServer();
  const cart = loadClient("apps/mobile/src/cart-pricing/api.ts", server.fetchImpl);
  const result = await cart.removeCartItemWithRecovery("test-session", "item-1");
  assert.equal(result.itemCount, 0);
  assert.equal(server.received.length, 1);
  assert.equal(server.received[0].method, "DELETE");
});
