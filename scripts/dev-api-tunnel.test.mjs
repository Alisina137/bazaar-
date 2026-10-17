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
