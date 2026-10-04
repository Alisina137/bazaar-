import {
  closeDatabaseClient,
  createDatabaseClient,
  parseDatabaseConfig,
  stores,
  users
} from "@bazaarlink/database";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  afterAll,
  describe,
  expect,
  it
} from "vitest";

import { buildApp } from "../app.js";
import { parseAuthConfig } from "../auth/config.js";
import { DatabaseAuthRepository } from "../auth/repository.js";
import { AuthService } from "../auth/service.js";
import { DatabaseStoreRepository } from "./repository.js";
import { StoreService } from "./service.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("database-backed merchant store lifecycle", () => {
  const client = createDatabaseClient(parseDatabaseConfig());
  const authService = new AuthService(
    new DatabaseAuthRepository(client.db),
    parseAuthConfig()
  );
  const storeService = new StoreService(
    new DatabaseStoreRepository(client.db)
  );
  const app = buildApp({
    authService,
    storeService
  });

  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await client.db.delete(stores).where(eq(stores.ownerUserId, userId));
      await client.db.delete(users).where(eq(users.id, userId));
    }

    await app.close();
    await closeDatabaseClient(client);
  });

  it("creates a draft store, protects ownership, grants merchant role, and publishes publicly", async () => {
    const owner = await authService.register({
      email: "owner-" + randomUUID() + "@example.com",
      password: "merchant-password",
      displayName: "Owner",
      preferredLocale: "fa-AF"
    });

    const other = await authService.register({
      email: "other-" + randomUUID() + "@example.com",
      password: "merchant-password",
      displayName: "Other",
      preferredLocale: "en"
    });

    createdUserIds.push(owner.user.id, other.user.id);

    const handle = "store-" + randomUUID().slice(0, 8);

    const createResponse = await app.inject({
      method: "POST",
      url: "/seller/stores",
      headers: {
        authorization: "Bearer " + owner.session.token
      },
      payload: {
        name: "Integration Store",
        handle,
        category: "Electronics",
        province: "Kabul",
        cityDistrict: "Karte 4",
        phone: "+93700000000",
        preferredLocale: "fa-AF",
        description: "A real PostgreSQL-backed empty store."
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json();

    expect(created.status).toBe("draft");
    expect(created.subscription.plan).toBe("starter");
    expect(created.subscription.entitlements.productLimit).toBe(15);

    const refreshedOwner = await authService.authenticateToken(
      owner.session.token
    );
    expect(refreshedOwner.user.roles).toContain("merchant_owner");

    const forbiddenByOwnership = await app.inject({
      method: "GET",
      url: "/seller/stores/" + created.id,
      headers: {
        authorization: "Bearer " + other.session.token
      }
    });

    expect(forbiddenByOwnership.statusCode).toBe(404);
    expect(forbiddenByOwnership.json()).toEqual({
      error: {
        code: "store_not_found"
      }
    });

    const hiddenBeforePublish = await app.inject({
      method: "GET",
      url: "/stores/" + handle
    });
    expect(hiddenBeforePublish.statusCode).toBe(404);

    const publishResponse = await app.inject({
      method: "POST",
      url: "/seller/stores/" + created.id + "/publish",
      headers: {
        authorization: "Bearer " + owner.session.token
      }
    });

    expect(publishResponse.statusCode).toBe(200);
    expect(publishResponse.json()).toMatchObject({
      id: created.id,
      handle,
      status: "published"
    });

    const publicResponse = await app.inject({
      method: "GET",
      url: "/stores/" + handle
    });

    expect(publicResponse.statusCode).toBe(200);
    expect(publicResponse.json()).toMatchObject({
      name: "Integration Store",
      handle,
      status: "published"
    });
    expect(publicResponse.json()).not.toHaveProperty("ownerUserId");
    expect(publicResponse.json()).not.toHaveProperty("subscription");

    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/seller/stores",
      headers: {
        authorization: "Bearer " + other.session.token
      },
      payload: {
        name: "Duplicate Handle",
        handle,
        category: "Retail",
        province: "Kabul",
        cityDistrict: "Kabul",
        phone: "+93700000001",
        preferredLocale: "en"
      }
    });

    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toEqual({
      error: {
        code: "handle_in_use"
      }
    });
  });
});
