import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");
const home = read("apps/mobile/src/app/(tabs)/index.tsx");
const marketplace = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
const category = read("apps/mobile/src/components/marketplace/MarketplaceCategoryTile.tsx");
const box = read("apps/mobile/src/components/marketplace/MarketplaceSearchBox.tsx");
const suggestions = read("apps/mobile/src/components/marketplace/MarketplaceSuggestions.tsx");
const hook = read("apps/mobile/src/marketplace/useMarketplaceSuggestions.ts");
const repository = read("apps/api/src/marketplace/repository.ts");
const contract = read("packages/contracts/src/marketplace.ts");

test("Home has editable search with debounced suggestions and direct results navigation", () => {
  assert.match(home, /<MarketplaceSearchBox value=\{query\} onChangeText=\{setQuery\} onSubmit=\{submitSearch\}/);
  assert.match(home, /<MarketplaceSuggestions/);
  assert.match(home, /params: \{ q \}/);
  assert.match(home, /pathname: "\/marketplace\/product\/\[productId\]"/);
  assert.match(home, /pathname: "\/marketplace\/store\/\[handle\]"/);
  assert.match(hook, /setTimeout\(\(\) => \{/);
  assert.match(hook, /clearTimeout\(timeout\)/);
  assert.match(hook, /if \\(active\\) \\{\\s*setSuggestions/);
  assert.match(hook, /resolvedQuery === normalized/);
});

test("shared search control supports RTL, input clearing, and keyboard submit", () => {
  assert.match(box, /TextInput/);
  assert.match(box, /returnKeyType="search"/);
  assert.match(box, /Keyboard\.dismiss\(\)/);
  assert.match(box, /onChangeText\(""\)/);
  assert.match(box, /writingDirection: direction/);
  assert.match(suggestions, /items\.slice\(0, 8\)/);
  assert.match(suggestions, /onSearchAll/);
  assert.match(suggestions, /item\.type !== "category"/);
});

test("Home and Marketplace both use localized image-or-icon category tiles", () => {
  assert.match(home, /<MarketplaceCategoryTile/);
  assert.match(marketplace, /<MarketplaceCategoryTile grid/);
  assert.match(category, /category\.imageUrl/);
  assert.match(category, /onError=\{\(\) => setBrokenImage\(true\)\}/);
  assert.match(category, /locale === "ps-AF"/);
  assert.match(marketplace, /childCategories\.map/);
});

test("search links open real category, brand, and seller results", () => {
  for (const param of ["linkedCategoryId","linkedQuery","linkedBrand","linkedStoreId"]) {
    assert.ok(marketplace.includes(param), "Missing deep-link filter " + param);
  }
  assert.match(marketplace, /activeFilterCount/);
  assert.match(marketplace, /dismissedQuery !== query\.trim\(\)/);
  assert.match(marketplace, /browse\.pageInfo\.total/);
  assert.match(repository, /handle: stores\.handle/);
  assert.match(repository, /handle: row\.handle/);
  assert.match(contract, /handle\?: string/);
});

test("search and subcategory copy is localized", () => {
  for (const lang of ["en","fa-AF","ps-AF"]) {
    const content = read("packages/localization/src/locales/" + lang + ".ts");
    for (const key of ["clearSearch","searchAll","subcategories"]) {
      assert.ok(content.includes('"marketplace.'+key+'"'), lang+" missing "+key);
    }
  }
});
