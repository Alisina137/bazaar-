import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const client = readFileSync("apps/admin/app/page.tsx", "utf8");
const session = readFileSync("apps/admin/app/api/session/route.ts", "utf8");

test("admin sign-in identifies credentials for the browser password manager", () => {
  assert.match(client, /name="email" type="email" autoComplete="username"/);
  assert.match(client, /name="password" type="password" autoComplete="current-password"/);
});

test("admin remembers only the email and can remove it", () => {
  assert.match(client, /localStorage\.setItem\("bazaarlink_admin_email",normalizedEmail\)/);
  assert.match(client, /localStorage\.removeItem\("bazaarlink_admin_email"\)/);
  assert.match(client, /Remember my email on this device/);
  assert.doesNotMatch(client, /localStorage\.setItem\([^\n]*(password|token)/i);
});

test("platform uses HttpOnly and SameSite strict cookie", () => {
  assert.match(session, /cookieName = "bazaar_platform_session"/);
  assert.match(session, /httpOnly:true,secure:process\.env\.NODE_ENV==="production",sameSite:"strict"/);
});
