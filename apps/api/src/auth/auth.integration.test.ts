import {
  closeDatabaseClient,
  createDatabaseClient,
  parseDatabaseConfig,
  userRoles,
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

import { parseAuthConfig } from "./config.js";
import { DatabaseAuthRepository } from "./repository.js";
import { AuthService } from "./service.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("database-backed authentication", () => {
  const client = createDatabaseClient(parseDatabaseConfig());
  const repository = new DatabaseAuthRepository(client.db);
  const service = new AuthService(repository, parseAuthConfig());
  let createdUserId: string | null = null;

  afterAll(async () => {
    if (createdUserId) {
      await client.db.delete(users).where(eq(users.id, createdUserId));
    }

    await closeDatabaseClient(client);
  });

  it("registers, restores roles, logs in, and revokes a real PostgreSQL session", async () => {
    const email = "auth-" + randomUUID() + "@example.com";

    const registered = await service.register({
      email,
      password: "integration-password",
      displayName: "Integration User",
      preferredLocale: "fa-AF"
    });

    createdUserId = registered.user.id;

    expect(registered.user.roles).toEqual(["customer"]);
    expect(registered.session.token).toBeTruthy();

    const restored = await service.authenticateToken(
      registered.session.token
    );

    expect(restored.user.id).toBe(registered.user.id);
    expect(restored.user.roles).toEqual(["customer"]);

    await client.db.insert(userRoles).values({
      userId: registered.user.id,
      role: "merchant_owner"
    });

    const merchantSession = await service.authenticateToken(
      registered.session.token
    );

    expect(merchantSession.user.roles).toEqual([
      "customer",
      "merchant_owner"
    ]);

    const loggedIn = await service.login({
      email,
      password: "integration-password"
    });

    expect(loggedIn.user.id).toBe(registered.user.id);
    expect(loggedIn.user.roles).toEqual([
      "customer",
      "merchant_owner"
    ]);

    await service.logout(loggedIn.session.token);

    await expect(
      service.authenticateToken(loggedIn.session.token)
    ).rejects.toMatchObject({
      code: "invalid_session",
      statusCode: 401
    });
  });
});
