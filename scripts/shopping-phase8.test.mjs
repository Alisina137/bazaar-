import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { canOpenReturnReview, relatedReturnCases, openReturnCase } from "../apps/mobile/src/order/return-policy.ts";

const detail = readFileSync("apps/mobile/src/app/orders/[orderId].tsx", "utf8");
const orders = readFileSync("apps/mobile/src/app/(tabs)/orders.tsx", "utf8");
const cartService = readFileSync("apps/api/src/cart-pricing/service.ts", "utf8");
const locales = ["en", "fa-AF", "ps-AF"].map(locale =>
  readFileSync("packages/localization/src/locales/" + locale + ".ts", "utf8")
);

test("Phase 6 cancellation remains server-gated and requires confirmation", () => {
  assert.match(detail, /order\?\.state !== "pending_confirmation"/);
  assert.match(detail, /cancelCustomerOrder\(sessionToken/);
  assert.match(detail, /order\.shopping\.cancelConfirmTitle/);
  assert.match(detail, /actionInFlight\.current/);
});

test("Phase 6 reorder uses stock/price validated cart API and warns on partial success", () => {
  assert.match(detail, /await addCartItem\(sessionToken/);
  assert.match(detail, /order\.shopping\.reorderPartial/);
  assert.match(detail, /current\.unitPrice - item\.unitPrice/);
  assert.match(cartService, /productVisibilityIssue\(product\)/);
  assert.match(cartService, /targetQuantity > selection\.freeQuantity/);
});

test("Phase 7 only permits after-fulfillment return review cases", () => {
  for (const state of ["delivered", "picked_up", "delivery_failed"])
    assert.equal(canOpenReturnReview(state), true);
  for (const state of ["pending_confirmation", "confirmed", "preparing", "refunded", "refund_pending", "cancelled"])
    assert.equal(canOpenReturnReview(state), false);
  const ticket = (id, orderId, status, subject, updatedAt) => ({id, orderId, status, subject, updatedAt});
  const tickets = [
    ticket("a", "a-order", "closed", "Return/refund review: O1", "2026-01-01"),
    ticket("b", "a-order", "waiting_support", "Return/refund review: O1", "2026-02-01"),
    ticket("c", "another", "open", "Return/refund review: O2", "2026-03-01"),
    ticket("d", "a-order", "open", "Unrelated order help", "2026-04-01")
  ];
  assert.deepEqual(relatedReturnCases(tickets, "a-order").map(x => x.id), ["b", "a"]);
  assert.equal(openReturnCase(tickets, "a-order")?.id, "b");
  assert.equal(openReturnCase([tickets[0]], "a-order"), undefined);
});

test("Phase 7 requests are tickets and do not promise automatic refunds", () => {
  assert.match(detail, /await createSupportTicket\(sessionToken/);
  assert.match(detail, /RETURN_REVIEW_PREFIX \+ order\.orderNumber/);
  assert.match(detail, /openReturnCase\(returnCases, order\.id\)/);
  assert.doesNotMatch(detail, /merchantOrderAction\(/);
});

test("Phase 8 focus loading invalidates stale requests and hides prior sessions", () => {
  assert.match(detail, /useFocusEffect\(useCallback/);
  assert.match(detail, /requestId !== loadEpoch\.current/);
  assert.match(detail, /loadedOrderIdentity\.current !== identity/);
  assert.match(orders, /loadedToken === sessionToken/);
  assert.match(orders, /requestId !== epoch\.current/);
  assert.match(orders, /epoch\.current \+= 1/);
  assert.match(orders, /order\.shopping\.clearFilters/);
});

test("all shopping action messages are provided in English, Dari and Pashto", () => {
  const keys = [...detail.matchAll(/t\("(order\.shopping\.[^"]+)"\)/g),
    ...orders.matchAll(/t\("(order\.shopping\.[^"]+)"\)/g)].map(match => match[1]);
  assert.ok(keys.length > 10);
  for (const key of new Set(keys)) {
    for (const locale of locales) assert.ok(locale.includes(JSON.stringify(key) + ":"), key);
  }
});
