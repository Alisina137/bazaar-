import {
  hasAnyRole,
  type AppRole,
  type AuthErrorResponse,
  type AuthSessionResponse
} from "@bazaarlink/contracts";
import type {
  FastifyReply,
  FastifyRequest
} from "fastify";

import { AuthError } from "./errors.js";
import type { AuthServiceContract } from "./service.js";

function errorBody(
  code: AuthErrorResponse["error"]["code"]
): AuthErrorResponse {
  return {
    error: {
      code
    }
  };
}

export function getBearerToken(request: FastifyRequest): string | null {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return null;
  }

  const [scheme, token, ...rest] = authorization.trim().split(/\s+/);

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token ||
    rest.length > 0
  ) {
    return null;
  }

  return token;
}

export function requireAnyRole(
  session: AuthSessionResponse,
  allowedRoles: readonly AppRole[]
): AuthSessionResponse {
  if (!hasAnyRole(session.user.roles, allowedRoles)) {
    throw new AuthError("forbidden", 403);
  }

  return session;
}

export async function authorizeSession(
  authService: AuthServiceContract,
  token: string,
  allowedRoles: readonly AppRole[]
): Promise<AuthSessionResponse> {
  const session = await authService.authenticateToken(token);
  return requireAnyRole(session, allowedRoles);
}

export function createRoleGuard(
  authService: AuthServiceContract,
  allowedRoles: readonly AppRole[]
) {
  return async function roleGuard(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const token = getBearerToken(request);

    if (!token) {
      return reply.code(401).send(errorBody("invalid_session"));
    }

    try {
      await authorizeSession(authService, token, allowedRoles);
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send(errorBody(error.code));
      }

      return reply.code(503).send(errorBody("service_unavailable"));
    }
  };
}
