import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(path, "utf8");
const card = read("apps/mobile/src/components/marketplace/MarketplaceProductCard.tsx");
const store = read("apps/mobile/src/components/marketplace/MarketplaceStoreCard.tsx");
const grid = read("apps/mobile/src/components/marketplace/MarketplaceProductGrid.tsx");
const home = read("apps/mobile/src/app/(tabs)/index.tsx");
const marketplace = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
const storePage = read("apps/mobile/src/app/marketplace/store/[handle].tsx");

function loadPresentation() {
  const source = read("apps/mobile/src/marketplace/card-presentation.ts");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS
    }
  });
  const exports = {};
  runInNewContext(outputText, { exports });
  return exports;
}

test("discount percentages use validated real pricing; no invented sale labels", () => {
  const { discountPercentage } = loadPresentation();
  const pct = (price, compareAtPrice, hasDiscount = true) =>
    discountPercentage({ price, compareAtPrice, hasDiscount });
  assert.equal(pct(80, 100), 20);
  assert.equal(pct(79, 100), 21);
  assert.equal(pct(100, 100), null);
  assert.equal(pct(110, 100), null);
  assert.equal(pct(80, 100, false), null);
  assert.equal(pct(90, null), null);
  assert.equal(pct(-1, 100), null);
  assert.equal(pct(Number.NaN, 100), null);
  assert.equal(pct(0, 100), 99);
  assert.equal(pct(99.9, 100), null);
});

test("product cards use image fallbacks, real sale prices, stock and review data", () => {
  assert.match(card, /onError=\{\(\) => setFailedImageUrl\(imageUrl\)\}/);
  assert.match(card, /<Ionicons name="image-outline"/);
  assert.match(card, /discountPercentage\(product\)/);
  assert.match(card, /formatAfn\(product.price\)/);
  assert.match(card, /formatAfn\(compareAt\)/);
  assert.match(card, /!product.inStock/);
  assert.match(card, /ratingSummary\(product\)/);
  const presentation = read("apps/mobile/src/marketplace/card-presentation.ts");
  assert.match(presentation, /reviewCount <= 0/);
  assert.match(presentation, /averageRating === null/);
  assert.match(card, /product.store.trust.phoneVerified/);
  assert.match(card, /pathname: "\/marketplace\/product\/\[productId\]"/);
  assert.doesNotMatch(card, /addCartItem\(/);
});

test("feature store cards use actual cover, logo, province, count and phone verification", () => {
  assert.match(store, /store.coverImageUrl && !coverFailed/);
  assert.match(store, /store.logoUrl && !logoFailed/);
  assert.match(store, /onError=\{\(\) => setCoverFailed\(true\)\}/);
  assert.match(store, /onError=\{\(\) => setLogoFailed\(true\)\}/);
  assert.match(store, /formatNumber\(activeProductCount\)/);
  assert.match(store, /store.trust.phoneVerified/);
  assert.match(store, /pathname: "\/marketplace\/store\/\[handle\]"/);
  assert.doesNotMatch(store, /planVerified|subscriptionVerified|paidSeller/);
});

test("home and Marketplace reuse cards, with two-column catalog grids", () => {
  assert.match(home, /<MarketplaceStoreCard key=\{featured.store.id\} featured=\{featured\}/);
  assert.match(marketplace, /<MarketplaceStoreCard\s+key=\{featured.store.id\}\s+featured=\{featured\}/);
  assert.match(grid, /flexDirection: isRTL \? "row-reverse" : "row"/);
  assert.match(grid, /flexWrap: "wrap"/);
  assert.match(grid, /<MarketplaceProductCard\s+key=\{product.id\} product=\{product\} grid/);
  assert.match(marketplace, /<MarketplaceProductGrid products=\{browse.products\}/);
  assert.match(storePage, /<MarketplaceProductGrid products=\{data.products\}/);
  assert.match(card, /width: compact \? 182 : grid \? "48%" : "100%"/);
  assert.match(storePage, /variant="heading">\{t\("marketplace.store.products"\)\}/);
});
