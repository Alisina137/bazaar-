import type {
  AuthSessionResponse,
  AuthSuccessResponse
} from "@bazaarlink/contracts";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import { AuthError } from "./errors.js";
import type {
  AuthServiceContract
} from "./service.js";

const success: AuthSuccessResponse = {
  user: {
    id: "00000000-0000-4000-8000-000000000010",
    displayName: "Route User",
    preferredLocale: "en",
    status: "active",
    roles: ["customer"]
  },
  session: {
    token: "route-test-token",
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  }
};

class FakeAuthService implements AuthServiceContract {
  loginError: Error | null = null;
  registerCalls = 0;

  async register(): Promise<AuthSuccessResponse> {
    this.registerCalls += 1;
    return success;
  }

  async login(): Promise<AuthSuccessResponse> {
    if (this.loginError) {
      throw this.loginError;
    }

    return success;
  }

  async authenticateToken(token: string): Promise<AuthSessionResponse> {
    if (token !== success.session.token) {
      throw new AuthError("invalid_session", 401);
    }

    return {
      user: success.user,
      expiresAt: success.session.expiresAt
    };
  }

  async updateProfile(token: string, input: { displayName: string | null; phone: string | null; avatarColor: "teal" | "blue" | "purple" | "orange" }) {
    if (token !== success.session.token) {
      throw new AuthError("invalid_session", 401);
    }
    return { user: { ...success.user, ...input } };
  }

  async logout(token: string): Promise<void> {
    if (token !== success.session.token) {
      throw new AuthError("invalid_session", 401);
    }
  }
}

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("authentication routes", () => {
  it("registers a valid email/password account", async () => {
    const app = buildApp({
      authService: new FakeAuthService()
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "person@example.com",
        password: "password123",
        displayName: "Person",
        preferredLocale: "en"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(success);
  });

  it("rejects malformed registration data without leaking validation details", async () => {
    const app = buildApp({
      authService: new FakeAuthService()
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "not-email",
        password: "short",
        preferredLocale: "en"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "invalid_request"
      }
    });
  });

  it("rejects client attempts to self-assign privileged roles", async () => {
    const service = new FakeAuthService();
    const app = buildApp({
      authService: service
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "attacker@example.com",
        password: "password123",
        preferredLocale: "en",
        roles: ["super_admin"]
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "invalid_request"
      }
    });
    expect(service.registerCalls).toBe(0);
  });

  it("returns generic invalid credentials", async () => {
    const service = new FakeAuthService();
    service.loginError = new AuthError("invalid_credentials", 401);

    const app = buildApp({
      authService: service
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "person@example.com",
        password: "incorrect-password"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "invalid_credentials"
      }
    });
  });

  it("rate-limits repeated login attempts", async () => {
    const app = buildApp({
      authService: new FakeAuthService()
    });
    apps.push(app);

    let response;

    for (let attempt = 0; attempt < 11; attempt += 1) {
      response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "person@example.com",
          password: "password123"
        }
      });
    }

    expect(response?.statusCode).toBe(429);
    expect(response?.json()).toEqual({
      error: {
        code: "rate_limited"
      }
    });
  });

  it("requires a bearer token for session access", async () => {
    const app = buildApp({
      authService: new FakeAuthService()
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/auth/session"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "invalid_session"
      }
    });
  });

  it("restores and logs out a bearer session", async () => {
    const app = buildApp({
      authService: new FakeAuthService()
    });
    apps.push(app);

    const sessionResponse = await app.inject({
      method: "GET",
      url: "/auth/session",
      headers: {
        authorization: "Bearer " + success.session.token
      }
    });

    expect(sessionResponse.statusCode).toBe(200);
    expect(sessionResponse.json()).toEqual({
      user: success.user,
      expiresAt: success.session.expiresAt
    });

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: {
        authorization: "Bearer " + success.session.token
      }
    });

    expect(logoutResponse.statusCode).toBe(204);
  });
  it("requires login to update a customer profile", async () => {
    const app = buildApp({ authService: new FakeAuthService() });
    apps.push(app);
    const response = await app.inject({
      method: "PATCH", url: "/auth/profile",
      payload: { displayName: "New Name", phone: "+93 700 123456", avatarColor: "blue" }
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: { code: "invalid_session" } });
  });

  it("rejects role escalation and unverified email changes on profile", async () => {
    const app = buildApp({ authService: new FakeAuthService() });
    apps.push(app);
    for (const additionalField of [{ roles: ["super_admin"] }, { email: "new@example.com" }]) {
      const response = await app.inject({
        method: "PATCH", url: "/auth/profile",
        headers: { authorization: "Bearer " + success.session.token },
        payload: { displayName: "Person", phone: null, avatarColor: "teal", ...additionalField }
      });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: { code: "invalid_request" } });
    }
  });

  it("returns the updated profile without exposing the session token", async () => {
    const app = buildApp({ authService: new FakeAuthService() });
    apps.push(app);
    const response = await app.inject({
      method: "PATCH", url: "/auth/profile",
      headers: { authorization: "Bearer " + success.session.token },
      payload: { displayName: "New Name", phone: "+93 700 123456", avatarColor: "orange" }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().user.displayName).toBe("New Name");
    expect(response.json().user.phone).toBe("+93 700 123456");
    expect(response.json().user.roles).toEqual(["customer"]);
    expect(response.json().session).toBeUndefined();
  });

  it("requires auth and refuses malformed security tokens or passwords", async () => {
    const app = buildApp({ authService: new FakeAuthService() });
    apps.push(app);
    const missing = await app.inject({ method: "GET", url: "/auth/sessions" });
    expect(missing.statusCode).toBe(401);
    for (const [url, payload] of [
      ["/auth/password-reset/confirm", { code: "x", newPassword: "secure-new-password" }],
      ["/auth/email-verification/confirm", { code: "not-a-token" }],
      ["/auth/change-password", { currentPassword: "x", newPassword: "short" }]
    ] as const) {
      const result = await app.inject({
        method: "POST", url, headers: { authorization: "Bearer " + success.session.token },
        payload
      });
      expect(result.statusCode).toBe(400);
    }
  });

  it("does not disclose whether recovery email exists when request is accepted", async () => {
    const mock = new FakeAuthService();

    const app = buildApp({ authService: mock });
    apps.push(app);
    const response = await app.inject({
      method: "POST", url: "/auth/password-reset/request",
      payload: { email: "someone@example.com" }
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
  });

});
