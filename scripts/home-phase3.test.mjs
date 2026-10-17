import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");
const home = read("apps/mobile/src/app/(tabs)/index.tsx");
const market = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
const rails = read("apps/mobile/src/components/marketplace/HomeProductRail.tsx");
const spotlight = read("apps/mobile/src/components/marketplace/HomeDealSpotlight.tsx");
const selector = read("apps/mobile/src/components/marketplace/HomeProvinceSelector.tsx");
const province = read("apps/mobile/src/marketplace/provinces.ts");

test("Home renders actual recommended, popular, newest, discounted and recent products", () => {
  for(const key of ["recommended","popular","newest","deals","recentlyViewed"]){
    assert.ok(home.includes("home?."+key+" ?? []"), "Missing "+key+" section");
  }
  assert.match(home, /<HomeProductRail/);
  assert.match(rails, /<MarketplaceProductCard/);
  assert.match(rails, /products\.slice\(0, 10\)/);
  assert.match(home, /home\?\.deals\.find\(\(item\) => item\.inStock && item\.hasDiscount\)/);
  assert.match(spotlight, /pathname: "\/marketplace\/product\/\[productId\]"/);
});

test("View all uses authoritative server-side sort, discount and province filters", () => {
  for (const phrase of ['openResults({ sort: "popularity" })','openResults({ sort: "newest" })',
    'openResults({ discount: "true" })','openResults({ province })']) {
    assert.ok(home.includes(phrase), phrase);
  }
  assert.match(market, /linkedSort/);
  assert.match(market, /linkedDiscount === "true"/);
  assert.match(market, /linkedProvince \? \{ province: linkedProvince \}/);
  assert.match(market, /setDealsOnly\(linkedDiscount === "true"\)/);
  assert.match(market, /setSort\(validSort\)/);
});

test("Province-only recommendations respect deliberate selection and cache separation", () => {
  assert.match(home, /<HomeProvinceSelector value=\{province\} onChange=\{chooseProvince\}/);
  assert.match(home, /homeCacheKey\(province \?\? undefined\)/);
  assert.match(home, /readHomeCache\(key, true\)/);
  assert.match(home, /setHome\(fallback\)/);
  assert.match(home, /province \? \(\s*<View/);
  assert.match(province, /AsyncStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(province, /AsyncStorage\.removeItem\(STORAGE_KEY\)/);
  assert.match(province, /isProvinceName\(raw\)/);
  assert.match(selector, /<Modal/);
  assert.match(selector, /AFGHAN_PROVINCES\.map/);
  assert.match(selector, /accessibilityState=\{\{ selected \}\}/);
  const provinceEntries = [...province.matchAll(/\["[A-Za-z -]+",/g)];
  assert.equal(provinceEntries.length,34);
});

test("Recently viewed never promises unrelated server-wide view-all results", () => {
  const recent = home.slice(home.indexOf('title={t("marketplace.recentlyViewed")}'));
  assert.ok(recent.includes("products={home?.recentlyViewed ?? []}"));
  assert.ok(!recent.slice(0,160).includes("onViewAll"));
});

test("Merchant listings and Home labels have Dari, Pashto and English translations", () => {
  for (const lang of ["en", "fa-AF", "ps-AF"]) {
    const translation = read("packages/localization/src/locales/" + lang + ".ts");
    for (const key of ["selectProvince","allAfghanistan","featuredDeal","shopDeal",
      "newArrivals","discountedProducts","provinceProducts","noProvinceProducts"]) {
      assert.ok(translation.includes('"home.'+key+'"'), lang+" missing "+key);
    }
  }
});
