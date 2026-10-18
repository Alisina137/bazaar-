import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = file => readFileSync(file, "utf8");

test("Preferences is linked from signed-in Account and covers all four categories", () => {
  const account = read("apps/mobile/src/app/(tabs)/account.tsx");
  const screen = read("apps/mobile/src/app/account/preferences.tsx");
  assert.match(account, /router\.push\("\/account\/preferences"\)/);
  for(const phrase of ["LanguageSwitcher", "appearanceOptions", "AFGHAN_PROVINCES",
    "getDiscoveryProvince", "setDiscoveryProvince", "usePushNotifications",
    "push.enable", "push.disable", "account.preferences.pushUnavailable"]) {
    assert.ok(screen.includes(phrase), phrase);
  }
  assert.match(screen, /accessibilityRole="radio"/);
  assert.match(screen, /flexDirection: isRTL \? "row-reverse" : "row"/);
});

test("Appearance uses live device scheme or persisted explicit preference, no forced RTL reset", () => {
  const theme = read("apps/mobile/src/design/theme.tsx");
  assert.match(theme, /useColorScheme\(\)/);
  assert.match(theme, /bazaarlink\.appearance\.v1/);
  assert.match(theme, /appearance === "system" \? deviceScheme : appearance/);
  assert.match(theme, /userHasSelectedLocale|touched\.current/);
  assert.match(theme, /AsyncStorage\.setItem\(STORAGE_KEY, next\)/);
  assert.match(theme, /export function useAppearancePreference/);
});

test("Shopping region stays explicit, persists, and refreshes the Home screen after return", () => {
  const province = read("apps/mobile/src/marketplace/provinces.ts");
  const home = read("apps/mobile/src/app/(tabs)/index.tsx");
  assert.match(province, /No geolocation is inferred/);
  assert.match(province, /setDiscoveryProvince/);
  assert.match(home, /useFocusEffect\(useCallback\(\(\) => \{\n    let active = true;\n    void getDiscoveryProvince/);
});

test("Push setting actually removes the current account device token server-side", () => {
  const provider = read("apps/mobile/src/communication/push-provider.tsx");
  const api = read("apps/mobile/src/communication/api.ts");
  const routes = read("apps/api/src/communication/routes.ts");
  const repo = read("apps/api/src/communication/repository.ts");
  assert.match(provider, /await deactivatePushToken\(sessionToken, pushToken\)/);
  assert.match(provider, /bazaarlink\.push\.v1\./);
  assert.match(provider, /remotePushSupported/);
  assert.match(api, /"\/notifications\/push-token\/disable"/);
  assert.match(routes, /"\/notifications\/push-token\/disable"/);
  assert.match(routes, /authenticate\(request, authService\)/);
  assert.match(repo, /eq\(pushDeviceTokens\.userId, userId\)/);
  assert.match(repo, /eq\(pushDeviceTokens\.token, token\)/);
  assert.match(repo, /active: false/);
});

test("All labels are present in English, Dari, and Pashto", () => {
  const keys = ["title","menuHint","description","language","languageHint","appearance",
    "system","light","dark","appearanceHint","province","provinceHint",
    "allProvinces","pushTitle","pushHint","pushUnavailable","pushError","inbox","storageHint"];
  for (const locale of ["en","fa-AF","ps-AF"]) {
    const body = read("packages/localization/src/locales/" + locale + ".ts");
    for(const key of keys) assert.ok(body.includes('"account.preferences.'+key+'"'),locale+" missing "+key);
  }
});
