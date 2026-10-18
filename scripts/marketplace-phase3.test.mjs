import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = file => readFileSync(file, "utf8");
const source = read("apps/mobile/src/marketplace/filter-utils.ts");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const helpers = {};
runInNewContext(compiled, { exports: helpers });

test("applied filters track only committed values and allow exact removal", () => {
  const query = {
    q: "shoes", sort: "popularity", categoryId: "cat-1",
    province: "Kabul", minPrice: 0, maxPrice: 900, inStock: true,
    discount: false, verifiedStore: true, offset: 60, limit: 20
  };
  assert.deepEqual(Array.from(helpers.appliedFilterKeys(query)),
    ["categoryId", "province", "minPrice", "maxPrice", "inStock", "verifiedStore"]);
  const next = helpers.removeAppliedFilter(query, "minPrice");
  assert.equal(next.q, "shoes");
  assert.equal(next.sort, "popularity");
  assert.equal(next.province, "Kabul");
  assert.equal(next.minPrice, undefined);
  assert.equal(next.offset, 0);
  assert.equal(next.limit, 20);
  assert.equal(query.minPrice, 0, "original committed filter remains untouched");
  assert.deepEqual(Array.from(helpers.appliedFilterKeys(null)), []);
});

test("price validation matches server bounds and rejects malformed or reversed ranges", () => {
  assert.equal(helpers.validatePriceRange("", ""), null);
  assert.equal(helpers.validatePriceRange("0", "0"), null);
  assert.equal(helpers.validatePriceRange("12.50", "45"), null);
  assert.equal(helpers.validatePriceRange("100", "50"), "range");
  assert.equal(helpers.validatePriceRange("-1", ""), "invalid");
  assert.equal(helpers.validatePriceRange("3e7", ""), "invalid");
  assert.equal(helpers.validatePriceRange("abc", ""), "invalid");
  assert.equal(helpers.validatePriceRange("10.555", ""), "invalid");
  assert.equal(helpers.validatePriceRange("", "1000000000"), "invalid");
  assert.equal(helpers.validatePriceRange("Infinity", ""), "invalid");
});

test("filter sheet is a draft-only accessible modal with real categories and provinces", () => {
  const panel = read("apps/mobile/src/components/marketplace/MarketplaceFilterSheet.tsx");
  assert.match(panel, /<Modal/);
  assert.match(panel, /onRequestClose=\{onCancel\}/);
  assert.match(panel, /<ScrollView/);
  assert.match(panel, /AFGHAN_PROVINCES\.map/);
  assert.match(panel, /visibleCategories\.map/);
  assert.match(panel, /accessibilityRole=\{accessibilityRole\}/);
  assert.match(panel, /onApply=|onPress=\{onApply\}/);
  assert.doesNotMatch(panel, /mockProducts|fakeBrands|futureFilterHint/);
});

test("Marketplace filtering remains applied-only until submission and does not wipe the search on removal", () => {
  const page = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  const chips = read("apps/mobile/src/components/marketplace/MarketplaceActiveFilters.tsx");
  const sort = read("apps/mobile/src/components/marketplace/MarketplaceSortBar.tsx");
  assert.match(page, /<MarketplaceFilterSheet/);
  assert.match(page, /restoreDraftFromApplied\(browseInput\)/);
  assert.match(page, /setFiltersOpen\(false\)/);
  assert.match(page, /validatePriceRange\(minPrice, maxPrice\)/);
  assert.match(page, /const clearAppliedFilters =/);
  assert.match(page, /browseInput\.q \? \{ q: browseInput\.q \}/);
  assert.match(page, /removeAppliedFilter\(browseInput, key\)/);
  assert.match(page, /<MarketplaceActiveFilters input=\{browseInput\}/);
  assert.match(page, /<MarketplaceSortBar value=\{browseInput\.sort/);
  assert.match(page, /void executeBrowse\(\{ \.\.\.browseInput, sort: nextSort/);
  assert.match(chips, /accessibilityLabel=\{t\("marketplace\.phase3\.removeFilter"\)/);
  assert.match(chips, /<HorizontalLocaleScroll/);
  assert.match(sort, /accessibilityRole="radio"/);
  assert.match(sort, /minHeight: 48/);
  assert.match(sort, /flexDirection: isRTL \? "row-reverse" : "row"/);
});

test("Phase 3 filter labels exist in English, Dari, and Pashto", () => {
  const keys = [
    "filterTitle", "filterHint", "cancel", "allCategories", "allProvinces",
    "priceRange", "priceHint", "priceError", "priceRangeError", "availability",
    "anyRating", "appliedFilters", "removeFilter", "category", "brand",
    "store", "priceFrom", "priceTo"
  ];
  for (const lang of ["en", "fa-AF", "ps-AF"]) {
    const src = read("packages/localization/src/locales/" + lang + ".ts");
    for (const key of keys) {
      assert.ok(src.includes('"marketplace.phase3.' + key + '"'), lang + " missing " + key);
    }
  }
});
