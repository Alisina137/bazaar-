import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(path, "utf8");

function loadRecentStorage(storage) {
  const source = read("apps/mobile/src/marketplace/cache.ts");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS
    }
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require: (name) => {
      if (name === "@react-native-async-storage/async-storage") {
        return { __esModule: true, default: storage };
      }
      throw Error("Unexpected module: " + name);
    }
  });
  return exports;
}

test("simultaneous product visits are serialized; both IDs survive in correct order", async () => {
  const state = new Map();
  const storage = {
    getItem: async (key) => state.get(key) ?? null,
    setItem: async (key, value) => { state.set(key, value); },
    removeItem: async (key) => { state.delete(key); }
  };
  const cache = loadRecentStorage(storage);
  await Promise.all([
    cache.rememberProduct("first"),
    cache.rememberProduct("second")
  ]);
  assert.deepEqual(Array.from(await cache.getRecentProductIds()), ["second", "first"]);
  await cache.rememberProduct("first");
  assert.deepEqual(Array.from(await cache.getRecentProductIds()), ["first", "second"]);
});

test("clear history wins over an earlier slow visit write", async () => {
  const state = new Map();
  let unblockWrite;
  let reachedWrite;
  const waitingForWrite = new Promise((resolve) => { reachedWrite = resolve; });
  const blockedWrite = new Promise((resolve) => { unblockWrite = resolve; });
  const storage = {
    getItem: async (key) => state.get(key) ?? null,
    setItem: async (key, value) => {
      if (key.includes("recent-products") && value.includes("slow-product")) {
        reachedWrite();
        await blockedWrite;
      }
      state.set(key, value);
    },
    removeItem: async (key) => { state.delete(key); }
  };
  const cache = loadRecentStorage(storage);
  const oldWrite = cache.rememberProduct("slow-product");
  await waitingForWrite;
  const clear = cache.clearRecentProductIds();
  unblockWrite();
  await Promise.all([oldWrite, clear]);
  assert.deepEqual(Array.from(await cache.getRecentProductIds()), []);
});

test("offline Home caches remain isolated for every selected province", async () => {
  const state = new Map();
  const storage = {
    getItem: async (key) => state.get(key) ?? null,
    setItem: async (key, value) => { state.set(key, value); },
    removeItem: async (key) => { state.delete(key); }
  };
  const cache = loadRecentStorage(storage);
  assert.equal(cache.homeCacheKey("Kabul"), "home:kabul");
  assert.equal(cache.homeCacheKey("Herat"), "home:herat");
  assert.equal(cache.homeCacheKey(), "home:all");
  await cache.writeHomeCache(cache.homeCacheKey("Kabul"), { id: "kabul-stock" });
  const readKabul = await cache.readHomeCache(cache.homeCacheKey("Kabul"), true);
  assert.equal(readKabul.id, "kabul-stock");
  assert.equal(await cache.readHomeCache(cache.homeCacheKey("Herat"), true), null);
});

test("Home invalidates recently viewed items in concurrent loads after a clear", () => {
  const home = read("apps/mobile/src/app/(tabs)/index.tsx");
  const cache = read("apps/mobile/src/marketplace/cache.ts");
  assert.match(cache, /queueRecentWrite/);
  assert.match(cache, /return queueRecentWrite\(async \(\) => \{/);
  assert.match(home, /recentRevision\.current \+= 1/);
  assert.match(home, /revisionAtStart === recentRevision\.current \? recentProductIds : \[\]/);
  assert.match(home, /await clearRecentProductIds\(\)|void clearRecentProductIds\(\)\.then/);
  assert.match(home, /onAction=\{requestRefresh\}/);
});

test("live search results never display cards from a previous query or stale cached reply", () => {
  const market = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  const hook = read("apps/mobile/src/marketplace/useMarketplaceSuggestions.ts");
  assert.match(market, /setBrowse\(null\);\s*setBrowseInput\(null\);\s*setBrowseLoading\(true\)/);
  assert.match(market, /const cached = await readBrowseCache\(key, true\);\s*if \(requestId !== browseRequestId\.current\) return/);
  assert.match(market, /selectedView === "products" && browse \?/);
  assert.match(market, /selectedView === "categories" && home \?/);
  assert.match(market, /selectedView === "stores" && home \?/);
  assert.match(hook, /const queryMatches = resolvedQuery === normalized/);
  assert.match(hook, /suggestions: queryMatches \? suggestions : \[\]/);
});

test("province-scoped Marketplace data is loaded once and only latest response is displayed", () => {
  const market = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  assert.match(market, /const homeRequestId = useRef\(0\)/);
  assert.match(market, /const requestId = \+\+homeRequestId\.current/);
  assert.match(market, /if \(requestId !== homeRequestId\.current\) return/);
  assert.match(market, /if \(scopeChanged\) setHome\(null\)/);
  assert.match(market, /void loadHome\(linkedProvince\)/);
  assert.doesNotMatch(market, /if \(linkedProvince\) void loadHome\(linkedProvince\)/);
  assert.match(market, /linkedProvince \? \{ province: linkedProvince \}/);
});

test("Home and marketplace actions retain existing accessibility, RTL, and proper error states", () => {
  const home = read("apps/mobile/src/app/(tabs)/index.tsx");
  const rail = read("apps/mobile/src/components/marketplace/HomeProductRail.tsx");
  const picker = read("apps/mobile/src/components/marketplace/HomeInterestPicker.tsx");
  const province = read("apps/mobile/src/components/marketplace/HomeProvinceSelector.tsx");
  assert.match(home, /refreshing=\{refreshRequested\}/);
  assert.match(home, /accessibilityState=\{\{ expanded: showMoreSections \}\}/);
  assert.match(rail, /inverted=\{isRTL\}/);
  assert.match(picker, /accessibilityRole="checkbox"/);
  assert.match(province, /accessibilityState=\{\{ selected \}\}/);
  for (const language of ["en", "fa-AF", "ps-AF"]) {
    const locale = read("packages/localization/src/locales/" + language + ".ts");
    for (const key of ["home.showMore", "home.showLess", "home.preferences",
      "marketplace.noResultsTitle", "marketplace.searchAll"]) {
      assert.ok(locale.includes('"' + key + '"'), language + " missing " + key);
    }
  }
});
