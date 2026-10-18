import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Account > Sell on BazaarLink uses a horizontal scroll rail with 3 side-by-side plan cards", () => {
  const screen = read("apps/mobile/src/app/seller/onboarding.tsx");
  const cards = read("apps/mobile/src/components/seller/OnboardingPlanCards.tsx");

  assert.match(screen, /step === "plan"/);
  assert.match(screen, /<OnboardingPlanCards/);
  assert.match(screen, /plans=\{plans\}/);
  assert.match(screen, /onStartStarter=\{\(\) => setStep\("store"\)\}/);
  assert.match(cards, /<HorizontalLocaleScroll/);
  assert.match(cards, /showsHorizontalScrollIndicator/);
  assert.match(cards, /nestedScrollEnabled/);
  assert.match(cards, /width: cardWidth/);
  assert.match(cards, /useWindowDimensions/);
  assert.match(cards, /starter", "pro", "business"/);
  assert.match(cards, /minHeight: 560/);
  assert.match(cards, /borderTopLeftRadius: 28/);
  assert.match(cards, /borderBottomRightRadius: 28/);
  assert.match(cards, /transform: \[\{ rotate: "45deg" \}\]/);
});

test("feature checklist uses real server plan limits and every entitlement", () => {
  const cards = read("apps/mobile/src/components/seller/OnboardingPlanCards.tsx");
  const contract = read("packages/contracts/src/store.ts");
  for (const feature of [
    "advancedInventory", "advancedDelivery", "discounts", "coupons",
    "promotions", "advancedAnalytics", "premiumStorefront", "customDomain"
  ]) {
    assert.match(contract, new RegExp(feature + ": boolean"));
    assert.match(cards, new RegExp(feature + ': "seller\\.plans\\.' + feature + '"'));
  }

  assert.match(cards, /plans\.find\(\(plan\) => plan\.code === code\)/);
  assert.match(cards, /const \{ entitlements: limits, code \} = plan/);
  assert.match(cards, /formatNumber\(limits\.productLimit\)/);
  assert.match(cards, /limits\.categoryLimit === null/);
  assert.match(cards, /formatNumber\(limits\.staffLimit\)/);
  assert.match(cards, /included=\{limits\[feature\]\}/);
  assert.match(cards, /checkmark-circle/);
  assert.match(cards, /close-circle-outline/);
});

test("new shops can only start on free Starter and paid pricing is not invented", () => {
  const screen = read("apps/mobile/src/app/seller/onboarding.tsx");
  const cards = read("apps/mobile/src/components/seller/OnboardingPlanCards.tsx");
  assert.match(cards, /starter \? \(/);
  assert.match(cards, /onPress=\{onStartStarter\}/);
  assert.match(cards, /seller\.plans\.upgradeAfterSetup/);
  assert.match(cards, /seller\.plans\.pricingConfigured/);
  assert.doesNotMatch(cards, /\$\s*\d|\d+(?:\.\d+)?\s*AFN/i);
  assert.doesNotMatch(screen, /paidUpgradeAvailable: false/);
  assert.match(screen, /plans\.length > 0/);
  assert.match(screen, /seller\.plans\.unavailable/);
  assert.match(screen, /disabled: item !== "minimal"/);
});

test("plan comparison is available in English, Dari and Pashto", () => {
  const keys = [
    "seller.plans.compareTitle", "seller.plans.scrollHint",
    "seller.plans.freeTier", "seller.plans.paidTier", "seller.plans.free",
    "seller.plans.pricingConfigured", "seller.plans.advancedInventory",
    "seller.plans.advancedDelivery", "seller.plans.discounts",
    "seller.plans.coupons", "seller.plans.promotions",
    "seller.plans.advancedAnalytics", "seller.plans.premiumStorefront",
    "seller.plans.customDomain", "seller.plans.startFree",
    "seller.plans.upgradeAfterSetup", "seller.plans.newStoreNotice",
    "seller.plans.unavailable", "seller.plans.retry", "seller.plans.themeNotice"
  ];
  for (const locale of ["en", "fa-AF", "ps-AF"]) {
    const file = read("packages/localization/src/locales/" + locale + ".ts");
    for (const key of keys) {
      assert.ok(file.includes('"' + key + '"'), locale + " missing " + key);
    }
  }
});

test("RTL/LTR plan rail honors the shared horizontal-scroll start behavior", () => {
  const cards = read("apps/mobile/src/components/seller/OnboardingPlanCards.tsx");
  const rail = read("apps/mobile/src/components/ui/HorizontalLocaleScroll.tsx");
  assert.match(cards, /flexDirection: isRTL \? "row-reverse" : "row"/);
  assert.match(cards, /right: isRTL \? undefined/);
  assert.match(rail, /horizontal/);
  assert.match(rail, /scrollToEnd\(\{ animated: false \}\)/);
});
