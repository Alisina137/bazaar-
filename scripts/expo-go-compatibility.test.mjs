import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const push = readFileSync("apps/mobile/src/communication/push-provider.tsx", "utf8");
const center = readFileSync("apps/mobile/src/app/notifications.tsx", "utf8");
const layout = readFileSync("apps/mobile/src/app/_layout.tsx", "utf8");

test("Expo Go never evaluates expo-notifications at module import time", () => {
  assert.doesNotMatch(push, /^import\s+\*?\s*(?:as\s+)?Notifications\s+from\s+["']expo-notifications["']/m);
  assert.doesNotMatch(push, /^import\s+["']expo-notifications["']/m);
  assert.match(push, /Constants\.appOwnership !== "expo"/);
  assert.match(push, /Constants\.expoGoConfig == null/);
  assert.match(push, /Platform\.OS !== "web"/);
  assert.match(push, /if \(!remotePushSupported\) return Promise\.resolve\(null\);/);
  assert.match(push, /notificationsPromise = import\("expo-notifications"\)/);
});

test("Expo Go never subscribes to remote notification handlers on mount", () => {
  assert.match(push, /if \(!remotePushSupported\) return;/);
  assert.match(push, /remotePushSupported \? "idle" : "unavailable"/);
  assert.match(push, /if \(!remotePushSupported \|\|/);
  assert.match(push, /return \(\) => \{/);
  assert.match(push, /subscription\?\.remove\(\)/);
});

test("in-app notification center and deep-link handling remain wired", () => {
  assert.match(layout, /<NotificationProvider>/);
  assert.match(center, /notifications\(sessionToken\)/);
  assert.match(center, /markNotificationRead\(sessionToken/);
  assert.match(center, /markAllNotificationsRead\(sessionToken\)/);
  assert.match(push, /addNotificationResponseReceivedListener/);
  assert.match(push, /registerPushToken\(sessionToken/);
});
