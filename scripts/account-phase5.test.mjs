import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = file => readFileSync(file, "utf8");

test("account has functioning saved items, device activity and live recent order routes", () => {
  const account = read("apps/mobile/src/app/(tabs)/account.tsx");
  assert.match(account, /router\.push\("\/account\/wishlist"\)/);
  assert.match(account, /router\.push\("\/account\/recently-viewed"\)/);
  assert.match(account, /listCustomerOrders\(sessionToken\)/);
  assert.match(account, /useFocusEffect\(/);
  assert.match(account, /orderStateKey\(latestOrder.state\)/);
  assert.match(account, /pathname: "\/orders\/\[orderId\]"/);
});

test("wishlist is persisted per signed-in identity; catalog visibility is checked on both writes and reads", () => {
  const service = read("apps/api/src/wishlist/service.ts");
  const routes = read("apps/api/src/wishlist/routes.ts");
  const repo = read("apps/api/src/wishlist/repository.ts");
  const app = read("apps/api/src/app.ts");
  assert.match(service, /marketplace\.findProduct\(productId\)/);
  assert.match(service, /marketplace\.findProductsByIds\(ids\)/);
  assert.match(service, /this\.wishlist\.contains\(userId, productId\)/);
  assert.match(repo, /eq\(customerWishlist\.userId, userId\)/);
  assert.match(repo, /onConflictDoNothing\(\)/);
  for(const method of ['app.get("/customer/wishlist"', 'app.put("/customer/wishlist/:productId"', 'app.delete("/customer/wishlist/:productId"']) {
    assert.ok(routes.includes(method), method);
  }
  assert.match(routes, /auth\.authenticateToken\(token\)/);
  assert.match(app, /registerWishlistRoutes\(/);
});

test("product detail saves or removes items, account screen exposes list with retries", () => {
  const detail = read("apps/mobile/src/app/marketplace/product/[productId].tsx");
  const screen = read("apps/mobile/src/app/account/wishlist.tsx");
  assert.match(detail, /toggleWishlist/);
  assert.match(detail, /saveWishlistProduct\(sessionToken, productId\)/);
  assert.match(detail, /removeWishlistProduct\(sessionToken, productId\)/);
  assert.match(detail, /authStatus !== "signedIn"/);
  assert.match(screen, /getWishlist\(sessionToken\)/);
  assert.match(screen, /removeWishlistProduct\(sessionToken, id\)/);
  assert.match(screen, /MarketplaceProductCard/);
  assert.match(screen, /setReload/);
});

test("recent views are explicitly device-local and clear existing queued history", () => {
  const screen = read("apps/mobile/src/app/account/recently-viewed.tsx");
  assert.match(screen, /getRecentProductIds\(\)/);
  assert.match(screen, /marketplaceHome\(\{ recentProductIds: ids \}\)/);
  assert.match(screen, /clearRecentProductIds\(\)/);
  assert.match(screen, /useFocusEffect\(/);
  const cache = read("apps/mobile/src/marketplace/cache.ts");
  assert.match(cache, /AsyncStorage/);
  assert.match(cache, /recentWriteQueue/);
});

test("Drizzle schema and snapshot match the new private wishlist migration", () => {
  const schema = read("packages/database/src/schema/wishlist.ts");
  const sql = read("packages/database/drizzle/0015_customer_wishlist.sql");
  const snapshot = JSON.parse(read("packages/database/drizzle/meta/0015_snapshot.json"));
  const journal = JSON.parse(read("packages/database/drizzle/meta/_journal.json"));
  assert.match(schema, /primaryKey\(\{/);
  assert.match(schema, /onDelete: "cascade"/);
  assert.match(sql, /customer_wishlist_pk/);
  assert.match(sql, /ON DELETE cascade/);
  assert.ok(snapshot.tables["public.customer_wishlist"]);
  assert.equal(journal.entries.at(-1).tag, "0015_customer_wishlist");
});

test("all shopping account labels ship in Dari, Pashto and English", () => {
  const keys=["wishlist","wishlistHint","wishlistDescription","wishlistEmpty",
    "recent","recentHint","recentDescription","recentEmpty","recentOrder",
    "signInRequired","loading","loadingHint","loadError","retry",
    "explore","remove","items","save","saved","saveError","clearRecent"];
  for (const locale of ["en","fa-AF","ps-AF"]) {
    const content=read("packages/localization/src/locales/"+locale+".ts");
    for(const key of keys) assert.ok(content.includes('"account.shopping.'+key+'"'),locale+" missing "+key);
  }
});
