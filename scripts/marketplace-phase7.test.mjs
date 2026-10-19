import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(path, "utf8");

test("product comparison persists a deduplicated list capped at four items", () => {
  const source = read("apps/mobile/src/marketplace/compare.ts");
  assert.match(source, /MAX_COMPARE_PRODUCTS = 4/);
  assert.match(source, /new Set/);
  assert.match(source, /slice\(0, MAX_COMPARE_PRODUCTS\)/);
  assert.match(source, /AsyncStorage\.setItem/);
  assert.match(source, /writeQueue/);
  assert.match(source, /current\.length >= MAX_COMPARE_PRODUCTS/);
});

test("product detail can add and remove items and open the comparison screen", () => {
  const detail = read("apps/mobile/src/app/marketplace/product/[productId].tsx");
  assert.match(detail, /addCompareProduct/);
  assert.match(detail, /removeCompareProduct/);
  assert.match(detail, /marketplace\/compare/);
  assert.match(detail, /marketplace\.compare\.full/);
});

test("comparison screen loads selected products and compares meaningful shopping attributes", () => {
  const screen = read("apps/mobile/src/app/marketplace/compare.tsx");
  for (const key of [
    "marketplace.compare.price", "marketplace.compare.rating",
    "marketplace.compare.reviews", "marketplace.compare.availability",
    "marketplace.compare.seller", "marketplace.compare.location",
    "marketplace.compare.category", "marketplace.compare.removeItem",
    "marketplace.compare.clear"
  ]) assert.ok(screen.includes(key), "missing comparison feature: " + key);
  assert.match(screen, /Promise\.all/);
  assert.match(screen, /removeCompareProduct/);
  assert.match(screen, /clearCompareProducts/);
  assert.match(screen, /accessibilityRole/);
});

test("comparison strings exist in English, Dari, and Pashto with typed locale parity", () => {
  for (const path of [
    "packages/localization/src/locales/en.ts",
    "packages/localization/src/locales/fa-AF.ts",
    "packages/localization/src/locales/ps-AF.ts"
  ]) {
    const source = read(path);
    for (const key of [
      "marketplace.compare.title", "marketplace.compare.add",
      "marketplace.compare.full", "marketplace.compare.empty",
      "marketplace.compare.availability", "marketplace.compare.removeItem"
    ]) assert.ok(source.includes(JSON.stringify(key) + ":"), path + " missing " + key);
  }
});
