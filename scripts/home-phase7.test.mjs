import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");
const home = read("apps/mobile/src/app/(tabs)/index.tsx");
const screen = read("apps/mobile/src/components/ui/Screen.tsx");
const rail = read("apps/mobile/src/components/marketplace/HomeProductRail.tsx");
const spotlight = read("apps/mobile/src/components/marketplace/HomeDealSpotlight.tsx");
const hero = read("apps/mobile/src/components/marketplace/HomeHeroBanner.tsx");
const interests = read("apps/mobile/src/components/marketplace/HomeInterestPicker.tsx");

test("customer screen supports optional pull-to-refresh without affecting other screens", () => {
  assert.match(screen, /onRefresh\?: \(\(\) => void\) \| undefined/);
  assert.match(screen, /refreshing\?: boolean/);
  assert.match(screen, /refreshControl=\{onRefresh \? \(/);
  assert.match(screen, /<RefreshControl/);
  assert.match(screen, /refreshing=\{refreshing\}/);
  assert.match(screen, /onRefresh=\{onRefresh\}/);
  assert.match(home, /refreshing=\{refreshRequested\}/);
  assert.match(home, /onRefresh=\{requestRefresh\}/);
  assert.match(home, /setRefreshKey\(\(key\) => key \+ 1\)/);
});

test("on-focus loads matching saved Home data before network and guards obsolete responses", () => {
  const saved = home.indexOf("const saved = await readHomeCache(key, true)");
  const remote = home.indexOf("const fresh = await marketplaceHome({");
  assert.ok(saved > 0 && remote > saved);
  assert.match(home, /homeCacheKey\(province \?\? undefined\)/);
  assert.match(home, /orderRecentProducts\(saved.recentlyViewed, recentProductIds\)/);
  assert.match(home, /setHome\(fallback\)/);
  assert.match(home, /if \(!active\) return/);
  assert.match(home, /if \(locationChanged\) setHome\(null\)/);
  assert.match(home, /if \(active\) \{\s*setLoading\(false\);\s*setRefreshRequested\(false\)/);
  assert.match(home, /onAction=\{requestRefresh\}/);
});

test("product sliders are virtualized with stable keys and RTL-aware order", () => {
  assert.match(rail, /<FlatList/);
  assert.match(rail, /horizontal/);
  assert.match(rail, /inverted=\{isRTL\}/);
  assert.match(rail, /nestedScrollEnabled/);
  assert.match(rail, /data=\{products.slice\(0, 10\)\}/);
  assert.match(rail, /keyExtractor=\{\(product\) => product.id\}/);
  assert.match(rail, /initialNumToRender=\{3\}/);
  assert.match(rail, /maxToRenderPerBatch=\{4\}/);
  assert.doesNotMatch(rail, /<ScrollView/);
});

test("compact phones retain action hit targets and avoid horizontal overflow", () => {
  assert.match(home, /const compactHeader = screenWidth < 360/);
  assert.match(home, /!compactHeader \? \(/);
  assert.match(home, /width: 44, height: 44/);
  assert.match(hero, /const compact = width < 360/);
  assert.match(spotlight, /const compact = width < 360/);
  assert.match(interests, /const narrow = width < 390/);
  assert.match(interests, /flexDirection: narrow \? "column"/);
});

test("secondary catalog rows are collapsible without losing filters or routes", () => {
  assert.match(home, /showMoreSections/);
  assert.match(home, /accessibilityState=\{\{ expanded: showMoreSections \}\}/);
  assert.match(home, /setShowMoreSections\(\(open\) => !open\)/);
  assert.match(home, /\{showMoreSections \? \(/);
  assert.match(home, /openResults\(\{ sort: "newest" \}\)/);
  assert.match(home, /openResults\(\{ discount: "true" \}\)/);
  assert.match(home, /title=\{t\("marketplace.recentlyViewed"\)\}/);
  assert.match(home, /title=\{t\("marketplace.featuredStores"\)\}/);
});

test("expand and collapse actions are translated in Dari, Pashto and English", () => {
  for (const lang of ["en", "fa-AF", "ps-AF"]) {
    const language = read("packages/localization/src/locales/" + lang + ".ts");
    assert.ok(language.includes('"home.showMore"'), lang + " missing home.showMore");
    assert.ok(language.includes('"home.showLess"'), lang + " missing home.showLess");
  }
});
