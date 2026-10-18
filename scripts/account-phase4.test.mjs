import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (file) => readFileSync(file, "utf8");

test("Account and guest screens have working security and password recovery routes", () => {
  const account = read("apps/mobile/src/app/(tabs)/account.tsx");
  const guest = read("apps/mobile/src/components/account/GuestAccountContent.tsx");
  assert.match(account, /router\.push\("\/account\/security"\)/);
  assert.match(guest, /router\.push\("\/account\/recover"\)/);
  for (const file of ["security.tsx", "recover.tsx"]) {
    assert.match(read("apps/mobile/src/app/account/" + file), /<Screen/);
  }
});

test("server validates and scopes security actions", () => {
  const routes = read("apps/api/src/auth/routes.ts");
  for (const path of [
    "/auth/password-reset/request", "/auth/password-reset/confirm",
    "/auth/email-verification/request", "/auth/email-verification/confirm",
    "/auth/change-password", "/auth/sessions",
    "/auth/sessions/revoke-others", "/auth/sessions/:id"
  ]) assert.ok(routes.includes('"'+path+'"'), path);
  assert.match(routes, /rateLimit/);
  assert.match(routes, /getBearerToken\(request\)/);
  assert.match(routes, /securityCodeSchema/);
  assert.match(routes, /newPassword: z\.string\(\)\.min\(8\)\.max\(128\)/);

  const repository = read("apps/api/src/auth/security-repository.ts");
  assert.match(repository, /eq\(authVerificationTokens\.purpose, "password_reset"\)/);
  assert.match(repository, /eq\(authVerificationTokens\.purpose, "verify_email"\)/);
  assert.match(repository, /isNull\(authVerificationTokens\.consumedAt\)/);
  assert.match(repository, /gt\(authVerificationTokens\.expiresAt, now\)/);
  assert.match(repository, /eq\(authSessions\.userId, userId\)/);
  assert.match(repository, /ne\(authSessions\.tokenHash, currentTokenHash\)/);
});

test("one-time tokens never appear in public app state or logs", () => {
  const service = read("apps/api/src/auth/service.ts");
  const mailer = read("apps/api/src/auth/security-email.ts");
  assert.match(service, /createSessionToken\(\)/);
  assert.match(service, /hashSessionToken\(code\)/);
  assert.match(mailer, /process\.env\.RESEND_API_KEY/);
  assert.match(mailer, /process\.env\.AUTH_EMAIL_FROM/);
  assert.doesNotMatch(mailer, /console\.(log|error)/);
  assert.doesNotMatch(read("apps/mobile/src/auth/api.ts"), /token: code/);
});

test("English, Dari and Pashto account security copy covers the complete flow", () => {
  const keys = [
    "title", "forgotPassword", "recoveryTitle", "sendRecovery",
    "recoverySent", "verificationCode", "newPassword", "changePassword",
    "emailVerified", "emailUnverified", "invalidCode", "sessionsHeading",
    "thisSession", "otherSession", "revokeOthers", "passwordChanged"
  ];
  for (const locale of ["en","fa-AF","ps-AF"]) {
    const src = read("packages/localization/src/locales/" + locale + ".ts");
    for (const key of keys) {
      assert.ok(src.includes('"account.security.'+key+'"'), locale+": "+key);
    }
  }
});
