import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(path, "utf8");

function validator() {
  const source = read("apps/mobile/src/account/auth-validation.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports });
  return exports.validateAuthForm;
}

const valid = {
  email: " buyer@example.com ",
  password: "Password123",
  displayName: "Ali",
  confirmPassword: "Password123"
};

test("login validation trims email and never applies registration-only rules", () => {
  const validate = validator();
  assert.deepEqual(Object.keys(validate("login", valid)), []);
  assert.deepEqual(Object.keys(validate("login", { ...valid, confirmPassword: "nope" })), []);
  assert.equal(validate("login", { ...valid, email: " " }).email, "emailRequired");
  assert.equal(validate("login", { ...valid, email: "bad@input" }).email, "emailInvalid");
  assert.equal(validate("login", { ...valid, password: "" }).password, "passwordRequired");
  assert.equal(validate("login", { ...valid, password: "p" }).password, undefined);
  assert.equal(validate("login", { ...valid, password: "a".repeat(129) }).password, "passwordTooLong");
});

test("registration checks password, confirmation and optional display name", () => {
  const validate = validator();
  assert.deepEqual(Object.keys(validate("register", valid)), []);
  assert.equal(validate("register", { ...valid, password: "1234", confirmPassword: "1234" }).password, "passwordTooShort");
  assert.equal(validate("register", { ...valid, confirmPassword: "" }).confirmPassword, "confirmationRequired");
  assert.equal(validate("register", { ...valid, confirmPassword: "wrong" }).confirmPassword, "confirmationMismatch");
  assert.equal(validate("register", { ...valid, displayName: "a".repeat(161) }).displayName, "nameTooLong");
  assert.equal(validate("register", { ...valid, displayName: "" }).displayName, undefined);
});

test("account uses real auth endpoints with safe state and submits only valid data", () => {
  const guest = read("apps/mobile/src/components/account/GuestAccountContent.tsx");
  const account = read("apps/mobile/src/app/(tabs)/account.tsx");
  assert.match(account, /<GuestAccountContent \/>/);
  assert.match(account, /logout\(\)/);
  assert.match(guest, /validateAuthForm\(mode, values\)/);
  assert.match(guest, /submitting\.current/);
  assert.match(guest, /if \(Object\.keys\(problems\)\.length > 0\)/);
  assert.match(guest, /await login\(\{ email: values\.email\.trim\(\), password: values\.password \}\)/);
  assert.match(guest, /await register\(\{/);
  assert.match(guest, /preferredLocale: locale/);
  assert.match(guest, /setValues\(\(current\) => \(\{ \.\.\.current, password: "", confirmPassword: "" \}\)\)/);
  assert.match(guest, /getAuthErrorCode\(error\)/);
  assert.doesNotMatch(guest, /\/auth\/forgot|\/auth\/reset/);
});

test("guest experience has a working language switch, guest shopping and accessible controls", () => {
  const guest = read("apps/mobile/src/components/account/GuestAccountContent.tsx");
  assert.match(guest, /<LanguageSwitcher compact \/>/);
  assert.match(guest, /router\.push\("\/\(tabs\)\/marketplace"\)/);
  assert.match(guest, /accessibilityRole="tab"/);
  assert.match(guest, /accessibilityState=\{\{ selected: active, disabled: busy \}\}/);
  assert.match(guest, /accessibilityLabel=\{t\(passwordVisible \?/);
  assert.match(guest, /secureTextEntry=\{!passwordVisible\}/);
  assert.match(guest, /forceLTR/);
  assert.match(guest, /returnKeyType="next"/);
  assert.match(guest, /onSubmitEditing=\{\(\) => void submit\(\)\}/);
});

test("new auth copy is translated in English, Dari and Pashto", () => {
  const keys = [
    "account.auth.guestIntro", "account.auth.showPassword", "account.auth.hidePassword",
    "account.auth.confirmPassword", "account.auth.continueShopping",
    "account.auth.emailRequired", "account.auth.emailInvalid",
    "account.auth.passwordRequired", "account.auth.passwordTooShort", "account.auth.passwordTooLong",
    "account.auth.nameTooLong", "account.auth.confirmationRequired", "account.auth.confirmationMismatch"
  ];
  for(const locale of ["en","fa-AF","ps-AF"]){
    const content=read("packages/localization/src/locales/"+locale+".ts");
    for(const key of keys)assert.ok(content.includes('"'+key+'"'),locale+" missing "+key);
  }
});
