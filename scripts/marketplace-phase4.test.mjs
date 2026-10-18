import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = file => readFileSync(file, "utf8");
const compiled = ts.transpileModule(read("apps/mobile/src/marketplace/card-presentation.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const presentation = {};
runInNewContext(compiled, { exports: presentation });

test("discount labels require real valid compare-at price and sale flag", () => {
  const item = (price, compareAtPrice, hasDiscount = true) => ({ price, compareAtPrice, hasDiscount });
  assert.equal(presentation.discountPercentage(item(80, 100)), 20);
  assert.equal(presentation.discountPercentage(item(99.99, 100)), null);
  assert.equal(presentation.discountPercentage(item(80, 100, false)), null);
  assert.equal(presentation.discountPercentage(item(100, 100)), null);
  assert.equal(presentation.discountPercentage(item(110, 100)), null);
  assert.equal(presentation.discountPercentage(item(80, null)), null);
  assert.equal(presentation.discountPercentage(item(NaN, 100)), null);
  assert.equal(presentation.discountPercentage(item(0, 100)), 99);
});

test("review display only comes from real count and bounded rating", () => {
  const rating = (averageRating, reviewCount) =>
    presentation.ratingSummary({ averageRating, reviewCount });
  assert.equal(rating(null, 0), null);
  assert.equal(rating(4.2, 0), null);
  assert.equal(rating(6, 12), null);
  assert.equal(rating(0, 1), null);
  assert.equal(rating(NaN, 8), null);
  assert.equal(rating(4.9, -1), null);
  assert.equal(rating(4.9, 1.5), null);
  assert.deepEqual({ ...rating(4.666, 28) }, { average: 4.7, count: 28 });
  assert.deepEqual({ ...rating(5, 1) }, { average: 5, count: 1 });
});

test("card image is contained, uses reliable fallback and retains the real source", () => {
  const card = read("apps/mobile/src/components/marketplace/MarketplaceProductCard.tsx");
  assert.match(card, /resizeMode="contain"/);
  assert.match(card, /failedImageUrl === imageUrl/);
  assert.match(card, /key=\{imageUrl\}/);
  assert.match(card, /onError=\{\(\) => setFailedImageUrl\(imageUrl\)\}/);
  assert.match(card, /<ActivityIndicator/);
  assert.match(card, /aspectRatio: compact \? 1\.18 : grid \? 1 : 1\.5/);
  assert.match(card, /product\.imageUrl/);
  assert.match(card, /product\.marketplaceCategory/);
  assert.match(card, /locale === "ps-AF"/);
  assert.match(card, /isProvinceName\(product\.store\.province\)/);
  assert.match(card, /product\.store\.trust\.phoneVerified/);
  assert.match(card, /!product\.inStock/);
  assert.match(card, /discountPercentage\(product\)/);
  assert.match(card, /ratingSummary\(product\)/);
  assert.doesNotMatch(card, /Math\.random\(|mockReview|fakeDiscount|sellerVerifiedBadge/);
});

test("save icon is independent from navigation, authenticated and uses a single grid lookup", () => {
  const card = read("apps/mobile/src/components/marketplace/MarketplaceProductCard.tsx");
  const grid = read("apps/mobile/src/components/marketplace/MarketplaceProductGrid.tsx");
  const wishlist = read("apps/mobile/src/account/wishlist-api.ts");
  assert.match(card, /onPress=\{viewProduct\}/);
  assert.match(card, /<\/Pressable>\s*\n\s*\{onSavePress \? \(/); // separate sibling control
  assert.match(card, /onSavePress\s*\?\s*\(/);
  assert.match(card, /onPress=\{onSavePress\}/);
  assert.match(card, /minHeight: 48, minWidth: 48/);
  assert.match(card, /accessibilityRole="button"/);
  assert.match(grid, /getWishlist\(sessionToken\)/);
  assert.match(grid, /useFocusEffect\(useCallback/);
  assert.match(grid, /saveWishlistProduct\(token, productId\)/);
  assert.match(grid, /removeWishlistProduct\(token, productId\)/);
  assert.match(grid, /tokenRef\.current === token/);
  assert.match(grid, /setSavedIds\(previous =>/);
  assert.match(grid, /router\.push\("\/\(tabs\)\/account"\)/);
  assert.match(grid, /setLoadError\(true\)/);
  assert.match(grid, /setUpdateError\(true\)/);
  assert.match(grid, /saved=\{Boolean\(savedIds\?\.has\(product\.id\)\)\}/);
  assert.match(wishlist, /"\/customer\/wishlist\/"/);
  assert.doesNotMatch(grid, /Promise\.all\(products\.map/);
});

test("product-card new labels are available in all languages", () => {
  const keys = ["openDetails", "noReviews", "saveHint", "wishlistLoadError"];
  for (const locale of ["en", "fa-AF", "ps-AF"]) {
    const src = read("packages/localization/src/locales/" + locale + ".ts");
    for (const key of keys) {
      assert.ok(src.includes('"marketplace.phase4.' + key + '"'), locale + ": " + key);
    }
  }
});
