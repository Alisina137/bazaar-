import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const detail = readFileSync("apps/mobile/src/app/marketplace/product/[productId].tsx", "utf8");
const compare = readFileSync("apps/mobile/src/app/marketplace/compare.tsx", "utf8");
const store = readFileSync("apps/mobile/src/marketplace/compare.ts", "utf8");

test("comparison detail refreshes on navigation focus, not only on ID changes", () => {
  assert.match(detail, /useFocusEffect\(useCallback\(/);
  assert.match(detail, /getCompareProductIds\(\)/);
  assert.match(detail, /setCompareBusy\(true\)/);
  assert.match(detail, /if \(!productId \|\| compareBusy\) return/);
  assert.match(detail, /disabled=\{compareBusy\}/);
});

test("comparison screen distinguishes offline failures from an empty list", () => {
  assert.match(compare, /selectedCount/);
  assert.match(compare, /!loading && !error && selectedCount === 0/);
  assert.match(compare, /marketplace\.compare\.loadError/);
  assert.match(compare, /setSelectedCount\(0\)/);
  assert.match(compare, /busyId \|\| clearing/);
  assert.match(compare, /clearing \|\| busyId/);
});

test("comparison storage remains serialized and limited to four", () => {
  assert.match(store, /MAX_COMPARE_PRODUCTS = 4/);
  assert.match(store, /writeQueue/);
  assert.match(store, /current\.length >= MAX_COMPARE_PRODUCTS/);
});
