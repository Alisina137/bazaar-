import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(path, "utf8");

test("Marketplace discovery cards are memoized to avoid unnecessary rerenders", () => {
  for (const path of [
    "apps/mobile/src/components/marketplace/MarketplaceProductCard.tsx",
    "apps/mobile/src/components/marketplace/MarketplaceStoreCard.tsx",
    "apps/mobile/src/components/marketplace/MarketplaceCategoryTile.tsx"
  ]) {
    const source = read(path);
    assert.match(source, /import \{ memo, useState/);
    assert.match(source, /export const Marketplace\w+ = memo\(Marketplace\w+Inner\)/);
  }
});

test("store directory caches query-scoped pages with the shared bounded cache policy", () => {
  const cache = read("apps/mobile/src/marketplace/cache.ts");
  const page = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  assert.match(cache, /storeDirectoryCacheKey/);
  assert.match(cache, /readStoreDirectoryCache/);
  assert.match(cache, /writeStoreDirectoryCache/);
  assert.match(cache, /const CACHE_TTL_MS = 15 \* 60 \* 1000/);
  assert.match(cache, /const MAX_STALE_MS = 7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(page, /readStoreDirectoryCache\(cacheKey, true\)/);
  assert.match(page, /writeStoreDirectoryCache\(cacheKey, response\)/);
  assert.match(page, /usingCachedStoreDirectory/);
  assert.match(page, /marketplace\.cachedNotice/);
});

test("Marketplace supports pull-to-refresh and retries failed product pagination", () => {
  const page = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  const screen = read("apps/mobile/src/components/ui/Screen.tsx");
  assert.match(page, /const refreshMarketplace = \(\) =>/);
  assert.match(page, /refreshing=\{selectedView === "stores"/);
  assert.match(page, /onRefresh=\{refreshMarketplace\}/);
  assert.match(page, /browseLoadMoreError/);
  assert.match(page, /executeBrowse\(\{ \.\.\.browseInput, offset: browse\.products\.length \}, true\)/);
  assert.match(screen, /RefreshControl/);
});

test("discovery loading uses stable skeleton placeholders and scroll restoration is opt-in", () => {
  const skeleton = read("apps/mobile/src/components/marketplace/MarketplaceDiscoverySkeleton.tsx");
  const page = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  const screen = read("apps/mobile/src/components/ui/Screen.tsx");
  assert.match(skeleton, /accessibilityRole="progressbar"/);
  assert.match(skeleton, /variant === "product" \? 1 : 1\.7/);
  assert.match(page, /MarketplaceDiscoverySkeleton title=\{t\("marketplace\.searching"\)\}/);
  assert.match(page, /MarketplaceDiscoverySkeleton title=\{t\("marketplace\.phase5\.loadingStores"\)\} variant="store"/);
  assert.match(page, /scrollKey="marketplace-main"/);
  assert.match(screen, /savedScrollOffsets/);
  assert.match(screen, /scrollTo\(\{ y: offset, animated: false \}\)/);
});
