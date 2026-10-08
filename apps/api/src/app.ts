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
import { registerOrderRoutes } from "./order/routes.js";
import type { OrderServiceContract } from "./order/service.js";
import {
  registerPublicTrustRoutes,
  registerTrustRoutes
} from "./trust/routes.js";
import type { TrustServiceContract } from "./trust/service.js";
import { registerCommunicationRoutes } from "./communication/routes.js";
import type { CommunicationService } from "./communication/service.js";
import { registerGrowthRoutes } from "./growth/routes.js";
import type { GrowthServiceContract } from "./growth/service.js";
import { registerPlatformRoutes } from "./platform/routes.js";
import type { Database } from "@bazaarlink/database";

export interface AppDependencies {
  databaseHealthCheck?: () => Promise<void>;
  authService?: AuthServiceContract;
  storeService?: StoreServiceContract;
  catalogService?: CatalogServiceContract;
  marketplaceService?: MarketplaceServiceContract;
  cartPricingService?: CartPricingServiceContract;
  deliveryService?: DeliveryServiceContract;
  paymentService?: PaymentServiceContract;
  orderService?: OrderServiceContract;
  trustService?: TrustServiceContract;
  communicationService?: CommunicationService;
  growthService?: GrowthServiceContract;
  platformDatabase?: Database;
}

export function buildApp(
  dependencies: AppDependencies = {}
) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
    bodyLimit: 1_048_576
  });

  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    const canCache = request.method === "GET" &&
      request.url.startsWith("/marketplace/") &&
      !request.headers.authorization &&
      !request.url.includes("recentProductIds=") &&
      reply.statusCode === 200;
    reply.header("Cache-Control", canCache ? "public, max-age=15, stale-while-revalidate=30" : "no-store");
    if (canCache) reply.header("Vary", "Accept-Language");
    return payload;
  });

  app.get("/health", async () => ({
    service: "bazaarlink-api",
    status: "ok"
  }));

  app.get("/ready", async (_request, reply) => {
    try {
      if (!dependencies.databaseHealthCheck) throw new Error("database check not configured");
      await dependencies.databaseHealthCheck();
      return { service: "bazaarlink-api", status: "ready" };
    } catch {
      return reply.code(503).send({service:"bazaarlink-api",status:"not_ready"});
    }
  });

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

  if (dependencies.marketplaceService || dependencies.trustService) {
    app.register(async (publicApp) => {
      await publicApp.register(rateLimit, {
        global: false
      });

      if (dependencies.marketplaceService) {
        registerMarketplaceRoutes(
          publicApp,
          dependencies.marketplaceService
        );
      }

      if (dependencies.trustService) {
        registerPublicTrustRoutes(
          publicApp,
          dependencies.trustService
        );
      }
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
      if (dependencies.platformDatabase) {
        registerPlatformRoutes(securedApp, dependencies.authService!, dependencies.platformDatabase);
      }

      if (dependencies.storeService) {
        registerStoreRoutes(
          securedApp,
          dependencies.authService!,
          dependencies.storeService,
          dependencies.growthService
        );
      }

      if (dependencies.catalogService) {
        registerCatalogRoutes(
          securedApp,
          dependencies.authService!,
          dependencies.catalogService,
          dependencies.growthService
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
          dependencies.deliveryService,
          dependencies.growthService
        );
      }

      if (dependencies.paymentService) {
        registerPaymentRoutes(
          securedApp,
          dependencies.authService!,
          dependencies.paymentService
        );
      }

      if (dependencies.orderService) {
        registerOrderRoutes(
          securedApp,
          dependencies.authService!,
          dependencies.orderService,
          dependencies.growthService
        );
      }

      if (dependencies.trustService) {
        registerTrustRoutes(
          securedApp,
          dependencies.authService!,
          dependencies.trustService
        );
      }

      if (dependencies.communicationService) {
        registerCommunicationRoutes(
          securedApp,
          dependencies.authService!,
          dependencies.communicationService
        );
      }

      if (dependencies.growthService) {
        registerGrowthRoutes(
          securedApp,
          dependencies.authService!,
          dependencies.growthService
        );
      }
    });
  }

  return app;
}
