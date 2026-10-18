import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(path, "utf8");

test("Marketplace subnavigation contains only Products, Categories, Stores and mirrors RTL", () => {
  const nav = read("apps/mobile/src/components/marketplace/MarketplacePrimaryTabs.tsx");
  const page = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  for (const name of ["products", "categories", "stores"]) {
    assert.ok(nav.includes('value: "' + name + '"'), name);
    assert.match(page, new RegExp('selectedView === "' + name + '"'));
  }
  assert.match(nav, /accessibilityRole="tab"/);
  assert.match(nav, /accessibilityState=\{\{ selected: active \}\}/);
  assert.match(nav, /flexDirection: isRTL \? "row-reverse" : "row"/);
  assert.match(nav, /minHeight: 56/);
  assert.match(page, /<MarketplacePrimaryTabs/);
  assert.match(page, /useState<MarketplaceView>\("products"\)/);
});

test("Opening Marketplace loads the real paginated product catalog by default", () => {
  const page = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  assert.match(page, /void executeBrowse\(\{ sort: "relevance", offset: 0, limit: 20 \}\)/);
  assert.match(page, /<MarketplaceProductGrid products=\{browse\.products\} \/>/);
  assert.match(page, /browse\.pageInfo\.hasMore && browseInput/);
  assert.match(page, /await browseMarketplace\(input\)/);
  assert.doesNotMatch(page, /function ProductSection/);
  assert.doesNotMatch(page, /<ProductSection/);
});

test("Selecting a category or searching opens Products while preserving the current query filters", () => {
  const page = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  assert.match(page, /const submitSearch = \(\) => \{\s*setSelectedView\("products"\)/);
  assert.match(page, /const chooseCategory = \(id: string\) => \{\s*setSelectedView\("products"\)/);
  assert.match(page, /if \(!linkedCategoryId && !linkedQuery/);
  assert.match(page, /setSelectedView\("products"\);\s*setCategoryId\(linkedCategoryId\)/);
  assert.match(page, /onSelect=\{setSelectedView\}/);
  assert.match(page, /onPress=\{\(\) => chooseCategory\(category\.id\)\}/);
  assert.match(page, /setCategoryId\(id\)/);
  assert.match(page, /router\.push\(\{ pathname: "\/marketplace\/product\/\[productId\]"/);
  assert.match(page, /router\.push\(\{ pathname: "\/marketplace\/store\/\[handle\]"/);
  assert.match(page, /selectedView === "products" && browse/);
});

test("Category and featured store tabs only render real API-backed content", () => {
  const page = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  assert.match(page, /home\?\.categories\.filter\(\(category\) => category\.parentId === null\)/);
  assert.match(page, /selectedView === "categories" && home/);
  assert.match(page, /rootCategories\.map\(category =>/);
  assert.match(page, /selectedView === "stores" && home/);
  assert.match(page, /home\.featuredStores\.map\(featured =>/);
  assert.match(page, /<MarketplaceStoreCard/);
  assert.match(page, /marketplace\.nav\.emptyStores/);
  assert.match(page, /marketplace\.nav\.storesHint/);
  assert.doesNotMatch(page, /dummyStores|mockCategories|exampleProduct/);
});

test("All Marketplace navigation labels exist in English, Dari and Pashto", () => {
  const keys = ["title", "products", "categories", "stores", "categoriesHint",
    "storesHint", "emptyCategories", "emptyStores", "browseProducts"];
  for (const locale of ["en", "fa-AF", "ps-AF"]) {
    const source = read("packages/localization/src/locales/" + locale + ".ts");
    for (const key of keys) {
      assert.ok(source.includes('"marketplace.nav.' + key + '"'), locale + " missing " + key);
    }
  }
});
