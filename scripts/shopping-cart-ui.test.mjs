import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = path => readFileSync(path, "utf8");
const cart = read("apps/mobile/src/app/(tabs)/cart.tsx");
const shopping = read("apps/mobile/src/app/(tabs)/shopping.tsx");
const orders = read("apps/mobile/src/app/(tabs)/orders.tsx");
const api = read("apps/mobile/src/cart-pricing/api.ts");
const routes = read("apps/api/src/cart-pricing/routes.ts");

test("cart remove action shows a visible trash button and confirmation before DELETE", () => {
  assert.match(cart, /name="trash-outline"/);
  assert.match(cart, /accessibilityLabel=\{t\("cart\.removeProduct"\)/);
  assert.match(cart, /Alert\.alert\(t\("cart\.removeConfirmTitle"\)/);
  assert.match(cart, /style: "destructive"/);
  assert.match(cart, /run\("item:" \+ itemId, token => removeCartItem\(token, itemId\)\)/);
  assert.match(cart, /disabled=\{busyKey !== null\}/);
  assert.match(routes, /app\.delete\("\/customer\/cart\/items\/:itemId"/);
  assert.match(routes, /service\.removeItem\(/);
});

test("removing a product calls server DELETE and returns server-authoritative cart", async () => {
  const captured = [];
  const stub = async (url, init) => {
    captured.push({url, init});
    return { ok: true, status: 200, json: async () => ({itemCount: 0, groups: [], hasBlockingIssues: false}) };
  };
  const compiled = ts.transpileModule(api, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports, fetch: stub, AbortController: globalThis.AbortController,
    setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout,
    process: {env: {EXPO_PUBLIC_API_URL: "https://api.test.invalid"}}
  });
  const result = await exports.removeCartItem("user-session", "item-42");
  assert.equal(result.itemCount, 0);
  assert.equal(captured.length, 1);
  assert.equal(captured[0].init.method, "DELETE");
  assert.equal(captured[0].url, "https://api.test.invalid/customer/cart/items/item-42");
  assert.equal(captured[0].init.headers.authorization, "Bearer user-session");
});

test("cart mutations invalidate stale requests and update shopping badge", () => {
  assert.match(cart, /requestId !== requestEpoch\.current \|\| mutationLock\.current/);
  assert.match(cart, /if \(!sessionToken \|\| mutationLock\.current\) return/);
  assert.match(cart, /setCart\(next\)/);
  assert.match(cart, /onCartChange\?\.\(next\)/);
  assert.match(cart, /visibleCart = loadedToken === sessionToken \? cart : null/);
  assert.match(shopping, /<CartScreen onCartChange=\{updateCartCount\}/);
  assert.match(shopping, /\+\+cartCountEpoch\.current/);
  assert.match(shopping, /cartRequestId === cartCountEpoch\.current/);
});

test("quantity steppers, price totals, cart coupons and checkout survive redesign", () => {
  for (const pattern of [
    /<QuantityButton/, /minHeight: 44/, /width: 44, height: 44/,
    /updateCartItem\(token, itemId, \{ quantity \}\)/,
    /item\.quantity >= item\.availableQuantity/,
    /item\.quantity <= 1/, /applyCartCoupon\(/,
    /removeCartCoupon\(/, /cart\.totals\.preDeliveryTotal/,
    /cart\.checkout/, /hasBlockingIssues/
  ]) assert.match(cart, pattern);
});

test("Shopping titles are smaller across cart, orders, and top-level navigation", () => {
  assert.match(shopping, /fontSize: 18, lineHeight: 25/);
  assert.match(shopping, /fontSize: 13, lineHeight: 19/);
  assert.match(cart, /fontSize: 17, lineHeight: 24/);
  assert.match(cart, /fontSize: 15, lineHeight: 21/);
  assert.match(cart, /fontSize: 14, lineHeight: 20/);
  assert.match(orders, /fontSize: 17, lineHeight: 24/);
  assert.match(orders, /fontSize: 15, lineHeight: 21/);
  assert.doesNotMatch(cart, /variant="title"/);
  assert.doesNotMatch(orders, /variant="title"/);
});

test("new remove and quantity labels are translated to English, Dari, Pashto", () => {
  const keys = [
    "cart.removeConfirmTitle", "cart.removeConfirmMessage",
    "cart.removeProduct", "cart.decreaseQuantity", "cart.increaseQuantity"
  ];
  for (const locale of ["en", "fa-AF", "ps-AF"]) {
    const contents = read("packages/localization/src/locales/" + locale + ".ts");
    for (const key of keys) assert.ok(contents.includes(JSON.stringify(key)+":"), key+" missing "+locale);
  }
});
