import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const page = readFileSync("apps/mobile/src/app/marketplace/product/[productId].tsx", "utf8");
const gallery = readFileSync("apps/mobile/src/components/marketplace/ProductImageGallery.tsx", "utf8");

test("detail keeps favorite, compare, share, variants, add cart and checkout actions", () => {
  for (const anchor of [
    "toggleWishlist()", "toggleCompare()", "Share.share(",
    "selectedVariantId === variant.id", "variant.available && variant.inStock",
    "addCartItem(sessionToken", "router.push(\"/checkout\")",
    'pathname: "/(tabs)/shopping"',
    'router.push("/marketplace/compare")',
    "productReviews(productId)",
    'pathname: "/reviews/[reviewId]/report"'
  ]) assert.ok(page.includes(anchor), "Missing purchase or trust action: " + anchor);
});

test("gallery uses responsive full-width image, thumbnails, zoom modal and RTL directions", () => {
  assert.match(page, /<ProductImageGallery/);
  assert.match(gallery, /aspectRatio: 1/);
  assert.match(gallery, /width: "100%"/);
  assert.match(gallery, /resizeMode="contain"/);
  assert.match(gallery, /images\.map\(image =>/);
  assert.match(gallery, /accessibilityState=\{\{ selected:/);
  assert.match(gallery, /setExpanded\(true\)/);
  assert.match(gallery, /onRequestClose=\{\(\) => setExpanded\(false\)\}/);
  assert.match(gallery, /isRTL \? "row-reverse" : "row"/);
  assert.match(gallery, /marketplace\.imageUnavailable/);
});

test("price badge only appears for actual reductions, reviews precede recommendations", () => {
  assert.match(page, /product\.compareAtPrice > price/);
  assert.match(page, /savingPercent !== null && savingPercent > 0/);
  assert.ok(page.indexOf('t("marketplace.product.purchase")') <
    page.indexOf('t("marketplace.product.seller")'));
  assert.ok(page.indexOf('t("review.summary")') <
    page.indexOf('t("marketplace.product.related")'));
});

test("focus and login guards persist and product switching clears stale data", () => {
  assert.match(page, /setData\(null\)/);
  assert.match(page, /setSelectedVariantId\(null\)/);
  assert.match(page, /setReviews\(null\)/);
  assert.match(page, /authStatus !== "signedIn" \|\| !sessionToken/);
  assert.match(page, /purchaseBusy !== null/);
  assert.match(page, /!available \|\| variantRequired/);
  assert.match(page, /wishlistBusy/);
  assert.match(page, /compareBusy/);
});

test("new gallery, variant and cart messages exist in each locale", () => {
  const expected = [
    "marketplace.product.enlargePhoto",
    "marketplace.product.closePhoto",
    "marketplace.product.previousPhoto",
    "marketplace.product.nextPhoto",
    "marketplace.product.optionsHint",
    "marketplace.product.viewCart"
  ];
  for (const locale of ["en", "fa-AF", "ps-AF"]) {
    const file = readFileSync("packages/localization/src/locales/" + locale + ".ts", "utf8");
    for (const key of expected) {
      assert.ok(file.includes('"' + key + '":'), key + " missing in " + locale);
    }
  }
});
