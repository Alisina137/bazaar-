import {
  merchantRoles,
  platformRoles,
  type AppRole,
  type AuthSessionResponse,
  type AuthSuccessResponse
} from "@bazaarlink/contracts";
import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import {
  authorizeSession,
  createRoleGuard
} from "./authorization.js";
import type { AuthServiceContract } from "./service.js";

function sessionWithRoles(roles: AppRole[]): AuthSessionResponse {
  return {
    user: {
      id: "00000000-0000-4000-8000-000000000090",
      displayName: "Role User",
      preferredLocale: "en",
      status: "active",
      roles
    },
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  };
}

class RoleAuthService implements AuthServiceContract {
  constructor(private readonly session: AuthSessionResponse) {}

  async register(): Promise<AuthSuccessResponse> {
    throw new Error("not_used");
  }

  async login(): Promise<AuthSuccessResponse> {
    throw new Error("not_used");
  }

  async authenticateToken(token: string): Promise<AuthSessionResponse> {
    if (token !== "valid-token") {
      throw new Error("invalid_token");
    }

    return this.session;
  }

  async logout(): Promise<void> {}
}

const apps: ReturnType<typeof Fastify>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("role authorization", () => {
  it("blocks a customer from merchant access", async () => {
    const service = new RoleAuthService(sessionWithRoles(["customer"]));

    await expect(
      authorizeSession(service, "valid-token", merchantRoles)
    ).rejects.toMatchObject({
      code: "forbidden",
      statusCode: 403
    });
  });

  it("allows merchant owners into merchant boundaries", async () => {
    const service = new RoleAuthService(
      sessionWithRoles(["customer", "merchant_owner"])
    );

    await expect(
      authorizeSession(service, "valid-token", merchantRoles)
    ).resolves.toMatchObject({
      user: {
        roles: ["customer", "merchant_owner"]
      }
    });
  });

  it("keeps platform access separate from merchant access", async () => {
    const service = new RoleAuthService(
      sessionWithRoles(["customer", "merchant_owner"])
    );

    await expect(
      authorizeSession(service, "valid-token", platformRoles)
    ).rejects.toMatchObject({
      code: "forbidden",
      statusCode: 403
    });
  });

  it("returns safe 401/403 responses from the reusable Fastify guard", async () => {
    const app = Fastify();
    apps.push(app);

    const service = new RoleAuthService(sessionWithRoles(["customer"]));

    app.get(
      "/merchant-only",
      {
        preHandler: createRoleGuard(service, merchantRoles)
      },
      async () => ({
        status: "allowed"
      })
    );

    const missing = await app.inject({
      method: "GET",
      url: "/merchant-only"
    });

    expect(missing.statusCode).toBe(401);
    expect(missing.json()).toEqual({
      error: {
        code: "invalid_session"
      }
    });

    const forbidden = await app.inject({
      method: "GET",
      url: "/merchant-only",
      headers: {
        authorization: "Bearer valid-token"
      }
    });

    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json()).toEqual({
      error: {
        code: "forbidden"
      }
    });
  });
});
