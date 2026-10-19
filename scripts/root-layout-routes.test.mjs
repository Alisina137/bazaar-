import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("root Expo Router Stack discovers routes from the filesystem", () => {
  const source = readFileSync("apps/mobile/src/app/_layout.tsx", "utf8");
  assert.match(source, /<Stack\s+[\s\S]*?screenOptions=/);
  assert.doesNotMatch(source, /<Stack\.Screen\s+name=/);
  assert.match(source, /headerShown:\s*false/);
  assert.match(source, /backgroundColor:\s*theme\.colors\.background/);
});
