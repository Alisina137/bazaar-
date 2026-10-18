import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = file => readFileSync(file, "utf8");

test("Account has quick access, verification prompt, and confirmation before signing out", () => {
  const screen = read("apps/mobile/src/app/(tabs)/account.tsx");
  const quick = read("apps/mobile/src/components/account/AccountQuickActions.tsx");
  assert.match(screen, /<AccountQuickActions/);
  assert.match(screen, /onOrders=\{\(\) => router\.push\("\/\(tabs\)\/orders"\)\}/);
  assert.match(screen, /onSaved=\{\(\) => router\.push\("\/account\/wishlist"\)\}/);
  assert.match(screen, /onSupport=\{\(\) => router\.push\("\/support"\)\}/);
  assert.match(screen, /user\.email && !user\.emailVerified/);
  assert.match(screen, /router\.push\("\/account\/security"\)/);
  assert.match(screen, /Alert\.alert\(/);
  assert.match(screen, /style: "cancel"/);
  assert.match(screen, /style: "destructive"/);
  assert.match(screen, /onPress=\{confirmSignOut\}/);
  assert.match(screen, /account\.phase8\.signOutPartialHint/);
  assert.match(quick, /accessibilityRole="button"/);
  assert.match(quick, /minHeight: 108/);
  assert.match(quick, /flexDirection: isRTL \? "row-reverse" : "row"/);
});

test("Clearing history requires confirmation and does not fake success on storage failure", () => {
  const cache = read("apps/mobile/src/marketplace/cache.ts");
  const recent = read("apps/mobile/src/app/account/recently-viewed.tsx");
  assert.match(cache, /return next;/);
  assert.match(cache, /queueRecentWrite\(\(\) => AsyncStorage\.removeItem\(RECENT_KEY\)\)/);
  assert.match(recent, /Alert\.alert\(/);
  assert.match(recent, /onPress=\{confirmClear\}/);
  assert.match(recent, /setClearError\(true\)/);
  assert.match(recent, /account\.phase8\.clearHistoryError/);
});

test("Wishlist removal errors preserve saved items and allow a retry", () => {
  const wishlist = read("apps/mobile/src/app/account/wishlist.tsx");
  const remove = wishlist.slice(wishlist.indexOf("  const remove = async"));
  assert.match(remove, /await removeWishlistProduct\(sessionToken, id\)/);
  assert.match(remove, /setItems\(current => current\.filter/);
  assert.match(remove, /setRemoveError\(true\)/);
  assert.doesNotMatch(remove, /catch \{\s*setError\(true\)/);
  assert.match(wishlist, /account\.phase8\.wishlistRemoveError/);
});

test("Phase 8 labels are translated for all three supported languages", () => {
  const en = read("packages/localization/src/locales/en.ts");
  const keys = [...en.matchAll(/"account\.phase8\.([^"]+)":/g)].map(match => match[1]);
  assert.ok(keys.length >= 12);
  for (const lang of ["fa-AF", "ps-AF"]) {
    const source = read("packages/localization/src/locales/" + lang + ".ts");
    for (const key of keys) {
      assert.ok(source.includes('"account.phase8.' + key + '"'), lang + " missing " + key);
    }
  }
});

test("Recent-product write queue propagates failed clears and remains usable", async () => {
  const memory = new Map();
  let failRemoval = false;
  const fakeStorage = {
    async getItem(key) { return memory.get(key) ?? null; },
    async setItem(key, value) { memory.set(key, value); },
    async removeItem(key) {
      if (failRemoval) throw new Error("storage blocked");
      memory.delete(key);
    }
  };
  const source = ts.transpileModule(read("apps/mobile/src/marketplace/cache.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  runInNewContext(source, {
    exports,
    require: name => {
      assert.equal(name, "@react-native-async-storage/async-storage");
      return { __esModule: true, default: fakeStorage };
    }
  });

  await exports.rememberProduct("product-a");
  assert.deepEqual(Array.from(await exports.getRecentProductIds()), ["product-a"]);
  failRemoval = true;
  await assert.rejects(exports.clearRecentProductIds(), /storage blocked/);
  assert.deepEqual(Array.from(await exports.getRecentProductIds()), ["product-a"]);
  failRemoval = false;
  await exports.clearRecentProductIds();
  assert.deepEqual(Array.from(await exports.getRecentProductIds()), []);

  // A clear queued after a delayed visit cannot be undone by that visit.
  await Promise.all([
    exports.rememberProduct("product-b"),
    exports.clearRecentProductIds()
  ]);
  assert.deepEqual(Array.from(await exports.getRecentProductIds()), []);
});
