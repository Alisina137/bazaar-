import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(path, "utf8");

function accountRouting() {
  const source = read("apps/mobile/src/account/navigation.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports });
  return exports.sellerAccountEntry;
}

test("seller accounts never route staff into onboarding without an owned store", () => {
  const entry = accountRouting();
  assert.equal(entry(["customer"], "idle", false), "onboarding");
  assert.equal(entry(["merchant_owner"], "ready", false), "onboarding");
  assert.equal(entry(["merchant_owner"], "ready", true), "workspace");
  assert.equal(entry(["merchant_staff"], "ready", true), "workspace");
  assert.equal(entry(["merchant_staff"], "ready", false), "unassigned");
  assert.equal(entry(["merchant_staff"], "loading", false), "loading");
  assert.equal(entry(["merchant_staff"], "error", false), "retry");
  assert.equal(entry(["merchant_owner", "merchant_staff"], "ready", false), "onboarding");
});

test("account structure retains real routes, auth and role-scoped platform access", () => {
  const screen = read("apps/mobile/src/app/(tabs)/account.tsx");
  for (const section of [
    "account.section.shopping", "account.section.account",
    "account.section.preferences", "account.section.business",
    "account.section.help"
  ]) assert.ok(screen.includes('t("' + section + '")'), section);
  for (const route of [
    "/(tabs)/orders", "/(tabs)/cart",
    "/checkout/addresses", "/notifications", "/support",
    "/seller/(tabs)", "/seller/onboarding",
    "/platform/reviews", "/platform/support"
  ]) assert.ok(screen.includes('"' + route + '"'), route);
  assert.match(screen, /availableModes\.includes\("platform"\)/);
  assert.match(screen, /sellerAccountEntry\(/);
  assert.match(screen, /sellerEntry === "unassigned"/);
  assert.match(screen, /logout\(\)/);
  // Phase 2 moved authentication into the guest screen, leaving the signed-in menu intact.
  const guest = read("apps/mobile/src/components/account/GuestAccountContent.tsx");
  assert.match(screen, /<GuestAccountContent \/>/);
  assert.match(guest, /await login\(/);
  assert.match(guest, /await register\(/);
  assert.match(screen, /<LanguageSwitcher compact \/>/);
  assert.doesNotMatch(screen, /router\.push\("\/account\/edit"\)/);
});

test("profile and menu provide accessible and live RTL navigation affordances", () => {
  const screen = read("apps/mobile/src/app/(tabs)/account.tsx");
  const menu = read("apps/mobile/src/components/account/AccountMenu.tsx");
  assert.match(screen, /user\.displayName\?\.trim\(\)/);
  assert.match(screen, /<ProfileAvatar/);
  assert.match(read("apps/mobile/src/components/account/ProfileAvatar.tsx"), /initial/);
  assert.match(screen, /accessibilityState=\{\{ expanded: showAccess \}\}/);
  assert.match(screen, /flexDirection: isRTL \? "row-reverse" : "row"/);
  assert.match(menu, /accessibilityRole=\{onPress \? "button" : "text"\}/);
  assert.match(menu, /minHeight: 64/);
  assert.match(menu, /flexDirection: isRTL \? "row-reverse" : "row"/);
  assert.match(menu, /isRTL \? "chevron-back" : "chevron-forward"/);
  assert.match(menu, /borderBottomWidth: last \? 0 : 1/);
});

test("new Account labels are available in English, Dari and Pashto", () => {
  const locales = ["en", "fa-AF", "ps-AF"];
  const keys = [
    "account.section.shopping", "account.section.account",
    "account.section.preferences", "account.section.business",
    "account.section.help", "account.myOrders", "account.ordersHint",
    "account.cartHint", "account.addressesHint",
    "account.notificationsHint", "account.supportHint",
    "account.accessDetails", "account.sellerStaffWorkspace",
    "account.storeAccessLoading", "account.storeAccessRetry",
    "account.storeAccessError", "account.noAssignedStore"
  ];
  for (const locale of locales) {
    const source = read("packages/localization/src/locales/" + locale + ".ts");
    for (const key of keys) {
      assert.ok(source.includes('"' + key + '"'), locale + " missing " + key);
    }
  }
});
