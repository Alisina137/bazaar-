import process from "node:process";
import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
function source(file){return readFileSync(file,"utf8");}
function assertMarkers(file,markers) {
  const text=source(file);
  for(const marker of markers) assert.ok(text.includes(marker),file+": missing "+marker);
}
for(const root of [
  "apps/mobile/src/app/(tabs)/_layout.tsx",
  "apps/mobile/src/app/seller/(tabs)/_layout.tsx"
]) assertMarkers(root,["tabBarAccessibilityLabel:","isRTL ? [...screens].reverse() : screens"]);
assertMarkers("apps/mobile/src/components/ui/TextField.tsx",[
  "accessibilityLabel={accessibilityLabel ?? label}",
  "accessibilityHint={error ?? helperText ?? props.accessibilityHint}",
  'textAlign: isRTL ? "right" : "left"',
  "writingDirection: direction"
]);
assertMarkers("apps/mobile/src/components/ui/Button.tsx",[
  'accessibilityRole="button"',
  "accessibilityState={{ disabled: isDisabled, busy: loading }}",
  "Math.max(48, theme.sizes.controlHeight)"
]);
assertMarkers("apps/mobile/src/localization/provider.tsx",[
  "getDirection(locale)",
  "formatAfnValue",
  "formatNumberValue"
]);
assertMarkers("apps/mobile/src/components/ui/StateView.tsx",[
  'accessibilityRole={kind === "error" ? "alert" : undefined}'
]);
assertMarkers("apps/mobile/src/marketplace/cache.ts",[
  "MAX_STALE_MS",
  "CACHE_TTL_MS",
  "MAX_CLOCK_SKEW_MS"
]);
for (const lang of ["fa-AF","ps-AF","en"]) {
  const file="packages/localization/src/locales/"+lang+".ts";
  assert.ok(source(file).length>1000,file+": missing locale dictionary");
}
const mobile=JSON.parse(source("apps/mobile/app.json"));
const build=JSON.parse(source("apps/mobile/eas.json"));
assert.ok(mobile.expo.android.package && /^([a-z][a-z0-9_]*\.)+[a-z][a-z0-9_]*$/i.test(mobile.expo.android.package));
assert.equal(build.build.preview.android.buildType,"apk");
assert.equal(build.build.production.android.buildType,"app-bundle");
process.stdout.write("Phase 12 mobile RTL, accessibility, offline cache and EAS profile invariants passed.\n");
