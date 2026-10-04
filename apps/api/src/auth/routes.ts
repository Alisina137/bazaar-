import type {
  AuthErrorResponse,
  AuthSuccessResponse
} from "@bazaarlink/contracts";
import type {
  FastifyInstance,
  FastifyReply
} from "fastify";
import { z } from "zod";

import { getBearerToken } from "./authorization.js";
import { AuthError } from "./errors.js";
import type { AuthServiceContract } from "./service.js";

const localeSchema = z.enum(["fa-AF", "ps-AF", "en"]);

const registerSchema = z
  .object({
    email: z.string().trim().email().max(320),
    password: z.string().min(8).max(128),
    displayName: z.string().trim().min(1).max(160).nullable().optional(),
    preferredLocale: localeSchema
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().email().max(320),
    password: z.string().min(1).max(128)
  })
  .strict();

function errorBody(code: AuthErrorResponse["error"]["code"]): AuthErrorResponse {
  return {
    error: {
      code
    }
  };
}

function sendAuthError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send(errorBody(error.code));
  }

  return reply.code(503).send(errorBody("service_unavailable"));
}

export function registerAuthRoutes(
  app: FastifyInstance,
  authService: AuthServiceContract
) {
  app.post(
    "/auth/register",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "10 minutes"
        }
      }
    },
    async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const result: AuthSuccessResponse = await authService.register({
          email: parsed.data.email,
          password: parsed.data.password,
          displayName: parsed.data.displayName ?? null,
          preferredLocale: parsed.data.preferredLocale
        });

        return reply.code(201).send(result);
      } catch (error) {
        return sendAuthError(reply, error);
      }
    }
  );

  app.post(
    "/auth/login",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "10 minutes"
        }
      }
    },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        return await authService.login(parsed.data);
      } catch (error) {
        return sendAuthError(reply, error);
      }
    }
  );

  app.get("/auth/session", async (request, reply) => {
    const token = getBearerToken(request);

    if (!token) {
      return reply.code(401).send(errorBody("invalid_session"));
    }

    try {
      return await authService.authenticateToken(token);
    } catch (error) {
      return sendAuthError(reply, error);
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = getBearerToken(request);

    if (!token) {
      return reply.code(401).send(errorBody("invalid_session"));
    }

    try {
      await authService.logout(token);
      return reply.code(204).send();
    } catch (error) {
      return sendAuthError(reply, error);
    }
  });
}
