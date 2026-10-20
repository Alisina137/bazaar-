import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(path, "utf8");
const skeleton = read("apps/mobile/src/components/ui/LoadingSkeleton.tsx");
const state = read("apps/mobile/src/components/ui/StateView.tsx");
const home = read("apps/mobile/src/components/marketplace/HomeLoadingSkeleton.tsx");
const marketplace = read("apps/mobile/src/components/marketplace/MarketplaceDiscoverySkeleton.tsx");
const cart = read("apps/mobile/src/app/(tabs)/cart.tsx");
const orders = read("apps/mobile/src/app/(tabs)/orders.tsx");
const product = read("apps/mobile/src/app/marketplace/product/[productId].tsx");

test("shared skeleton implements page-shaped list, cart, orders, product, store and grid layouts", () => {
  for (const variant of ["list", "cart", "orders", "product", "store", "grid", "form", "dashboard"]) {
    assert.ok(skeleton.includes('case "' + variant + '"') || variant === "list", "Missing variant " + variant);
  }
  assert.match(skeleton, /accessibilityRole="progressbar"/);
  assert.match(skeleton, /accessibilityLabel=\{label\}/);
  assert.match(skeleton, /theme\.colors\.surfaceMuted/);
  assert.match(skeleton, /isRTL \? "row-reverse" : "row"/);
});

test("skeleton pulse is a single native-driven group animation with reduced-motion support", () => {
  assert.match(skeleton, /AccessibilityInfo\.isReduceMotionEnabled\(\)/);
  assert.match(skeleton, /if \(!active \|\| reduced\) return/);
  assert.match(skeleton, /Animated\.loop\(Animated\.sequence/);
  assert.match(skeleton, /useNativeDriver: true/);
  assert.match(skeleton, /loop\?\.stop\(\)/);
  assert.match(skeleton, /<SkeletonPulse>/);
  assert.match(home, /<SkeletonPulse>/);
  assert.match(marketplace, /<SkeletonPulse>/);
});

test("all existing generic loading states show skeletons but errors and empty screens remain unchanged", () => {
  assert.match(state, /if \(kind === "loading"\)/);
  assert.match(state, /<LoadingSkeleton variant=\{loadingVariant\} label=\{title\}/);
  assert.match(state, /accessibilityRole=\{kind === "error" \? "alert"/);
  assert.match(state, /kind === "error" \? "primary" : "secondary"/);
  assert.match(state, /loadingVariant = "list"/);
});

test("important screens show appropriate skeletons before first data arrives", () => {
  const screens = [
    ["apps/mobile/src/app/(tabs)/cart.tsx", "cart"],
    ["apps/mobile/src/app/(tabs)/orders.tsx", "orders"],
    ["apps/mobile/src/app/marketplace/product/[productId].tsx", "product"],
    ["apps/mobile/src/app/marketplace/store/[handle].tsx", "store"],
    ["apps/mobile/src/app/checkout/index.tsx", "cart"],
    ["apps/mobile/src/app/account/wishlist.tsx", "grid"],
    ["apps/mobile/src/app/seller/(tabs)/products.tsx", "grid"],
    ["apps/mobile/src/app/seller/(tabs)/orders.tsx", "orders"],
    ["apps/mobile/src/app/seller/onboarding.tsx", "form"],
    ["apps/mobile/src/app/notifications.tsx", "list"],
    ["apps/mobile/src/app/support/index.tsx", "list"],
    ["apps/mobile/src/app/orders/[orderId].tsx", "orders"],
    ["apps/mobile/src/app/seller/inventory.tsx", "list"],
    ["apps/mobile/src/app/seller/delivery.tsx", "form"]
  ];
  for (const [path, variant] of screens) {
    assert.ok(read(path).includes('loadingVariant="' + variant + '"'), path + " missing skeleton " + variant);
  }
  assert.match(cart, /loading && !visibleCart/);
  assert.match(orders, /loading && currentOrders\.length === 0/);
  assert.match(product, /loading && !data/);
});

test("loading skeleton is a UI-only improvement with no API calls, polling, or blocking screen overlays", () => {
  assert.doesNotMatch(skeleton, /fetch\(|setInterval|<Modal|Alert\./);
  assert.match(state, /<ActivityIndicator/);
  assert.match(skeleton, /SkeletonCard type="merchant"/);
  assert.match(skeleton, /SkeletonCard type="summary"/);
});
