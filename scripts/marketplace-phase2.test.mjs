import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = file => readFileSync(file, "utf8");

test("Marketplace Phase 2 connects real search history, grouped suggestions, and honest search results", () => {
  const page = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  const box = read("apps/mobile/src/components/marketplace/MarketplaceSearchBox.tsx");
  const suggestions = read("apps/mobile/src/components/marketplace/MarketplaceSuggestions.tsx");
  const history = read("apps/mobile/src/components/marketplace/MarketplaceRecentSearches.tsx");
  assert.match(page, /<MarketplaceRecentSearches/);
  assert.match(page, /getRecentSearches\(\)/);
  assert.match(page, /rememberSearch\(term\)/);
  assert.match(page, /removeRecentSearch\(term\)/);
  assert.match(page, /clearRecentSearches\(\)/);
  assert.match(page, /runRecentSearch/);
  assert.match(page, /browseInput\?\.q/);
  assert.match(page, /marketplace\.phase2\.noResultsHelp/);
  assert.match(box, /onFocusChange\?\.\(true\)/);
  assert.match(box, /onFocusChange\?\.\(false\)/);
  assert.match(history, /accessibilityRole="button"/);
  assert.match(history, /minHeight: 48/);
  assert.match(suggestions, /items\.slice\(0, 8\)/);
  assert.match(suggestions, /visible\.filter\(item => item\.type === group\.type\)/);
  for (const type of ["product","category","store","brand"]) {
    assert.ok(suggestions.includes('type: "' + type + '"'), type);
  }
  assert.match(suggestions, /marketplace\.phase2\.noSuggestions/);
});

test("Language support and RTL interaction parity includes search history and typed groups", () => {
  const keys = [
    "recentSearches","clearHistory","searchAgain","removeSearch","historyDeviceOnly",
    "historyError","suggestionProducts","suggestionCategories","suggestionStores",
    "suggestionBrands","noSuggestions","searchResultsFor","activeFilters","noResultsHelp"
  ];
  for (const lang of ["en","fa-AF","ps-AF"]) {
    const source = read("packages/localization/src/locales/" + lang + ".ts");
    for (const key of keys) {
      assert.ok(source.includes('"marketplace.phase2.' + key + '"'), lang + ": " + key);
    }
  }
  const history = read("apps/mobile/src/components/marketplace/MarketplaceRecentSearches.tsx");
  const suggestions = read("apps/mobile/src/components/marketplace/MarketplaceSuggestions.tsx");
  assert.match(history, /flexDirection: isRTL \? "row-reverse" : "row"/);
  assert.match(suggestions, /flexDirection: isRTL \? "row-reverse" : "row"/);
});

test("device-local search history validates entries, deduplicates, caps and correctly clears queued writes", async () => {
  const fake = new Map();
  const storage = {
    getItem: async key => fake.get(key) ?? null,
    setItem: async (key, value) => { fake.set(key, value); },
    removeItem: async key => { fake.delete(key); }
  };
  const source = ts.transpileModule(read("apps/mobile/src/marketplace/search-history.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  runInNewContext(source, {
    exports,
    require(name) {
      assert.equal(name, "@react-native-async-storage/async-storage");
      return { __esModule: true, default: storage };
    }
  });
  assert.equal(exports.normalizeSearchTerm("  green   tea  "), "green tea");
  assert.deepEqual(Array.from(exports.parseSearchHistory(["Hello","hello","  ","a","Other",9])), ["Hello","Other"]);
  await exports.rememberSearch("Laptop");
  await exports.rememberSearch("Phone");
  await exports.rememberSearch(" laptop ");
  assert.deepEqual(Array.from(await exports.getRecentSearches()), ["laptop","Phone"]);
  await exports.removeRecentSearch("PHONE");
  assert.deepEqual(Array.from(await exports.getRecentSearches()), ["laptop"]);
  for (let i = 0; i < 14; i++) await exports.rememberSearch("Search " + i);
  assert.equal((await exports.getRecentSearches()).length, 10);
  await Promise.all([exports.rememberSearch("New item"), exports.clearRecentSearches()]);
  assert.deepEqual(Array.from(await exports.getRecentSearches()), []);
});

test("storage failures are surfaced; a failed write does not prevent later history updates", async () => {
  const store = new Map();
  let fail = true;
  const storage = {
    getItem: async key => store.get(key) ?? null,
    setItem: async (key, value) => {
      if (fail) throw new Error("storage failed");
      store.set(key, value);
    },
    removeItem: async key => { store.delete(key); }
  };
  const source = ts.transpileModule(read("apps/mobile/src/marketplace/search-history.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  runInNewContext(source, {
    exports,
    require: () => ({ __esModule: true, default: storage })
  });
  await assert.rejects(exports.rememberSearch("Phone"), /storage failed/);
  fail = false;
  await exports.rememberSearch("Phone");
  assert.deepEqual(Array.from(await exports.getRecentSearches()), ["Phone"]);
});

test("Marketplace search still rejects stale suggestion replies and retains real product pagination", () => {
  const hook = read("apps/mobile/src/marketplace/useMarketplaceSuggestions.ts");
  const page = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  assert.match(hook, /const queryMatches = resolvedQuery === normalized/);
  assert.match(hook, /suggestions: queryMatches \? suggestions : \[\]/);
  assert.match(page, /browse\.pageInfo\.hasMore && browseInput/);
  assert.match(page, /void executeBrowse\(next, true\)/);
  assert.match(page, /setSelectedView\("products"\)/);
});
