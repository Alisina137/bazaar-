import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const app = "apps/mobile/src/app";
const layout = readFileSync(app + "/_layout.tsx", "utf8");

test("root Stack uses Expo Router discovery instead of invalid manual names", () => {
  assert.match(layout, /<Stack\s+screenOptions=\{\{/);
  assert.doesNotMatch(layout, /<Stack\.Screen\b/);
  assert.match(layout, /direction: "ltr"/);
  assert.match(layout, /headerShown: false/);
});

test("root providers and StatusBar are preserved", () => {
  for (const marker of ["<SafeAreaProvider", "<AppThemeProvider>", "<LocalizationProvider>",
    "<AuthProvider>", "<NotificationProvider>", "<StoreProvider>", "<CatalogProvider>",
    "<RootNavigator />", "<StatusBar"]) {
    assert.ok(layout.includes(marker), "Missing root element: " + marker);
  }
});

test("account leaf routes are not an invalid root Stack.Screen", () => {
  assert.equal(existsSync(app + "/account/_layout.tsx"), false);
  assert.equal(existsSync(app + "/account/index.tsx"), false);
  for (const route of ["profile", "preferences", "security", "recover", "wishlist", "recently-viewed"]) {
    assert.ok(existsSync(app + "/account/" + route + ".tsx"), "Missing account route " + route);
  }
  assert.ok(existsSync(app + "/(tabs)/account.tsx"), "Account tab must remain navigable");
});

test("primary root screens retain file-backed routes", () => {
  for (const relative of ["(tabs)/_layout.tsx", "marketplace/_layout.tsx",
    "seller/_layout.tsx", "checkout/index.tsx", "notifications.tsx", "support/index.tsx"]) {
    assert.ok(existsSync(app + "/" + relative), "Missing root route " + relative);
  }
});
