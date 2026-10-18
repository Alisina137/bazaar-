import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");
const home = read("apps/mobile/src/app/(tabs)/index.tsx");
const hero = read("apps/mobile/src/components/marketplace/HomeHeroBanner.tsx");
const deal = read("apps/mobile/src/components/marketplace/HomeDealSpotlight.tsx");
const rail = read("apps/mobile/src/components/marketplace/HomeProductRail.tsx");
const section = read("apps/mobile/src/components/marketplace/HomeSectionHeader.tsx");
const skeleton = read("apps/mobile/src/components/marketplace/HomeLoadingSkeleton.tsx");
const tile = read("apps/mobile/src/components/marketplace/MarketplaceCategoryTile.tsx");
const card = read("apps/mobile/src/components/marketplace/MarketplaceProductCard.tsx");
const store = read("apps/mobile/src/components/marketplace/MarketplaceStoreCard.tsx");
const search = read("apps/mobile/src/components/marketplace/MarketplaceSearchBox.tsx");
const province = read("apps/mobile/src/components/marketplace/HomeProvinceSelector.tsx");
const interests = read("apps/mobile/src/components/marketplace/HomeInterestPicker.tsx");

test("compact Home structure retains functional shopping routes and no decorative intro copy", () => {
  assert.match(home, /<HomeHeroBanner \/>/);
  assert.match(home, /<HomeDealSpotlight product=\{spotlight\}/);
  assert.match(home, /<HomeSectionHeader title=\{t\("marketplace.categories"\)\}/);
  assert.match(home, /<HomeSectionHeader title=\{t\("marketplace.featuredStores"\)\}/);
  assert.match(home, /<MarketplaceSearchBox value=\{query\}/);
  assert.match(home, /<HomeInterestPicker/);
  assert.match(home, /<HomeProvinceSelector value=\{province\} onChange=\{chooseProvince\}/);
  assert.match(home, /<HomeLoadingSkeleton \/>/);
  assert.doesNotMatch(home, /home\.(?:title|description|statusTitle|statusMessage|mobileFirst|accessibleTargets|rtlReady)/);
});

test("hero and real offer preserve tappable product and marketplace entry", () => {
  assert.match(hero, /accessibilityRole="button"/);
  assert.match(hero, /router\.push\("\/\(tabs\)\/marketplace"\)/);
  assert.match(hero, /borderRadius: theme\.radii\.xl/);
  assert.match(deal, /pathname: "\/marketplace\/product\/\[productId\]"/);
  assert.match(deal, /discountPercentage\(product\)/);
  assert.match(deal, /onError=\{\(\) => setImageFailed\(true\)\}/);
});

test("product rails share readable headings, directional accessible View all", () => {
  assert.match(rail, /<HomeSectionHeader title=\{title\} icon=\{icon\} onViewAll=\{onViewAll\}/);
  assert.match(rail, /products\.slice\(0, 10\)/);
  assert.match(section, /accessibilityRole="button"/);
  assert.match(section, /minHeight: 44/);
  assert.match(section, /isRTL \? "arrow-back" : "arrow-forward"/);
  assert.match(section, /numberOfLines=\{1\}/);
  assert.match(home, /icon="flame-outline"/);
  assert.match(home, /icon="sparkles-outline"/);
});

test("category and catalog media cards improve hierarchy without removing trust constraints", () => {
  assert.match(tile, /width: grid \? "31%" : 110/);
  assert.match(tile, /category\.imageUrl && !brokenImage/);
  assert.match(tile, /locale === "ps-AF"/);
  assert.match(card, /grid \? "48%" : "100%"/);
  assert.match(card, /product\.store\.trust\.phoneVerified/);
  assert.match(card, /!product\.inStock/);
  assert.match(card, /discountPercentage\(product\)/);
  assert.match(store, /store\.trust\.phoneVerified/);
  assert.match(store, /store\.coverImageUrl && !coverFailed/);
  assert.match(card, /theme\.scheme === "light"/);
});

test("Home supports visible focus, selected controls, RTL and stable loading skeleton", () => {
  assert.match(search, /onFocus=\{\(\) => \{ setFocused\(true\); onFocusChange\?\.\(true\); \}\}/);
  assert.match(search, /onBlur=\{\(\) => \{ setFocused\(false\); onFocusChange\?\.\(false\); \}\}/);
  assert.match(search, /focused \? theme\.colors\.primary/);
  assert.match(province, /value \? theme\.colors\.primarySoft/);
  assert.match(interests, /favorites\.length \? theme\.colors\.primarySoft/);
  assert.match(skeleton, /accessibilityRole="progressbar"/);
  assert.match(skeleton, /flexDirection: isRTL \? "row-reverse" : "row"/);
  assert.match(hero, /flexDirection: isRTL \? "row-reverse" : "row"/);
  assert.match(deal, /flexDirection: isRTL \? "row-reverse" : "row"/);
});
