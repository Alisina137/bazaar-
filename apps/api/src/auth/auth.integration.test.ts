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
  it,
  vi
} from "vitest";

import { INTEGRATION_TEST_TIMEOUT_MS } from "../test/load-integration-env.js";

import { parseAuthConfig } from "./config.js";
import { DatabaseAuthRepository } from "./repository.js";
import { AuthService } from "./service.js";
import { DatabaseAuthSecurityRepository } from "./security-repository.js";
import type { SecurityEmailSender } from "./security-email.js";

vi.setConfig({ testTimeout: INTEGRATION_TEST_TIMEOUT_MS });

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("database-backed authentication", () => {
  const client = createDatabaseClient(parseDatabaseConfig());
  const repository = new DatabaseAuthRepository(client.db);
  const outbound: Array<{ address: string; purpose: string; code: string }> = [];
  const sender: SecurityEmailSender = {
    configured: () => true,
    async send(address, purpose, code) {
      outbound.push({ address, purpose, code });
    }
  };
  const service = new AuthService(
    repository, parseAuthConfig(), new DatabaseAuthSecurityRepository(client.db), sender
  );
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

    const edited = await service.updateProfile(registered.session.token, {
      displayName: "Updated Integration User",
      phone: "+93 700 000111",
      avatarColor: "orange"
    });
    expect(edited.user.displayName).toBe("Updated Integration User");
    expect(edited.user.phone).toBe("+93 700 000111");
    expect(edited.user.email).toBe(email);
    expect(edited.user.avatarColor).toBe("orange");

    const persisted = await service.authenticateToken(registered.session.token);
    expect(persisted.user.displayName).toBe("Updated Integration User");
    expect(persisted.user.phone).toBe("+93 700 000111");
    expect(persisted.user.avatarColor).toBe("orange");

    const loggedIn = await service.login({
      email,
      password: "integration-password"
    });

    expect(loggedIn.user.id).toBe(registered.user.id);
    expect(loggedIn.user.roles).toEqual([
      "customer",
      "merchant_owner"
    ]);

    expect(loggedIn.user.emailVerified).toBe(false);
    await service.requestEmailVerification(registered.session.token);
    const verification = outbound.find((item) => item.purpose === "verify_email");
    expect(verification).toBeDefined();
    expect(verification?.address).toBe(email);
    await expect(
      service.finishEmailVerification(registered.session.token, "x".repeat(43))
    ).rejects.toMatchObject({ code: "invalid_token" });
    await service.finishEmailVerification(registered.session.token, verification!.code);
    await expect(
      service.finishEmailVerification(registered.session.token, verification!.code)
    ).rejects.toMatchObject({ code: "invalid_token" });
    const verified = await service.authenticateToken(registered.session.token);
    expect(verified.user.emailVerified).toBe(true);

    const active = await service.activeSessions(registered.session.token);
    expect(active.sessions.length).toBeGreaterThanOrEqual(2);
    expect(active.sessions.some((item) => item.current)).toBe(true);
    await service.revokeOtherSessions(registered.session.token);
    await expect(service.authenticateToken(loggedIn.session.token))
      .rejects.toMatchObject({ code: "invalid_session" });

    await expect(service.changePassword(
      registered.session.token, "wrong-password", "new-secure-password-123"
    )).rejects.toMatchObject({ code: "invalid_credentials" });
    await service.changePassword(
      registered.session.token, "integration-password", "new-secure-password-123"
    );
    await expect(service.login({ email, password: "integration-password" }))
      .rejects.toMatchObject({ code: "invalid_credentials" });
    const rotated = await service.login({ email, password: "new-secure-password-123" });
    await service.requestPasswordReset(email);
    await service.requestPasswordReset("unknown-" + randomUUID() + "@example.com");
    const reset = outbound.find((item) => item.purpose === "password_reset");
    expect(reset).toBeDefined();
    await service.finishPasswordReset(reset!.code, "recovered-password-123");
    await expect(service.authenticateToken(rotated.session.token))
      .rejects.toMatchObject({ code: "invalid_session" });
    await expect(service.finishPasswordReset(reset!.code, "nope-password-123"))
      .rejects.toMatchObject({ code: "invalid_token" });
    const recovered = await service.login({ email, password: "recovered-password-123" });
    await service.logout(recovered.session.token);

    await service.logout(loggedIn.session.token);

    await expect(
      service.authenticateToken(loggedIn.session.token)
    ).rejects.toMatchObject({
      code: "invalid_session",
      statusCode: 401
    });
  });
});
