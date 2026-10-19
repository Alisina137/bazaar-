import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(path, "utf8");

test("public store directory is server-backed, searchable, paginated, and limited to published stores", () => {
  const contracts = read("packages/contracts/src/marketplace.ts");
  const repository = read("apps/api/src/marketplace/repository.ts");
  const service = read("apps/api/src/marketplace/service.ts");
  const routes = read("apps/api/src/marketplace/routes.ts");
  const api = read("apps/mobile/src/marketplace/api.ts");

  assert.match(contracts, /interface MarketplaceStoreDirectoryResponse/);
  assert.match(repository, /directoryStores\(input:/);
  assert.match(repository, /eq\(stores\.status, "published"\)/);
  assert.match(repository, /ilike\(stores\.name, term\)/);
  assert.match(repository, /ilike\(stores\.handle, term\)/);
  assert.match(repository, /ilike\(stores\.province, term\)/);
  assert.match(repository, /ilike\(stores\.cityDistrict, term\)/);
  assert.match(repository, /ilike\(stores\.category, term\)/);
  assert.match(repository, /hasMore: input\.offset \+ results\.length < total/);
  assert.match(service, /return this\.repository\.directoryStores\(input\)/);
  assert.match(routes, /app\.get\("\/marketplace\/stores"/);
  assert.match(routes, /max: 120, timeWindow: "1 minute"/);
  assert.match(routes, /limit: z\.coerce\.number\(\)\.int\(\)\.min\(1\)\.max\(50\)/);
  assert.match(api, /"\/marketplace\/stores" \+ queryString/);
});

test("category browsing drills through real hierarchy before opening matching products", () => {
  const page = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  assert.match(page, /const activeCategory = home\?\.categories\.find/);
  assert.match(page, /category\.parentId === categoryParentId/);
  assert.match(page, /const browseCategoryHierarchy = \(id: string\)/);
  assert.match(page, /if \(children\.length > 0\)/);
  assert.match(page, /onPress=\{\(\) => browseCategoryHierarchy\(category\.id\)\}/);
  assert.match(page, /viewCategoryProducts/);
  assert.match(page, /setCategoryParentId\(activeCategory\.parentId\)/);
});

test("Stores tab searches and pages real directory results and handles empty/error states", () => {
  const page = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  const card = read("apps/mobile/src/components/marketplace/MarketplaceStoreCard.tsx");
  assert.match(page, /marketplaceStores\(/);
  assert.match(page, /submitStoreSearch/);
  assert.match(page, /storeDirectoryRequestId/);
  assert.match(page, /storeDirectory\.pageInfo\.hasMore/);
  assert.match(page, /append: true/);
  assert.match(page, /marketplace\.phase5\.noStoresTitle/);
  assert.match(page, /marketplace\.phase5\.clearStoreSearch/);
  assert.match(card, /grid \? "48%" : 210/);
  assert.match(page, /flexDirection: isRTL \? "row-reverse" : "row"/);
});

test("Marketplace phase 5 copy exists in English, Dari, and Pashto", () => {
  const keys = ["storesHint", "storeSearchLabel", "storeSearchPlaceholder", "storeResultsFor",
    "loadingStores", "storeCount", "noStoresTitle", "noStoresMessage", "clearStoreSearch",
    "backToCategories", "viewCategoryProducts"];
  for (const locale of ["en", "fa-AF", "ps-AF"]) {
    const source = read("packages/localization/src/locales/" + locale + ".ts");
    for (const key of keys) {
      assert.ok(source.includes('"marketplace.phase5.' + key + '"'), locale + " missing " + key);
    }
  }
});
