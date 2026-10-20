import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { DISTRICTS_BY_PROVINCE, districtOptionsForProvince } from "../apps/mobile/src/store/location-options.ts";

const onboarding = readFileSync("apps/mobile/src/app/seller/onboarding.tsx", "utf8");
const select = readFileSync("apps/mobile/src/components/ui/SelectField.tsx", "utf8");
const provinceSource = readFileSync("apps/mobile/src/marketplace/provinces.ts", "utf8");

test("dataset covers all 34 app provinces and 401 districts", () => {
  const provinces = [...provinceSource.matchAll(/\["([^"]+)",\s*"[^"]+",\s*"[^"]+"\]/g)].map(match => match[1]);
  assert.equal(provinces.length, 34);
  assert.deepEqual(Object.keys(DISTRICTS_BY_PROVINCE).sort(), provinces.sort());
  assert.equal(Object.values(DISTRICTS_BY_PROVINCE).reduce((sum, list) => sum + list.length, 0), 401);
  assert.ok(districtOptionsForProvince("Kabul", "en").some(item => item.value === "Kabul"));
  assert.ok(districtOptionsForProvince("Balkh", "en").some(item => item.value === "Mazar-e-Sharif"));
  assert.equal(districtOptionsForProvince("Unknown", "en").length, 0);
  for (const province of provinces) {
    const en = districtOptionsForProvince(province, "en");
    const fa = districtOptionsForProvince(province, "fa-AF");
    assert.ok(en.length > 0, province + " has no districts");
    assert.equal(en.length, fa.length);
    assert.equal(new Set(en.map(option => option.value)).size, en.length);
    assert.ok(en.every(option => option.value.trim() && option.label.trim()));
    assert.ok(fa.every(option => option.value.trim() && option.label.trim()));
  }
});

test("store category select uses live Marketplace category options", () => {
  assert.match(onboarding, /marketplaceCategories\(\)/);
  assert.match(onboarding, /item\.parentId === null/);
  assert.match(onboarding, /const selectedCategory = categories\.find\(/);
  assert.match(onboarding, /category: selectedCategory!\.nameEn/);
  assert.match(onboarding, /categoriesError/);
  assert.match(onboarding, /setCategoriesReload\(n => n \+ 1\)/);
});

test("changing province clears district selection and custom input", () => {
  assert.match(onboarding, /options=\{AFGHAN_PROVINCES\.map/);
  assert.match(onboarding, /options=\{\[\s*\.\.\.districtOptions,/);
  assert.match(onboarding, /setProvince\(value\);\s*setCityDistrict\(""\);/);
  assert.match(onboarding, /setCustomDistrict\(""\);/);
  assert.match(onboarding, /validDistrict &&/);
  assert.match(onboarding, /disabled=\{!province\}/);
});

test("other city/district is an explicit bounded fallback", () => {
  assert.match(onboarding, /const OTHER_DISTRICT = "__other__"/);
  assert.match(onboarding, /cityDistrict === OTHER_DISTRICT/);
  assert.match(onboarding, /customDistrict\.trim\(\)/);
  assert.match(onboarding, /cityDistrict: enteredDistrict/);
  assert.match(onboarding, /maxLength=\{120\}/);
});

test("select dialogs implement search, accessibility and RTL rows", () => {
  assert.match(select, /accessibilityState=\{\{ expanded: open, disabled \}\}/);
  assert.match(select, /accessibilityRole="radio"/);
  assert.match(select, /matching\.map\(/);
  assert.match(select, /isRTL \? "row-reverse" : "row"/);
  assert.match(select, /<Modal/);
  assert.match(select, /keyboardShouldPersistTaps="handled"/);
});

test("onboarding selector translations exist in every app language", () => {
  const keys = [...onboarding.matchAll(/t\("(seller\.onboarding\.[^"]+)"\)/g),
    ...select.matchAll(/t\("(seller\.onboarding\.[^"]+)"\)/g)].map(match => match[1]);
  for (const code of ["en", "fa-AF", "ps-AF"]) {
    const source = readFileSync("packages/localization/src/locales/" + code + ".ts", "utf8");
    for (const key of new Set(keys)) {
      assert.ok(source.includes('"' + key + '":'), key + " missing in " + code);
    }
  }
});
