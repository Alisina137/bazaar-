import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = file => readFileSync(file, "utf8");
const source = read("apps/mobile/src/order/api.ts");
const checkout = read("apps/mobile/src/app/checkout/index.tsx");
const backend = read("apps/api/src/order/routes.ts");
const service = read("apps/api/src/order/service.ts");
const contracts = read("packages/contracts/src/order.ts");

function client(fetchImpl) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  const waits = [];
  runInNewContext(output, {
    exports, fetch: fetchImpl,
    AbortController: globalThis.AbortController,
    setTimeout: (callback, ms) => { waits.push(ms); return globalThis.setTimeout(callback, ms); },
    clearTimeout: globalThis.clearTimeout,
    process: { env: { EXPO_PUBLIC_API_URL: "https://api.example.test" } }
  });
  return { api: exports, waits };
}
const sampleOrder = { id: "order-1", checkoutSessionId: "checkout-1" };
const input = { checkoutSessionId: "checkout-1", idempotencyKey: "order-once-123" };

test("place order sends a JSON body, uses a transaction-aware timeout and succeeds once", async () => {
  const methods = [];
  const { api, waits } = client(async (_, init) => {
    methods.push(init);
    return { ok: true, status: 201, json: async () => ({ orders: [sampleOrder], reused: false }) };
  });
  const result = await api.placeOrder("session", input);
  assert.equal(result.orders[0].id, "order-1");
  assert.deepEqual(methods.map(x => x.method), ["POST"]);
  assert.equal(methods[0].headers["content-type"], "application/json");
  assert.equal(methods[0].headers.authorization, "Bearer session");
  assert.equal(JSON.parse(methods[0].body).checkoutSessionId, input.checkoutSessionId);
  assert.deepEqual(waits, [45_000]);
});

test("on server 503 after commit, reconcile from order history; never repeat order POST", async () => {
  const methods = [];
  const { api } = client(async (_, init) => {
    methods.push(init.method);
    if (init.method === "POST") return {
      ok: false, status: 503, json: async () => ({
        error: { code: "service_unavailable", reference: "req-8" }
      })
    };
    return {
      ok: true, status: 200,
      json: async () => ({ orders: [sampleOrder, {id:"other", checkoutSessionId:"another-session"}] })
    };
  });
  const result = await api.placeOrder("session", input);
  assert.equal(result.reused, true);
  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].checkoutSessionId, input.checkoutSessionId);
  assert.deepEqual(methods, ["POST", "GET"]);
});

test("unconfirmed HTTP 503 preserves safe request ID and failure, doesn't create fake orders", async () => {
  const { api } = client(async (_, init) => {
    if (init.method === "POST") return {
      ok: false, status: 503,
      json: async () => ({ error: { code: "service_unavailable", reference: "req-ab" } })
    };
    return { ok: true, status: 200, json: async () => ({ orders: [] }) };
  });
  await assert.rejects(api.placeOrder("session", input),
    error => error.httpStatus === 503 && error.reference === "req-ab");
});

test("expected domain 409 does not inspect history or falsely recover", async () => {
  const methods = [];
  const { api } = client(async (_, init) => {
    methods.push(init.method);
    return { ok: false, status: 409, json: async () => ({ error: { code: "payment_not_ready" } }) };
  });
  await assert.rejects(api.placeOrder("session", input),
    error => error.code === "payment_not_ready" && error.httpStatus === 409);
  assert.deepEqual(methods, ["POST"]);
});

test("GET orders does not send Fastify-invalid empty JSON content type", async () => {
  const { api } = client(async (_, init) => {
    assert.equal(init.headers["content-type"], undefined);
    return { ok: true, status: 200, json: async () => ({ orders: [] }) };
  });
  await api.listCustomerOrders("session");
});

test("failed order reconciliation cannot mask network failures", async () => {
  const methods = [];
  const { api } = client(async (_, init) => {
    methods.push(init.method);
    throw new Error("Lost network");
  });
  await assert.rejects(api.placeOrder("session", input),
    error => error.httpStatus === null && error.transport === "network");
  assert.deepEqual(methods, ["POST", "GET"]);
});

test("backend logs unexpected failure with safe reference; notifier failure cannot invalidate committed order", () => {
  assert.match(backend, /reference = String\(reply\.request\.id\)/);
  assert.match(backend, /Unexpected order service failure/);
  assert.match(backend, /error: \{ code: "service_unavailable", reference \}/);
  assert.match(contracts, /reference\?: string/);
  assert.match(service, /Promise\.allSettled\(/);
});

test("checkout uses stable idempotency key and keeps uncertainties visible", () => {
  assert.match(checkout, /orderWriteLock\.current = true/);
  assert.match(checkout, /if \(orderWriteLock\.current\) return/);
  assert.match(checkout, /await placeOrder\(sessionToken,/);
  assert.match(checkout, /orderRequestErrorKey\(safe\)/);
  assert.match(checkout, /orderErrorRef/);
  assert.match(checkout, /orderNeedsCheck/);
  assert.match(checkout, /order\.customer\.checkOrderHistory/);
  assert.match(checkout, /orderIdempotencyRef\.current = idempotencyKey/);
  assert.match(checkout, /router\.replace\("\/\(tabs\)\/orders"\)/);
});

test("Phase 8 planning copy is no longer shown in any checkout language", () => {
  const translations = {
    en: "Your address, delivery and payment selections are ready.",
    "fa-AF": "آدرس، تحویل و پرداخت آماده است.",
    "ps-AF": "ستاسو پته، سپارنه او د تادیې انتخابونه چمتو دي."
  };
  for (const [lang, phrase] of Object.entries(translations)) {
    const txt = read("packages/localization/src/locales/" + lang + ".ts");
    const match = txt.match(/"payment\.customer\.reviewReady":\s*"([^"]+)"/);
    assert.ok(match, lang + " missing reviewReady");
    assert.ok(match[1].includes(phrase));
    for (const key of [
      "order.customer.checkOrderHistory",
      "order.error.serverFailure",
      "order.error.networkFailure",
      "order.error.requestTimeout"
    ]) assert.ok(txt.includes('"' + key + '":'), lang + " missing " + key);
  }
});
