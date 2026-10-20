import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = path => readFileSync(path, "utf8");
const src = read("apps/mobile/src/communication/api.ts");
const notificationsPage = read("apps/mobile/src/app/notifications.tsx");
const platformList = read("apps/mobile/src/app/platform/support.tsx");
const platformTicket = read("apps/mobile/src/app/platform/support/[ticketId].tsx");
const backend = read("apps/api/src/communication/routes.ts");

function client(fetchImpl) {
  const code = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  runInNewContext(code, {
    exports,
    fetch: fetchImpl,
    AbortController: globalThis.AbortController,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    process: { env: { EXPO_PUBLIC_API_URL: "https://test.example.invalid" } }
  });
  return exports;
}

test("GET notifications has bearer token but no fake JSON body", async () => {
  const calls = [];
  const api = client(async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ notifications: [], unreadCount: 0 }) };
  });
  const result = await api.notifications("demo-token");
  assert.equal(result.unreadCount, 0);
  assert.equal(calls[0].url, "https://test.example.invalid/notifications");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.headers.authorization, "Bearer demo-token");
  assert.equal(calls[0].init.headers["content-type"], undefined);
});

test("bodyless POST mark-all and mark-one are accepted by strict Fastify parser", async () => {
  const calls = [];
  const api = client(async (_, init) => {
    const type = init.headers["content-type"];
    if (!init.body && type === "application/json") {
      throw new Error("FST_ERR_CTP_EMPTY_JSON_BODY");
    }
    calls.push(init);
    return { ok: true, status: 204, json: async () => { throw new Error("Should not parse 204"); } };
  });
  await api.markAllNotificationsRead("demo");
  await api.markNotificationRead("demo", "notification-1");
  await api.closeSupportTicket("demo", "ticket-1");
  assert.equal(calls.length, 3);
  assert.ok(calls.every(req => req.method === "POST" && !req.body && req.headers["content-type"] === undefined));
});

test("POST with JSON body keeps Content-Type and payload", async () => {
  const calls = [];
  const api = client(async (_, init) => {
    calls.push(init);
    return {
      ok: true, status: 201,
      json: async () => ({ id: "created" })
    };
  });
  await api.registerPushToken("demo", {
    token: "ExpoPushToken[1234567890123456789012345]", platform: "android"
  });
  await api.createSupportTicket("demo", {
    category: "other", subject: "Help", message: "Please assist"
  });
  assert.deepEqual(calls.map(x => x.method), ["POST", "POST"]);
  assert.ok(calls.every(req => req.headers["content-type"] === "application/json" && JSON.parse(req.body)));
});

test("service unavailable is a rejected typed API error, not a render-time failure", async () => {
  const api = client(async () => ({
    ok: false, status: 503,
    json: async () => ({ error: { code: "service_unavailable" } })
  }));
  await assert.rejects(api.notifications("demo"), e =>
    e.name === "CommunicationApiError" && e.code === "service_unavailable"
  );
});

test("notifications screen catches load/read/all-read requests and provides retry", () => {
  assert.match(notificationsPage, /try \{\s*const result = await notifications\(sessionToken\)/);
  assert.match(notificationsPage, /catch \(cause\) \{/);
  assert.match(notificationsPage, /setLoadError\(errorKey\(cause\)\)/);
  assert.match(notificationsPage, /await markNotificationRead\(sessionToken, item\.id\)/);
  assert.match(notificationsPage, /await markAllNotificationsRead\(sessionToken\)/);
  assert.match(notificationsPage, /setActionError\(errorKey\(cause\)\)/);
  assert.match(notificationsPage, /loadEpoch\.current \+= 1/);
  assert.match(notificationsPage, /kind="error"/);
  assert.match(notificationsPage, /"notification\.retry"/);
  assert.doesNotMatch(notificationsPage, /void markAllNotificationsRead\(sessionToken\)\.then\(load\)/);
});

test("platform support screen catches read and write failures rather than leaking promises", () => {
  assert.match(platformList, /try \{\s*setTickets\(\(await platformSupportTickets\(sessionToken\)\)\.tickets\)/);
  assert.match(platformList, /catch \(cause\) \{/);
  assert.match(platformTicket, /setLoadError\(communicationErrorKey\(/);
  assert.match(platformTicket, /\.catch\(cause => setError\(communicationErrorKey\(/);
  assert.match(platformTicket, /actionLabel=\{t\(loadError \? "notification\.retry"/);
  assert.match(backend, /app\.post\("\/notifications\/read-all"/);
});

test("retry and actionable notification errors are localized in English, Dari and Pashto", () => {
  const keys = [
    "notification.retry", "notification.error.serviceUnavailable",
    "notification.error.sessionExpired"
  ];
  for (const lang of ["en", "fa-AF", "ps-AF"]) {
    const text = read("packages/localization/src/locales/" + lang + ".ts");
    for (const key of keys) assert.ok(text.includes('"' + key + '":'), lang + " missing " + key);
  }
});
