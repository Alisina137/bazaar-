import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";

import {
  registerAuthRoutes
} from "./auth/routes.js";
import type {
  AuthServiceContract
} from "./auth/service.js";
import { registerStoreRoutes } from "./store/routes.js";
import type { StoreServiceContract } from "./store/service.js";

export interface AppDependencies {
  databaseHealthCheck?: () => Promise<void>;
  authService?: AuthServiceContract;
  storeService?: StoreServiceContract;
}

export function buildApp(
  dependencies: AppDependencies = {}
) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test"
  });

  app.get("/health", async () => ({
    service: "bazaarlink-api",
    status: "ok"
  }));

  app.get("/health/database", async (_request, reply) => {
    if (!dependencies.databaseHealthCheck) {
      return reply.code(503).send({
        service: "bazaarlink-database",
        status: "unavailable"
      });
    }

    try {
      await dependencies.databaseHealthCheck();

      return {
        service: "bazaarlink-database",
        status: "ok"
      };
    } catch {
      return reply.code(503).send({
        service: "bazaarlink-database",
        status: "unavailable"
      });
    }
  });

  if (dependencies.authService) {
    app.register(async (securedApp) => {
      await securedApp.register(rateLimit, {
        global: false
      });

      securedApp.setErrorHandler((error, request, reply) => {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : undefined;

        if (statusCode === 429) {
          return reply.code(429).send({
            error: {
              code: "rate_limited"
            }
          });
        }

        request.log.error(error);

        return reply.code(503).send({
          error: {
            code: "service_unavailable"
          }
        });
      });

      registerAuthRoutes(securedApp, dependencies.authService!);

      if (dependencies.storeService) {
        registerStoreRoutes(
          securedApp,
          dependencies.authService!,
          dependencies.storeService
        );
      }
    });
  }

  return app;
}
