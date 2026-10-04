import type { AuthUser } from "@bazaarlink/contracts";
import { beforeAll, describe, expect, it } from "vitest";

import type { AuthConfig } from "./config.js";
import { AuthError } from "./errors.js";
import { hashPassword } from "./password.js";
import type {
  AuthRepository,
  EmailIdentity,
  SessionIdentity
} from "./repository.js";
import { AuthService } from "./service.js";
import { hashSessionToken } from "./token.js";

const config: AuthConfig = {
  sessionTtlDays: 30,
  sessionTouchIntervalMinutes: 5
};

const user: AuthUser = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "Test User",
  preferredLocale: "fa-AF",
  status: "active"
};

class FakeAuthRepository implements AuthRepository {
  identity: EmailIdentity | null = null;
  session: SessionIdentity | null = null;
  createdTokenHash: string | null = null;
  revokedTokenHash: string | null = null;
  touchedSessionId: string | null = null;

  async findEmailIdentity(): Promise<EmailIdentity | null> {
    return this.identity;
  }

  async createEmailIdentity(): Promise<AuthUser> {
    return user;
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    this.createdTokenHash = input.tokenHash;
    this.session = {
      sessionId: "00000000-0000-4000-8000-000000000002",
      user,
      expiresAt: input.expiresAt,
      lastSeenAt: new Date(),
      revokedAt: null
    };
  }

  async findSession(): Promise<SessionIdentity | null> {
    return this.session;
  }

  async revokeSession(tokenHash: string): Promise<void> {
    this.revokedTokenHash = tokenHash;
  }

  async touchSession(sessionId: string): Promise<void> {
    this.touchedSessionId = sessionId;
  }
}

let passwordHash = "";

beforeAll(async () => {
  passwordHash = await hashPassword("correct-password");
});

describe("AuthService", () => {
  it("normalizes email and stores only a session-token hash", async () => {
    const repository = new FakeAuthRepository();
    const service = new AuthService(repository, config);

    const result = await service.register({
      email: "  PERSON@Example.COM ",
      password: "correct-password",
      displayName: "Test User",
      preferredLocale: "fa-AF"
    });

    expect(result.user).toEqual(user);
    expect(result.session.token.length).toBeGreaterThan(32);
    expect(repository.createdTokenHash).toHaveLength(64);
    expect(repository.createdTokenHash).not.toBe(result.session.token);
    expect(repository.createdTokenHash).toBe(
      hashSessionToken(result.session.token)
    );
  });

  it("rejects a wrong password with a generic credential error", async () => {
    const repository = new FakeAuthRepository();
    repository.identity = {
      accountId: "00000000-0000-4000-8000-000000000003",
      user,
      passwordHash
    };

    const service = new AuthService(repository, config);

    await expect(
      service.login({
        email: "person@example.com",
        password: "wrong-password"
      })
    ).rejects.toMatchObject<AuthError>({
      code: "invalid_credentials",
      statusCode: 401
    });
  });

  it("rejects revoked sessions", async () => {
    const repository = new FakeAuthRepository();
    repository.session = {
      sessionId: "00000000-0000-4000-8000-000000000004",
      user,
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
      revokedAt: new Date()
    };

    const service = new AuthService(repository, config);

    await expect(
      service.authenticateToken("revoked-token")
    ).rejects.toMatchObject<AuthError>({
      code: "invalid_session",
      statusCode: 401
    });
  });

  it("hashes the raw token before revocation", async () => {
    const repository = new FakeAuthRepository();
    const service = new AuthService(repository, config);

    await service.logout("raw-session-token");

    expect(repository.revokedTokenHash).toBe(
      hashSessionToken("raw-session-token")
    );
  });
});
