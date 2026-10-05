import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";

import {
  registerAuthRoutes
} from "./auth/routes.js";
import { registerCatalogRoutes } from "./catalog/routes.js";
import type { CatalogServiceContract } from "./catalog/service.js";
import { registerCartPricingRoutes } from "./cart-pricing/routes.js";
import type { CartPricingServiceContract } from "./cart-pricing/service.js";
import type {
  AuthServiceContract
} from "./auth/service.js";
import { registerMarketplaceRoutes } from "./marketplace/routes.js";
import type { MarketplaceServiceContract } from "./marketplace/service.js";
import { registerStoreRoutes } from "./store/routes.js";
import type { StoreServiceContract } from "./store/service.js";
import { registerDeliveryRoutes } from "./delivery/routes.js";
import type { DeliveryServiceContract } from "./delivery/service.js";
import { registerPaymentRoutes } from "./payment/routes.js";
import type { PaymentServiceContract } from "./payment/service.js";

export interface AppDependencies {
  databaseHealthCheck?: () => Promise<void>;
  authService?: AuthServiceContract;
  storeService?: StoreServiceContract;
  catalogService?: CatalogServiceContract;
  marketplaceService?: MarketplaceServiceContract;
  cartPricingService?: CartPricingServiceContract;
  deliveryService?: DeliveryServiceContract;
  paymentService?: PaymentServiceContract;
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

  if (dependencies.marketplaceService) {
    app.register(async (publicMarketplaceApp) => {
      await publicMarketplaceApp.register(rateLimit, {
        global: false
      });

      registerMarketplaceRoutes(
        publicMarketplaceApp,
        dependencies.marketplaceService!
      );
    });
  }

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

      if (dependencies.catalogService) {
        registerCatalogRoutes(
          securedApp,
          dependencies.authService!,
          dependencies.catalogService
        );
      }

      if (dependencies.cartPricingService) {
        registerCartPricingRoutes(
          securedApp,
          dependencies.authService!,
          dependencies.cartPricingService
        );
      }

      if (dependencies.deliveryService) {
        registerDeliveryRoutes(
          securedApp,
          dependencies.authService!,
          dependencies.deliveryService
        );
      }

      if (dependencies.paymentService) {
        registerPaymentRoutes(
          securedApp,
          dependencies.authService!,
          dependencies.paymentService
        );
      }
    });
  }

  return app;
}
