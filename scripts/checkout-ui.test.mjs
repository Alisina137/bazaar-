import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(path, "utf8");
const checkout = read("apps/mobile/src/app/checkout/index.tsx");
const choice = read("apps/mobile/src/components/checkout/CheckoutChoice.tsx");
const payment = read("apps/mobile/src/payment/CheckoutPaymentSection.tsx");

test("checkout layout has compact progress, address choices and product thumbnails", () => {
  assert.match(checkout, /<CheckoutSteps/);
  assert.match(checkout, /addressReady=\{Boolean\(selectedAddress\)\}/);
  assert.match(checkout, /labels\.map\(\(key, index\)/);
  assert.match(checkout, /<CheckoutChoice/);
  assert.match(checkout, /addresses\.map\(address =>/);
  assert.match(checkout, /selected=\{selectedAddressId === address\.id\}/);
  assert.match(checkout, /<Image source=\{\{ uri: item\.imageUrl \}\}/);
  assert.match(checkout, /formatAfn\(item\.lineTotal\)/);
  assert.match(checkout, /fontSize: 22, lineHeight: 29/);
});

test("choice accessibility is preserved for address, delivery and payment methods", () => {
  assert.match(choice, /accessibilityRole="radio"/);
  assert.match(choice, /accessibilityState=\{\{ checked: selected, disabled \}\}/);
  assert.match(choice, /isRTL \? "row-reverse" : "row"/);
  assert.match(choice, /backgroundColor: selected \? theme\.colors\.primarySoft/);
  assert.match(checkout, /selected=\{selectedOptionId === option\.optionId\}/);
  assert.match(payment, /selected=\{selected\[group\.storeId\] === method\.method\}/);
  assert.match(payment, /disabled=\{!method\.available \|\| busy !== null\}/);
});

test("address and delivery changes invalidate stale quote and payment readiness", () => {
  assert.match(checkout, /if \(selectedAddressId === addressId\) return/);
  assert.match(checkout, /setSelectedAddressId\(addressId\)/);
  assert.match(checkout, /setDelivery\(null\)/);
  assert.match(checkout, /setSelectedOptions\(\{\}\)/);
  assert.match(checkout, /setQuote\(null\)/);
  assert.match(checkout, /setPaymentReady\(false\)/);
  assert.match(checkout, /orderIdempotencyRef\.current = null/);
});

test("authoritative quote and payment gates remain unchanged", () => {
  for (const term of [
    "getCart(sessionToken)", "listCustomerAddresses(sessionToken)",
    "getDeliveryOptions(", "createDeliveryCheckoutQuote(sessionToken",
    "getPaymentOptions(token, quote.sessionId)", "createPaymentAttempts(token,",
    "await placeOrder(sessionToken", "checkoutSessionId: quote.sessionId",
    "disabled={!paymentReady || placingOrder}", "router.replace(\"/(tabs)/orders\")"
  ]) assert.ok((checkout + payment).includes(term), "Missing critical checkout gate: " + term);
});

test("checkout breakdown uses server totals with one emphasized final total", () => {
  assert.match(checkout, /quote\.totals\.finalBeforePaymentTotal/);
  assert.match(checkout, /quote\.totals\.itemsSubtotal/);
  assert.match(checkout, /quote\.totals\.couponDiscount/);
  assert.match(checkout, /quote\.totals\.deliveryTotal/);
  assert.match(checkout, /quote\.totals\.freeDeliveryDiscount/);
  assert.match(checkout, /cart\.totals\.preDeliveryTotal/);
  const finalRow = [...checkout.matchAll(/label=\{t\("delivery\.customer\.finalBeforePayment"\)\}/g)];
  assert.equal(finalRow.length, 0, "Final total should be shown prominently once, not duplicated as a row");
});

test("checkout UI hints are localized in English, Dari, Pashto", () => {
  const keys = [
    "checkout.addressHint", "checkout.itemsHint", "checkout.calculateHint",
    "checkout.deliveryHint", "checkout.reviewHint", "checkout.breakdown"
  ];
  for (const language of ["en", "fa-AF", "ps-AF"]) {
    const src = read("packages/localization/src/locales/" + language + ".ts");
    for (const key of keys) {
      assert.ok(src.includes(JSON.stringify(key) + ":"), key + " missing in " + language);
    }
  }
});
