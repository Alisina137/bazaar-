import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

import { apiTunnelMismatch, explainConnectivity, mobileApiUrl } from "./diagnose-mobile-connection.mjs";

const src = readFileSync("apps/mobile/src/cart-pricing/api.ts", "utf8");
const page = readFileSync("apps/mobile/src/app/(tabs)/cart.tsx", "utf8");
const messages = readFileSync("apps/mobile/src/cart-pricing/messages.ts", "utf8");

function client(fetchImpl, customTimers) {
  const compiled = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    fetch: fetchImpl,
    AbortController: globalThis.AbortController,
    setTimeout: customTimers?.setTimeout ?? globalThis.setTimeout,
    clearTimeout: customTimers?.clearTimeout ?? globalThis.clearTimeout,
    process: { env: { EXPO_PUBLIC_API_URL: "https://mobile-api.example.test" } }
  });
  return exports;
}

const cartWithItem = {
  id: "cart", itemCount: 1,
  groups: [{ store: { id: "shop" }, items: [{ id: "item-1" }] }]
};
const emptyCart = { id: "cart", itemCount: 0, groups: [] };

function okCart(value) {
  return { ok: true, status: 200, json: async () => value };
}

test("API distinguishes HTTP service failure from a phone/ngrok transport error", async () => {
  const backend = client(async () => ({
    ok: false, status: 503,
    json: async () => ({ error: { code: "service_unavailable" } })
  }));
  await assert.rejects(backend.removeCartItem("token", "item-1"), e =>
    e.code === "service_unavailable" && e.httpStatus === 503 && e.transport === null
  );

  const offline = client(async () => { throw new Error("Network request failed"); });
  await assert.rejects(offline.getCart("token"), e =>
    e.code === "service_unavailable" && e.httpStatus === null && e.transport === "network"
  );
});

test("request timeout is reported independently from backend HTTP failure", async () => {
  const hangingFetch = async (_, init) => new Promise((_, reject) => {
    init.signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
  });
  const simTimers = {
    setTimeout: callback => { globalThis.queueMicrotask(callback); return 1; },
    clearTimeout: () => undefined
  };
  const clientApi = client(hangingFetch, simTimers);
  await assert.rejects(clientApi.getCart("token"), e =>
    e.code === "service_unavailable" && e.httpStatus === null && e.transport === "timeout"
  );
});

test("lost delete response recovers from server cart state without sending DELETE again", async () => {
  const methods = [];
  const c = client(async (_, init) => {
    methods.push(init.method);
    if (init.method === "DELETE") throw new Error("response lost after server commit");
    return okCart(emptyCart);
  });
  const result = await c.removeCartItemWithRecovery("token", "item-1");
  assert.equal(result.itemCount, 0);
  assert.deepEqual(methods, ["DELETE", "GET"]);
});

test("confirmed failed removal preserves item and original error", async () => {
  const c = client(async (_, init) => {
    if (init.method === "DELETE") return {
      ok: false, status: 503,
      json: async () => ({ error: { code: "service_unavailable" } })
    };
    return okCart(cartWithItem);
  });
  await assert.rejects(c.removeCartItemWithRecovery("token", "item-1"), e =>
    e.httpStatus === 503 && e.code === "service_unavailable"
  );
});

test("failed delete and failed server reconciliation never fake successful removal", async () => {
  const c = client(async () => { throw new Error("no internet"); });
  await assert.rejects(c.removeCartItemWithRecovery("token", "item-1"), e =>
    e.code === "service_unavailable" && e.transport === "network"
  );
});

test("cart screen retains pending guards and renders granular API errors", () => {
  assert.match(page, /removeCartItemWithRecovery\(token, itemId\)/);
  assert.match(page, /cartPricingRequestErrorKey\(error\)/);
  assert.match(page, /if \(!sessionToken \|\| mutationLock\.current\) return/);
  assert.match(page, /onCartChange\?\.\(next\)/);
  assert.match(messages, /error\.transport === "timeout"/);
  assert.match(messages, /error\.httpStatus !== null/);
});

test("diagnostic distinguishes stale Expo API URLs, Metro outages and API outages", () => {
  assert.equal(mobileApiUrl("EXPO_PUBLIC_API_URL=https://old.example\nX=1\nEXPO_PUBLIC_API_URL=https://new.example\n"), "https://new.example");
  assert.equal(mobileApiUrl("X=1"), null);
  assert.equal(apiTunnelMismatch("https://old.example/", "https://new.example"), true);
  assert.equal(apiTunnelMismatch("https://same.example/", "https://same.example"), false);
  const issues = explainConnectivity({
    apiLocalReady: false, mobileApiReady: false, metroReady: false, urlMismatch: true
  });
  assert.ok(issues.some(s => s.includes("localhost:4000")));
  assert.ok(issues.some(s => s.includes("Expo Metro/CLI")));
  assert.ok(issues.some(s => s.includes("EXPO_PUBLIC_API_URL")));
});

test("cart transport errors are translated into all three supported languages", () => {
  const keys = [
    "cart.error.networkUnreachable", "cart.error.requestTimedOut",
    "cart.error.serverUnavailable"
  ];
  for (const language of ["en", "fa-AF", "ps-AF"]) {
    const content = readFileSync("packages/localization/src/locales/" + language + ".ts", "utf8");
    for (const key of keys) assert.ok(content.includes(JSON.stringify(key) + ":"), key + " missing " + language);
  }
});
