import {
  closeDatabaseClient, createDatabaseClient, parseDatabaseConfig,
  stores, users
} from "@bazaarlink/database";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

import { INTEGRATION_TEST_TIMEOUT_MS } from "../test/load-integration-env.js";
import { buildApp } from "../app.js";
import { parseAuthConfig } from "../auth/config.js";
import { DatabaseAuthRepository } from "../auth/repository.js";
import { AuthService } from "../auth/service.js";
import { DatabaseStoreRepository } from "../store/repository.js";
import { StoreService } from "../store/service.js";
import { DatabaseCatalogRepository } from "../catalog/repository.js";
import { CatalogService } from "../catalog/service.js";
import { DatabaseMarketplaceRepository } from "../marketplace/repository.js";
import { WishlistService } from "./service.js";
import { DatabaseWishlistRepository } from "./repository.js";

vi.setConfig({ testTimeout: INTEGRATION_TEST_TIMEOUT_MS });

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("database-backed customer wishlist", () => {
  const client = createDatabaseClient(parseDatabaseConfig());
  const auth = new AuthService(new DatabaseAuthRepository(client.db), parseAuthConfig());
  const store = new StoreService(new DatabaseStoreRepository(client.db));
  const catalog = new CatalogService(new DatabaseCatalogRepository(client.db));
  const marketplaceRepo = new DatabaseMarketplaceRepository(client.db);
  const app = buildApp({
    authService: auth,
    wishlistService: new WishlistService(
      new DatabaseWishlistRepository(client.db), marketplaceRepo
    )
  });
  const cleanup: string[] = [];

  afterAll(async () => {
    for (const userId of cleanup) {
      await client.db.delete(stores).where(eq(stores.ownerUserId, userId));
      await client.db.delete(users).where(eq(users.id, userId));
    }
    await app.close();
    await closeDatabaseClient(client);
  });

  it("saves only visible listings and isolates saved items by signed-in customer", async () => {
    const signup = async (prefix: string) => {
      const account = await auth.register({
        email: prefix + "-" + randomUUID() + "@example.com",
        password: "integration-password",
        displayName: prefix, preferredLocale: "fa-AF"
      });
      cleanup.push(account.user.id);
      return account;
    };
    const seller = await signup("seller");
    const buyer = await signup("buyer");
    const other = await signup("other");

    const shop = await store.createStore(seller.user.id, {
      name: "Saved Product Store", handle: "saved-" + randomUUID().slice(0,8),
      category: "Electronics", province: "Kabul", cityDistrict: "District 4",
      phone: "+93700000111", preferredLocale: "fa-AF"
    });
    const category = await catalog.createCategory(seller.user.id, shop.id, {
      name: "Phones", sortOrder: 0
    });
    const published = await catalog.createProduct(seller.user.id, shop.id, {
      name: "Saved Test Phone", categoryId: category.id,
      price: 1900, availableQuantity: 9
    });
    const draft = await catalog.createProduct(seller.user.id, shop.id, {
      name: "Hidden Phone", categoryId: category.id,
      price: 900, availableQuantity: 2
    });

    const authHeader = (token: string) => ({ authorization: "Bearer " + token });
    const endpoint = "/customer/wishlist/" + published.id;

    const denied = await app.inject({ method:"GET", url:"/customer/wishlist" });
    expect(denied.statusCode).toBe(401);
    const hidden = await app.inject({
      method:"PUT", url: "/customer/wishlist/" + draft.id,
      headers: authHeader(buyer.session.token)
    });
    expect(hidden.statusCode).toBe(404);

    await catalog.publishProduct(seller.user.id, shop.id, published.id);
    await store.publishStore(seller.user.id, shop.id);

    const add = await app.inject({
      method:"PUT", url:endpoint, headers:authHeader(buyer.session.token)
    });
    expect(add.statusCode).toBe(200);
    expect(add.json()).toEqual({ saved:true, productId: published.id });

    const again = await app.inject({
      method:"PUT", url:endpoint, headers:authHeader(buyer.session.token)
    });
    expect(again.statusCode).toBe(200);

    const mine = await app.inject({
      method:"GET", url:"/customer/wishlist", headers:authHeader(buyer.session.token)
    });
    expect(mine.statusCode).toBe(200);
    expect(mine.json().savedProductIds).toEqual([published.id]);
    expect(mine.json().products[0].name).toBe("Saved Test Phone");

    const others = await app.inject({
      method:"GET", url:"/customer/wishlist", headers:authHeader(other.session.token)
    });
    expect(others.json().products).toEqual([]);

    const otherRemove = await app.inject({
      method:"DELETE", url:endpoint, headers:authHeader(other.session.token)
    });
    expect(otherRemove.statusCode).toBe(200);
    const stillSaved = await app.inject({
      method:"GET", url:"/customer/wishlist", headers:authHeader(buyer.session.token)
    });
    expect(stillSaved.json().savedProductIds).toEqual([published.id]);

    const remove = await app.inject({
      method:"DELETE", url:endpoint, headers:authHeader(buyer.session.token)
    });
    expect(remove.statusCode).toBe(200);
    const empty = await app.inject({
      method:"GET", url:"/customer/wishlist", headers:authHeader(buyer.session.token)
    });
    expect(empty.json().products).toEqual([]);
  });
});
