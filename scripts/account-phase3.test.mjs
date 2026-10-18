import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("profile route offers authenticated personal information with real save", () => {
  const account = read("apps/mobile/src/app/(tabs)/account.tsx");
  const profile = read("apps/mobile/src/app/account/profile.tsx");
  assert.match(account, /router\.push\("\/account\/profile"\)/);
  assert.match(account, /<ProfileAvatar/);
  assert.match(profile, /updateProfile\(\{/);
  assert.match(profile, /displayName: safeName \|\| null/);
  assert.match(profile, /phone: safePhone \|\| null/);
  assert.match(profile, /avatarColor/);
  assert.match(profile, /user\.email/);
  assert.doesNotMatch(profile, /email: safeEmail|updateEmail\(/);
  assert.match(profile, /status !== "signedIn" \|\| !user/);
});

test("server owns profile fields; never accepts email or privileged roles", () => {
  const route = read("apps/api/src/auth/routes.ts");
  assert.match(route, /app\.patch\("\/auth\/profile"/);
  assert.match(route, /getBearerToken\(request\)/);
  assert.match(route, /const profileSchema = z\.object/);
  assert.match(route, /avatarColor: z\.enum/);
  assert.match(route, /\}\)\.strict\(\)/);
  const repository = read("apps/api/src/auth/repository.ts");
  assert.match(repository, /eq\(users\.id, userId\)/);
  assert.match(repository, /avatarColor: input\.avatarColor/);
  assert.match(repository, /phone: input\.phone/);
  assert.doesNotMatch(repository, /identifier: input\.email/);
});

test("profile persists in one additive numbered database migration", () => {
  const sql = read("packages/database/drizzle/0014_customer_profile.sql");
  const schema = read("packages/database/src/schema/auth.ts");
  const snapshot = JSON.parse(read("packages/database/drizzle/meta/0014_snapshot.json"));
  const journal = JSON.parse(read("packages/database/drizzle/meta/_journal.json"));
  assert.match(sql, /ADD COLUMN "phone"/);
  assert.match(sql, /ADD COLUMN "avatar_color"/);
  assert.match(schema, /phone: varchar\("phone", \{ length: 24 \}\)/);
  assert.match(schema, /avatarColor: varchar\("avatar_color", \{ length: 16 \}\)/);
  assert.equal(snapshot.tables["public.users"].columns.phone.type, "varchar(24)");
  assert.equal(snapshot.tables["public.users"].columns.avatar_color.default, "'teal'");
  assert.equal(journal.entries.at(-1).tag, "0014_customer_profile");
});

test("saved account profile updates context; no email-change without verification", () => {
  const provider = read("apps/mobile/src/auth/provider.tsx");
  const api = read("apps/mobile/src/auth/api.ts");
  assert.match(api, /requestJson<AuthProfileResponse>\("\/auth\/profile"/);
  assert.match(provider, /setUser\(\(current\) =>/);
  assert.match(provider, /current\?\.id === response\.user\.id/);
  const profile = read("apps/mobile/src/app/account/profile.tsx");
  assert.match(profile, /forceLTR/);
  assert.match(profile, /account\.profile\.emailLocked/);
});

test("new profile content is localized in English Dari and Pashto", () => {
  for (const lang of ["en", "fa-AF", "ps-AF"]) {
    const body = read("packages/localization/src/locales/" + lang + ".ts");
    for (const k of [
      "title", "description", "menuHint", "edit", "avatar", "avatarHint",
      "name", "phone", "phoneHint", "phoneInvalid", "nameInvalid",
      "emailUnavailable", "emailLocked", "saved", "save",
      "avatar.teal", "avatar.blue", "avatar.purple", "avatar.orange"
    ]) {
      assert.ok(body.includes('"account.profile.' + k + '"'), lang + " missing " + k);
    }
  }
});
