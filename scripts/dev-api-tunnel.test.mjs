import assert from "node:assert/strict";
import { test } from "node:test";

import { findNgrokHttpsUrl, setMobileApiUrl } from "./lib/dev-api-tunnel.mjs";

test("selects only the HTTPS ngrok tunnel forwarding to port 4000", () => {
  const tunnels = { tunnels: [
    {public_url:"https://wrong.example.test", config:{addr:"http://localhost:3000"}},
    {public_url:"http://api.example.test", config:{addr:"http://localhost:4000"}},
    {public_url:"https://api.example.test", config:{addr:"http://localhost:4000"}}
  ]};
  assert.equal(findNgrokHttpsUrl(tunnels), "https://api.example.test");
  assert.equal(findNgrokHttpsUrl({ tunnels:[tunnels.tunnels[0]] }), null);
  assert.equal(findNgrokHttpsUrl(null), null);
});

test("supports ngrok inspector local address variants", () => {
  for (const addr of ["4000", "http://127.0.0.1:4000", "http://localhost:4000", "http://[::1]:4000"]) {
    assert.equal(findNgrokHttpsUrl({
      tunnels:[{public_url:"https://api.example.test",config:{addr}}]
    }), "https://api.example.test");
  }
});

test("keeps unrelated Expo env keys and removes duplicate API URLs", () => {
  const old = "# My mobile settings\r\nOTHER_FLAG=true\r\nEXPO_PUBLIC_API_URL=http://localhost:4000\r\nEXPO_PUBLIC_API_URL=http://old\r\n";
  const next = setMobileApiUrl(old, "https://new-api.example.test");
  assert.equal(next, "# My mobile settings\r\nOTHER_FLAG=true\r\nEXPO_PUBLIC_API_URL=https://new-api.example.test\r\n");
  assert.equal(setMobileApiUrl(next, "https://new-api.example.test"), next);
});

test("creates a missing API URL in a new or existing env file", () => {
  assert.equal(setMobileApiUrl("", "https://api.example.test"), "EXPO_PUBLIC_API_URL=https://api.example.test\n");
  assert.equal(setMobileApiUrl("OTHER_FLAG=1\n", "https://api.example.test"),
    "OTHER_FLAG=1\nEXPO_PUBLIC_API_URL=https://api.example.test\n");
});

test("refuses HTTP or malformed public URLs", () => {
  assert.throws(() => setMobileApiUrl("", "http://api.example.test"), /HTTPS/);
  assert.throws(() => setMobileApiUrl("", "https://api.example.test/path"), /HTTPS/);
  assert.equal(findNgrokHttpsUrl({ tunnels:[{
    public_url:"https://test.example/path",config:{addr:"http://localhost:4000"}
  }] }), "https://test.example");
});

import { resolveNgrokExecutable, parseNgrokMajorVersion, getSpawnSpec } from "./lib/ngrok-executable.mjs";
import { readFileSync } from "node:fs";

test("Windows launcher selects the same installed ngrok v3 WindowsApps CLI as PowerShell", () => {
  const correct = "C:\\Users\\DELL\\AppData\\Local\\Microsoft\\WindowsApps\\ngrok.exe";
  const seen = [];
  assert.equal(resolveNgrokExecutable({
    platform: "win32", localAppData: "C:\\Users\\DELL\\AppData\\Local",
    explicitBinary: "", exists: (path) => { seen.push(path); return path === correct; },
    lookup: () => ""
  }), correct);
  assert.deepEqual(seen, [correct]);
});

test("explicit ngrok executable takes priority and other platforms use PATH", () => {
  assert.equal(resolveNgrokExecutable({
    platform: "win32", localAppData: "C:\\Users\\DELL\\AppData\\Local",
    explicitBinary: "C:\\Tools\\ngrok.exe", exists: () => true, lookup: () => ""
  }), "C:\\Tools\\ngrok.exe");
  assert.equal(resolveNgrokExecutable({
    platform: "win32", localAppData: "C:\\Users\\DELL\\AppData\\Local",
    explicitBinary: "", exists: () => false, lookup: () => ""
  }), "ngrok");
  assert.equal(resolveNgrokExecutable({
    platform: "linux", explicitBinary: "", exists: () => true, lookup: () => ""
  }), "ngrok");
});

test("ngrok version diagnostics distinguish legacy CLI from v3", () => {
  assert.equal(parseNgrokMajorVersion("ngrok version 2.3.41"), 2);
  assert.equal(parseNgrokMajorVersion("ngrok version 3.39.9-msix-stable"), 3);
  assert.equal(parseNgrokMajorVersion("not a version"), null);
});

test("Windows ngrok executable is launched directly rather than via cmd PATH lookup", () => {
  const source = readFileSync("scripts/dev-api-with-ngrok.mjs", "utf8");
  assert.match(source, /getSpawnSpec\(name, args, process.platform\)/);
  assert.match(source, /start\(ngrokExecutable, \["http", String\(PORT\)\]\)/);
  assert.match(source, /resolveNgrokExecutable\(\)/);
});

test("Windows where.exe result resolves the WindowsApps alias even if existsSync fails", () => {
  const alias = "C:\\Users\\DELL\\AppData\\Local\\Microsoft\\WindowsApps\\ngrok.exe";
  const old = "C:\\projects\\bazaar\\node_modules\\.bin\\ngrok.exe";
  assert.equal(resolveNgrokExecutable({
    platform: "win32", localAppData: "C:\\Users\\DELL\\AppData\\Local",
    explicitBinary: "", exists: () => false,
    lookup: () => [old, alias].join(String.fromCharCode(13, 10))
  }), alias);
});

test("Windows spawn plan uses cmd.exe for pnpm but executes ngrok directly", () => {
  assert.deepEqual(getSpawnSpec("pnpm", ["--filter", "@bazaarlink/api", "dev"], "win32"), {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", "pnpm --filter @bazaarlink/api dev"]
  });
  assert.deepEqual(getSpawnSpec("ngrok", ["http", "4000"], "win32"), {
    command: "ngrok", args: ["http", "4000"]
  });
  const alias = "C:\\Users\\DELL\\AppData\\Local\\Microsoft\\WindowsApps\\ngrok.exe";
  assert.deepEqual(getSpawnSpec(alias, ["http", "4000"], "win32"), {
    command: alias, args: ["http", "4000"]
  });
});
