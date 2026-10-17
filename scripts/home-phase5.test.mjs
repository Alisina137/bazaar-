import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(path, "utf8");
function loadTs(path, storage = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, require: (name) => {
      if (name === "@react-native-async-storage/async-storage") {
        return { __esModule: true, default: storage };
      }
      throw Error("Unexpected dependency: " + name);
    }
  });
  return exports;
}

test("preferred categories validate malformed storage data, dedupe and enforce limit", async () => {
  const { normalizeFavoriteCategories } = loadTs("apps/mobile/src/marketplace/preferences.ts");
  assert.deepEqual(Array.from(normalizeFavoriteCategories(null)), []);
  assert.deepEqual(Array.from(normalizeFavoriteCategories([
    "electronics", "electronics", null, 3, " fashion ", "", "books", "toys",
    "home", "sports", "more"
  ])), ["electronics", "books", "toys", "home", "sports"]);
});

test("category selection is local, persisted, resettable and resilient to storage failures", async () => {
  const state = new Map();
  const storage = {
    getItem: async (key) => state.get(key) ?? null,
    setItem: async (key, val) => { state.set(key, val); },
    removeItem: async (key) => { state.delete(key); }
  };
  const prefs = loadTs("apps/mobile/src/marketplace/preferences.ts", storage);
  await prefs.setFavoriteCategories(["a", "b", "a"]);
  assert.deepEqual(Array.from(await prefs.getFavoriteCategories()), ["a", "b"]);
  await prefs.setFavoriteCategories([]);
  assert.deepEqual(Array.from(await prefs.getFavoriteCategories()), []);
  const failing = loadTs("apps/mobile/src/marketplace/preferences.ts", {
    getItem: async () => { throw Error("offline"); },
    setItem: async () => { throw Error("storage"); },
    removeItem: async () => { throw Error("storage"); }
  });
  assert.deepEqual(Array.from(await failing.getFavoriteCategories()), []);
  await failing.setFavoriteCategories(["a"]);
  await failing.setFavoriteCategories([]);
});

const category = (id, parentId = null) => ({ id, parentId });
const p = (id, cat, province = "Kabul", inStock = true) => ({
  id, inStock,
  marketplaceCategory: cat ? { id: cat } : null,
  store: { province }
});
const makeHome = (recentlyViewed = []) => ({
  categories: [category("electronics"), category("phones", "electronics"),
    category("books")],
  recentlyViewed,
  recommended: [p("general", "books"), p("new-phone", "phones")],
  popular: [p("sold-out", "phones", "Kabul", false)],
  newest: [p("herat-phone", "phones", "Herat")],
  deals: [], nearby: []
});

test("personalized products are real, category aware, in stock and not in viewed list", () => {
  const { personalizeProducts } = loadTs("apps/mobile/src/marketplace/personalize.ts");
  const home = makeHome([p("viewed-phone", "phones")]);
  const result = personalizeProducts({
    home, favorites: ["electronics"], extra: [p("new-phone", "phones"), p("bonus", "phones")],
    recentIds: ["viewed-phone"], province: "Kabul"
  });
  assert.deepEqual(Array.from(result, (x) => x.id), ["new-phone", "bonus"]);
  const historyOnly = personalizeProducts({
    home, favorites: [], extra: [], recentIds: ["viewed-phone"], province: null
  });
  assert.deepEqual(Array.from(historyOnly, (x) => x.id), ["new-phone", "herat-phone"]);
  const noSignal = personalizeProducts({
    home: makeHome(), favorites: [], extra: [], recentIds: [], province: null
  });
  assert.equal(noSignal.length, 0);
});

test("recently viewed rail follows local visit order and never returns obsolete items", () => {
  const { orderRecentProducts } = loadTs("apps/mobile/src/marketplace/personalize.ts");
  const result = orderRecentProducts([p("2","books"), p("1","books")], ["1","gone","2"]);
  assert.deepEqual(Array.from(result, (x) => x.id), ["1","2"]);
  assert.equal(orderRecentProducts([p("1","books")], []).length, 0);
});

test("Home wires on-focus recents, opt-in preferences, bounded category search and reset", () => {
  const home = read("apps/mobile/src/app/(tabs)/index.tsx");
  const picker = read("apps/mobile/src/components/marketplace/HomeInterestPicker.tsx");
  const cache = read("apps/mobile/src/marketplace/cache.ts");
  for (const expected of [
    "getFavoriteCategories()", "setFavoriteCategories(selected)",
    "getRecentProductIds()", "clearRecentProductIds()",
    "personalizeProducts({", "favorites.map(async (categoryId)",
    "browseMarketplace(input)", "readBrowseCache(key, true)",
    "<HomeInterestPicker", 'title={t("home.forYou")}',
    "orderRecentProducts(fresh.recentlyViewed, recentProductIds)"
  ]) assert.ok(home.includes(expected), expected);
  assert.match(cache, /AsyncStorage.removeItem\(RECENT_KEY\)/);
  assert.match(picker, /accessibilityRole="checkbox"/);
  assert.match(picker, /MAX_FAVORITE_CATEGORIES/);
  assert.match(picker, /Alert.alert\(/);
  assert.match(picker, /onSave\(draft\)/);
});

test("interests and history controls translated in every language", () => {
  for (const lang of ["en","fa-AF","ps-AF"]) {
    const s = read("packages/localization/src/locales/"+lang+".ts");
    for (const key of ["preferences","preferencesLocal","interestedCategories",
      "interestLimit","saveInterests","resetInterests","clearHistory",
      "clearHistoryConfirm","cancel","forYou","findingForYou"]) {
      assert.ok(s.includes('"home.'+key+'"'), lang+": "+key);
    }
  }
});
