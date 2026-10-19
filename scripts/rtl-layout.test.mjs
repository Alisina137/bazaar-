import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

function tsxFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? tsxFiles(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

test("locale metadata controls RTL for Persian/Dari and Pashto, LTR for English", () => {
  const core = read("packages/localization/src/core.ts");
  assert.match(core, /"fa-AF": \{\s*direction: "rtl"/);
  assert.match(core, /"ps-AF": \{\s*direction: "rtl"/);
  assert.match(core, /en: \{\s*direction: "ltr"/);
  const provider = read("apps/mobile/src/localization/provider.tsx");
  assert.match(provider, /const direction = getDirection\(locale\)/);
  assert.match(provider, /isRTL: direction === "rtl"/);
  assert.match(provider, /setLocaleState\(nextLocale\)/);
  assert.match(provider, /userHasSelectedLocale\.current = true/);
  assert.match(provider, /!userHasSelectedLocale\.current && isSupportedLocale\(stored\)/);
});

test("navigation updates tab order on a live language switch without global RTL reload", () => {
  for (const file of [
    "apps/mobile/src/app/(tabs)/_layout.tsx",
    "apps/mobile/src/app/seller/(tabs)/_layout.tsx"
  ]) {
    const code = read(file);
    assert.match(code, /key=\{isRTL \? "rtl" : "ltr"\}/, file);
    assert.match(code, /isRTL \? \[\.\.\.screens\]\.reverse\(\) : screens/, file);
    assert.match(code, /direction: "ltr"/, file);
  }
  assert.match(read("apps/mobile/src/app/_layout.tsx"), /direction: "ltr"/);
  assert.match(read("apps/mobile/src/components/ui/Screen.tsx"), /direction: "ltr"/);
  assert.doesNotMatch(read("apps/mobile/src/localization/provider.tsx"), /I18nManager\.forceRTL/);
});

test("shared text, inputs, searches and rails follow active language direction", () => {
  const text = read("apps/mobile/src/components/ui/AppText.tsx");
  const field = read("apps/mobile/src/components/ui/TextField.tsx");
  const search = read("apps/mobile/src/components/marketplace/MarketplaceSearchBox.tsx");
  const rail = read("apps/mobile/src/components/marketplace/HomeProductRail.tsx");
  assert.match(text, /textAlign: align \?\? \(isRTL \? "right" : "left"\)/);
  assert.match(text, /writingDirection: direction/);
  assert.match(field, /textAlign: isRTL \? "right" : "left"/);
  assert.match(field, /writingDirection: direction/);
  assert.match(search, /flexDirection: isRTL \? "row-reverse" : "row"/);
  assert.match(search, /textAlign: isRTL \? "right" : "left"/);
  assert.match(search, /writingDirection: direction/);
  assert.match(rail, /inverted=\{isRTL\}/);
});

test("shopping, checkout, support, moderation and seller horizontal rows mirror RTL", () => {
  const roots = ["apps/mobile/src/app", "apps/mobile/src/components/marketplace", "apps/mobile/src/payment"];
  const fixedLTRButtons = new Set(["apps/mobile/src/components/ui/Button.tsx"]);
  for (const file of roots.flatMap(tsxFiles)) {
    if (fixedLTRButtons.has(file.replaceAll("\\", "/"))) continue;
    const source = read(file);
    assert.doesNotMatch(source, /flexDirection:\s*"row"/, file + " has an LTR-only row");
    if (source.includes('flexDirection: isRTL ? "row-reverse" : "row"')) {
      assert.match(source, /useLocalization\(\)/, file);
    }
  }
  for (const path of [
    "apps/mobile/src/app/(tabs)/cart.tsx",
    "apps/mobile/src/app/(tabs)/orders.tsx",
    "apps/mobile/src/app/checkout/addresses.tsx",
    "apps/mobile/src/app/checkout/index.tsx",
    "apps/mobile/src/app/marketplace/product/[productId].tsx",
    "apps/mobile/src/app/marketplace/store/[handle].tsx",
    "apps/mobile/src/app/seller/delivery.tsx",
    "apps/mobile/src/payment/CheckoutPaymentSection.tsx"
  ]) {
    assert.match(read(path), /flexDirection: isRTL \? "row-reverse" : "row"/, path);
  }
  const marketplace = read("apps/mobile/src/app/(tabs)/marketplace.tsx");
  assert.match(marketplace, /flexDirection: isRTL \? "row-reverse" : "row"/);
  assert.match(marketplace, /storeDirectory\.stores\.map\(featured =>/);
});

test("horizontal carousels start with the first item on the right in RTL", () => {
  const rail = read("apps/mobile/src/components/ui/HorizontalLocaleScroll.tsx");
  assert.match(rail, /flexDirection: isRTL \? "row-reverse" : "row"/);
  assert.match(rail, /scrollToEnd\(\{ animated: false \}\)/);
  assert.match(rail, /viewportWidth\.current <= 0 \|\| contentWidth\.current <= 0/);
  assert.match(rail, /key=\{isRTL \? "rtl" : "ltr"\}/);
  for (const path of [
    "apps/mobile/src/app/(tabs)/index.tsx",
    "apps/mobile/src/app/marketplace/product/[productId].tsx",
    "apps/mobile/src/app/marketplace/store/[handle].tsx"
  ]) {
    assert.match(read(path), /<HorizontalLocaleScroll/, path);
  }
});
