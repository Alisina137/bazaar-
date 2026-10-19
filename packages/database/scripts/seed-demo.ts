import { createHash } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { closeDatabaseClient, createDatabaseClient } from "../src/client.js";
import { parseDatabaseConfig } from "../src/env.js";
import {
  users, userRoles, stores, storeSubscriptions, platformCategories, categories,
  products, carts, cartItems, customerAddresses, customerWishlist,
  notifications, supportTickets, storeCoupons
} from "../src/schema/index.js";

loadEnv({ path: resolve(process.cwd(), "../../.env"), quiet: true });

if (process.env.NODE_ENV === "production" || process.env.BAZAAR_DEMO_SEED !== "YES") {
  throw new Error("Development-only seed: set BAZAAR_DEMO_SEED=YES and ensure NODE_ENV is not production.");
}
const url = process.env.DATABASE_URL ?? "";
const host = new URL(url).hostname.toLowerCase();
if (!["localhost", "127.0.0.1", "::1"].includes(host) &&
    process.env.BAZAAR_DEMO_REMOTE_DB !== "YES") {
  throw new Error("Remote database blocked. Set BAZAAR_DEMO_REMOTE_DB=YES only for an isolated development database.");
}

function id(key: string) {
  const hex = createHash("sha256").update("bazaarlink-demo-v1:" + key).digest("hex").slice(0, 32);
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-4" + hex.slice(13, 16) +
    "-8" + hex.slice(17, 20) + "-" + hex.slice(20, 32);
}

const people = ["Ahmad Rahimi", "Laila Ahmadi", "Farid Noori"];
const locations = [
  { province: "Kabul", district: "Shahr-e Naw" },
  { province: "Herat", district: "City Center" },
  { province: "Balkh", district: "Mazar-e Sharif" }
];
const groups = [
  { slug: "demo-electronics", en: "Demo Electronics", fa: "الکترونیک آزمایشی", ps: "ازمایښتي برېښنايي توکي", store: "Kabul Tech Demo", category: "Electronics", products: ["Wireless Headphones", "Power Bank", "USB-C Charger"] },
  { slug: "demo-fashion", en: "Demo Fashion", fa: "پوشاک آزمایشی", ps: "ازمایښتي جامې", store: "Herat Style Demo", category: "Fashion", products: ["Cotton Shirt", "Winter Jacket", "Canvas Backpack"] },
  { slug: "demo-home", en: "Demo Home", fa: "خانه آزمایشی", ps: "ازمایښتي کورني توکي", store: "Balkh Home Demo", category: "Home", products: ["Table Lamp", "Ceramic Mug", "Desk Organizer"] }
];

const client = createDatabaseClient(parseDatabaseConfig());
try {
  await client.db.transaction(async tx => {
    for (let i = 0; i < 3; i++) {
      const userId = id("user:" + i);
      const storeId = id("store:" + i);
      const categoryId = id("category:" + i);
      const platformId = id("platform:" + i);
      const cartId = id("cart:" + i);
      const group = groups[i]!;
      const location = locations[i]!;
      await tx.insert(users).values({ id: userId, displayName: "[DEMO] " + people[i], preferredLocale: "fa-AF" }).onConflictDoNothing();
      await tx.insert(userRoles).values([{ userId, role: "customer" }, { userId, role: "merchant_owner" }]).onConflictDoNothing();
      await tx.insert(stores).values({
        id: storeId, ownerUserId: userId, name: "[DEMO] " + group.store,
        handle: "bazaar-demo-" + (i + 1), category: group.category,
        province: location.province, cityDistrict: location.district,
        phone: "0000000000", status: "published", publishedAt: new Date(),
        description: "Development-only sample store; not a real merchant.",
        accentColor: "#0369A1"
      }).onConflictDoNothing();
      await tx.insert(storeSubscriptions).values({ id: id("subscription:" + i), storeId, plan: "business", status: "active" }).onConflictDoNothing();
      await tx.insert(platformCategories).values({
        id: platformId, slug: group.slug, nameEn: group.en,
        nameFa: group.fa, namePs: group.ps, active: true, sortOrder: i
      }).onConflictDoNothing();
      await tx.insert(categories).values({
        id: categoryId, storeId, name: "[DEMO] " + group.category, status: "active"
      }).onConflictDoNothing();
      await tx.insert(carts).values({ id: cartId, userId }).onConflictDoNothing();
      await tx.insert(customerAddresses).values({
        id: id("address:" + i), userId, recipientName: "[DEMO] " + people[i],
        province: location.province, districtCity: location.district,
        addressDescription: "Demo-only address — no real deliveries",
        phone: "0000000000", isDefault: true
      }).onConflictDoNothing();
      await tx.insert(notifications).values({
        id: id("notification:" + i), userId, type: "support_reply",
        eventKey: "demo-seed-v1-" + i, data: { demo: true },
        deepLink: "/notifications"
      }).onConflictDoNothing();
      await tx.insert(supportTickets).values({
        id: id("ticket:" + i), userId, category: (["product", "delivery", "account"] as const)[i]!,
        subject: "[DEMO] Sample support request " + (i + 1),
        status: (["open", "waiting_support", "closed"] as const)[i]!
      }).onConflictDoNothing();
      await tx.insert(storeCoupons).values({
        id: id("coupon:" + i), storeId, code: "DEMO" + (i + 1),
        type: "percentage", value: String(5 * (i + 1)), active: true
      }).onConflictDoNothing();
      for (let j = 0; j < 3; j++) {
        const productId = id("product:" + i + ":" + j);
        const price = 350 + i * 400 + j * 250;
        await tx.insert(products).values({
          id: productId, storeId, categoryId, marketplaceCategoryId: platformId,
          name: "[DEMO] " + group.products[j], description: "Test product. Not for real purchase.",
          price: String(price), compareAtPrice: String(price + 150),
          status: "active", availableQuantity: 20 + j * 5,
          publishedAt: new Date(), sku: "DEMO-" + i + "-" + j,
          tags: ["demo", "testing"]
        }).onConflictDoNothing();
        await tx.insert(customerWishlist).values({ userId, productId }).onConflictDoNothing();
        await tx.insert(cartItems).values({
          id: id("cart-item:" + i + ":" + j), cartId, productId,
          quantity: 1, unitPriceSnapshot: String(price),
          compareAtPriceSnapshot: String(price + 150)
        }).onConflictDoNothing();
      }
    }
  });
  process.stdout.write("Demo seed completed: 3 users, 3 stores, 3 platform categories, 3 store categories, 9 products, 3 carts with 3 items each, 3 addresses, 9 wishlist items, 3 notifications, 3 support tickets and 3 coupons. No login credentials or real orders were created.\n");
} finally {
  await closeDatabaseClient(client);
}
