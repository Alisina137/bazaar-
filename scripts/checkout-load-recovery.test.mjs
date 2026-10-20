import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = file => readFileSync(file, "utf8");
const checkout = read("apps/mobile/src/app/checkout/index.tsx");
const diagnostic = read("packages/database/scripts/diagnose-cart.ts");
const api = read("apps/mobile/src/cart-pricing/api.ts");

test("checkout identifies cart vs addresses request failures, not a generic network error", () => {
  assert.match(checkout, /Promise\.allSettled\(\[\s*getCart\(sessionToken\),\s*listCustomerAddresses\(sessionToken\)/);
  assert.match(checkout, /cartResult\.status === "rejected"/);
  assert.match(checkout, /addressResult\.status === "rejected"/);
  assert.match(checkout, /source: "addresses" as const/);
  assert.match(checkout, /cartPricingRequestErrorKey\(failure\.reason\)/);
  assert.match(checkout, /cartPricingRequestErrorKey\(error\)/);
  assert.doesNotMatch(checkout, /cartPricingErrorKey\(safe\.code\)/);
});

test("checkout error contains safe HTTP 503 backend reference and a working retry", () => {
  assert.match(checkout, /failure\.reason\.reference/);
  assert.match(checkout, /t\("cart\.error\.reference"\)/);
  assert.match(checkout, /initialLoadError\.source === "cart"/);
  assert.match(checkout, /onAction=\{\(\) => \{ void load\(\); \}\}/);
  assert.match(checkout, /router\.back\(\)/);
  assert.match(api, /reference: string \| null = null/);
});

test("cart and address data cannot leak across sessions or stale focus requests", () => {
  assert.match(checkout, /const requestId = \+\+loadEpoch\.current/);
  assert.match(checkout, /if \(requestId !== loadEpoch\.current\) return/);
  assert.match(checkout, /return \(\) => \{ loadEpoch\.current \+= 1; \}/);
  assert.match(checkout, /setCart\(null\)/);
  assert.match(checkout, /setAddresses\(\[\]\)/);
  assert.match(checkout, /setQuote\(null\)/);
  assert.match(checkout, /setPaymentReady\(false\)/);
  assert.match(checkout, /orderIdempotencyRef\.current = null/);
  assert.match(checkout, /if \(initialLoadError\)/);
});

test("checkout still requires a fresh authenticated cart and preserves payment gates", () => {
  for (const needle of [
    "getCart(sessionToken)",
    "listCustomerAddresses(sessionToken)",
    "cart.itemCount === 0",
    "cart.hasBlockingIssues",
    "createDeliveryCheckoutQuote(sessionToken",
    "getDeliveryOptions(",
    "await placeOrder(sessionToken",
    "disabled={!paymentReady || placingOrder}"
  ]) assert.ok(checkout.includes(needle), "missing critical guard " + needle);
});

test("DB read-only audit validates all referenced cart tables including scheduled promotions", () => {
  for (const relation of [
    "public.carts", "public.cart_items", "public.cart_store_coupons",
    "public.product_promotions", "public.product_images",
    "public.product_variants", "public.customer_addresses",
    "public.store_subscriptions", "public.products", "public.stores"
  ]) assert.ok(diagnostic.includes(relation), relation + " is not checked");
  assert.match(diagnostic, /has_table_privilege\(current_user, to_regclass\('public\.product_promotions'\), 'SELECT'\)/);
  assert.match(diagnostic, /0012_superb_roughhouse/);
  assert.doesNotMatch(diagnostic, /client\.db\.(insert|update|delete)/);
});

test("localization covers the cart and saved-address loading errors", () => {
  for (const locale of ["en", "fa-AF", "ps-AF"]) {
    const source = read("packages/localization/src/locales/" + locale + ".ts");
    for (const key of ["checkout.cartLoadErrorTitle", "checkout.addressLoadErrorTitle"]) {
      assert.ok(source.includes('"' + key + '":'), locale + " missing " + key);
    }
  }
});
