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
    status: "active"
  },
  session: {
    token: "route-test-token",
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  }
};

class FakeAuthService implements AuthServiceContract {
  loginError: Error | null = null;

  async register(): Promise<AuthSuccessResponse> {
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
});
