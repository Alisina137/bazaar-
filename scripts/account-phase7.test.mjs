import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(path, "utf8");

test("Account leads directly to FAQ and the real support ticket hub", () => {
  const account = read("apps/mobile/src/app/(tabs)/account.tsx");
  assert.match(account, /router\.push\("\/support\/faq"\)/);
  assert.match(account, /router\.push\("\/support"\)/);
  const hub = read("apps/mobile/src/app/support/index.tsx");
  assert.match(hub, /router\.push\("\/support\/faq"\)/);
  assert.match(hub, /status !== "signedIn"/);
  assert.match(hub, /router\.push\("\/\(tabs\)\/account"\)/);
});

test("Help FAQ has search, accessible accordions and organized real content", () => {
  const faq = read("apps/mobile/src/app/support/faq.tsx");
  assert.match(faq, /entries\.filter\(/);
  assert.match(faq, /toLocaleLowerCase/);
  assert.match(faq, /const groups: FaqGroup\[\] =/);
  assert.match(faq, /accessibilityState=\{\{ expanded: open \}\}/);
  assert.match(faq, /setExpanded\(open \? null : item\.id\)/);
  assert.match(faq, /support\.hub\.noLiveChat/);
  for (const topic of ["tracking", "payment", "delivery", "returns", "wishlist",
    "province", "password", "notifications", "seller"]) {
    assert.ok(faq.includes('"support.faq.' + topic + '.q"'), topic);
  }
});

test("Support hub preserves context, validates form and allows ticket search and filters", () => {
  const hub = read("apps/mobile/src/app/support/index.tsx");
  assert.match(hub, /useLocalSearchParams/);
  assert.match(hub, /\.\.\.\(orderId \? \{ orderId \} : \{\}\)/);
  assert.match(hub, /\.\.\.\(storeId \? \{ storeId \} : \{\}\)/);
  assert.match(hub, /cleanSubject\.length < 3/);
  assert.match(hub, /cleanMessage\.length < 2/);
  assert.match(hub, /createSupportTicket\(sessionToken/);
  assert.match(hub, /params: \{ ticketId: created\.id \}/);
  assert.match(hub, /useFocusEffect/);
  assert.match(hub, /supportTickets\(sessionToken\)/);
  assert.match(hub, /setListError/);
  assert.match(hub, /setReload\(value => value \+ 1\)/);
  assert.match(hub, /ticket\.status === "waiting_customer"/);
});

test("Ticket page catches API failures and confirms irreversible close", () => {
  const detail = read("apps/mobile/src/app/support/[ticketId].tsx");
  assert.match(detail, /Alert\.alert\(/);
  assert.match(detail, /style: "destructive"/);
  assert.match(detail, /closeSupportTicket\(sessionToken, ticketId\)/);
  assert.match(detail, /replySupportTicket\(sessionToken, ticketId, text\)/);
  assert.match(detail, /support\.hub\.conversation/);
  assert.match(detail, /sort\(\(a, b\) => Date\.parse/);
  assert.match(detail, /entry\.authorKind === "platform"/);
  assert.match(detail, /support\.hub\.closedTitle/);
  assert.match(detail, /communicationErrorKey\(/);
  assert.match(detail, /useFocusEffect/);
});

test("FAQ and hub copy translated into English, Dari and Pashto", () => {
  const english = read("packages/localization/src/locales/en.ts");
  const keys = [...english.matchAll(/"(support\.(?:hub|faq)\.[^"]+)":/g)].map(x => x[1]);
  assert.ok(keys.length >= 60, "expected FAQ and hub translations");
  for (const locale of ["en","fa-AF","ps-AF"]) {
    const content = read("packages/localization/src/locales/" + locale + ".ts");
    for (const key of keys) {
      assert.ok(content.includes('"' + key + '"'), locale + " missing " + key);
    }
  }
});
