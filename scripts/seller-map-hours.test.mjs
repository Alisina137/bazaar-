import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { googleMapsPlaceUrl, initialMapCenter, validMapPin } from "../apps/mobile/src/store/map-utils.ts";

const onboarding = readFileSync("apps/mobile/src/app/seller/onboarding.tsx", "utf8");
const settings = readFileSync("apps/mobile/src/app/seller/settings.tsx", "utf8");
const store = readFileSync("apps/mobile/src/app/marketplace/store/[handle].tsx", "utf8");
const native = readFileSync("apps/mobile/src/store/StoreMapPicker.tsx", "utf8");
const web = readFileSync("apps/mobile/src/store/StoreMapPicker.web.tsx", "utf8");
const hours = readFileSync("apps/mobile/src/store/BusinessHoursRange.tsx", "utf8");
const api = readFileSync("apps/mobile/src/store/api.ts", "utf8");
const provider = readFileSync("apps/mobile/src/store/provider.tsx", "utf8");
const routes = readFileSync("apps/api/src/store/routes.ts", "utf8");
const contracts = readFileSync("packages/contracts/src/store.ts", "utf8");

test("map location is an explicit, valid coordinate pair", () => {
  assert.deepEqual(initialMapCenter("Kabul").latitude > 34, true);
  assert.ok(validMapPin({ latitude: 34.5, longitude: 69.2 }));
  for (const point of [
    { latitude: 91, longitude: 69 }, { latitude: 0, longitude: 181 },
    { latitude: Number.NaN, longitude: 69 },
    { latitude: 34, longitude: Number.POSITIVE_INFINITY }
  ]) assert.equal(validMapPin(point), false);
  assert.equal(googleMapsPlaceUrl(90.5, 0), null);
  assert.match(googleMapsPlaceUrl(34.5, 69.2) ?? "", /google\.com\/maps\/search\/\?api=1/);
});

test("Android map picker saves only confirmed taps or dragged pins", () => {
  assert.match(native, /from "react-native-maps"/);
  assert.match(native, /onPress=\{choose\}/);
  assert.match(native, /onDragEnd=\{event =>/);
  assert.match(native, /onChange\(draft\)/);
  assert.match(native, /setVisible\(false\)/);
  assert.match(native, /onChange\(null\)/);
  assert.match(web, /googleMapsPlaceUrl/);
});

test("store onboarding distinguishes written address and map location", () => {
  assert.match(onboarding, /value=\{physicalAddress\}/);
  assert.match(onboarding, /<StoreMapPicker/);
  assert.match(onboarding, /mapLatitude: storePin\?\.latitude \?\? null/);
  assert.match(onboarding, /mapLongitude: storePin\?\.longitude \?\? null/);
  assert.match(onboarding, /validMapPin\(storePin\)/);
  assert.match(contracts, /mapLatitude\?: number \| null/);
  assert.match(contracts, /mapLongitude\?: number \| null/);
  assert.match(routes, /mapLatitude: z\.number\(\)\.min\(-90\)\.max\(90\)/);
});

test("time range uses selectable half-hour slots and is shared with settings", () => {
  assert.match(hours, /length: 48/);
  assert.match(hours, /<SelectField/);
  assert.match(hours, /nextStart \+ " - " \+ nextEnd/);
  assert.match(onboarding, /<BusinessHoursRange/);
  assert.match(settings, /<BusinessHoursRange/);
  assert.match(settings, /mapLatitude: storePin\?\.latitude \?\? null/);
});

test("published store map uses persisted pin", () => {
  assert.match(store, /store\.mapLatitude !== null && store\.mapLongitude !== null/);
  assert.match(store, /<StoreMapPreview/);
  assert.match(store, /store\.physicalAddress/);
});

test("store failure diagnostics separate transport errors from HTTP failures", () => {
  assert.match(api, /public readonly httpStatus: number \| null = null/);
  assert.match(api, /new StoreApiError\(code, response\.status\)/);
  assert.match(onboarding, /seller\.onboarding\.networkError/);
  assert.match(onboarding, /seller\.onboarding\.serverError/);
  assert.match(provider, /const result = await listStores\(sessionToken\)/);
  assert.match(provider, /try \{ await refreshSession\(\); \} catch/);
  assert.match(routes, /reply\.log\.error\(\{ err: error \}/);
});

test("all required map/hour/error message keys exist in three localizations", () => {
  const keys = [...native.matchAll(/t\("(seller\.onboarding\.[^"]+)"\)/g),
    ...web.matchAll(/t\("(seller\.onboarding\.[^"]+)"\)/g),
    ...hours.matchAll(/t\("(seller\.onboarding\.[^"]+)"\)/g)].map(x => x[1]);
  for (const lng of ["en", "fa-AF", "ps-AF"]) {
    const locale = readFileSync("packages/localization/src/locales/" + lng + ".ts", "utf8");
    for (const key of [...new Set(keys), "seller.onboarding.networkError", "seller.onboarding.serverError"]) {
      assert.ok(locale.includes('"' + key + '":'), key + " not localized: " + lng);
    }
  }
});
