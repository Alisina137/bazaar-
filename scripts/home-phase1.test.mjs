import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");
const home = read("apps/mobile/src/app/(tabs)/index.tsx");
const marketplace = read("apps/mobile/src/app/(tabs)/marketplace.tsx");

test("shopping Home uses real marketplace data, cache and clear entry points", () => {
  assert.match(home, /marketplaceHome\(\{ recentProductIds \}\)/);
  assert.match(home, /readHomeCache\(key, true\)/);
  assert.match(home, /<MarketplaceProductCard/);
  assert.match(home, /home\?\.featuredStores/);
  assert.match(home, /<LanguageSwitcher compact/);
  assert.match(home, /<SectionHeader/);
  assert.doesNotMatch(home, /home\.(?:title|description|statusTitle|statusMessage|mobileFirst|accessibleTargets|rtlReady)/);
});

test("Home actions reach cart, gated notifications, category-filtered Marketplace", () => {
  assert.match(home, /router\.push\("\/\(tabs\)\/cart"\)/);
  assert.match(home, /status === "signedIn" \? "\/notifications" : "\/\(tabs\)\/account"/);
  assert.match(home, /params: \{ categoryId \}/);
  assert.match(marketplace, /useLocalSearchParams<\{ categoryId\?: string; q\?: string; brand\?: string; storeId\?: string \}>\(\)/);
  assert.match(marketplace, /linkedCategoryId \? \{ categoryId: linkedCategoryId \}/);
});

test("main customer tabs omit redundant intro badges and subtitles", () => {
  const paths = [
    "apps/mobile/src/app/(tabs)/marketplace.tsx",
    "apps/mobile/src/app/(tabs)/cart.tsx",
    "apps/mobile/src/app/(tabs)/orders.tsx",
    "apps/mobile/src/app/(tabs)/account.tsx"
  ];
  for (const path of paths) {
    assert.doesNotMatch(read(path), /(?:marketplace|cart|order)\.phaseBadge|auth\.activeSession|auth\.signedInMessage|auth\.signInDescription|auth\.registerDescription/);
  }
});

test("Home copy exists for English, Dari and Pashto", () => {
  for (const lang of ["en","fa-AF","ps-AF"]) {
    const source = read("packages/localization/src/locales/" + lang + ".ts");
    for (const key of ["shopLocal","exploreProducts","viewAll","emptyTitle","emptyMessage"]) {
      assert.ok(source.includes('"home.' + key + '"'), lang + ": home." + key);
    }
  }
});
