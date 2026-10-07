import {
  checkDatabaseConnection,
  closeDatabaseClient,
  createDatabaseClient,
  parseDatabaseConfig
} from "@bazaarlink/database";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

import { buildApp } from "./app.js";
import { DatabaseCatalogRepository } from "./catalog/repository.js";
import { CatalogService } from "./catalog/service.js";
import { parseAuthConfig } from "./auth/config.js";
import { DatabaseAuthRepository } from "./auth/repository.js";
import { AuthService } from "./auth/service.js";
import { DatabaseStoreRepository } from "./store/repository.js";
import { StoreService } from "./store/service.js";
import { DatabaseMarketplaceRepository } from "./marketplace/repository.js";
import { MarketplaceService } from "./marketplace/service.js";
import { DatabaseCartPricingRepository } from "./cart-pricing/repository.js";
import { CartPricingService } from "./cart-pricing/service.js";
import { DatabaseDeliveryRepository } from "./delivery/repository.js";
import { DeliveryService } from "./delivery/service.js";
import { parsePaymentProviderConfig } from "./payment/config.js";
import { HesabPayGateway } from "./payment/provider.js";
import { DatabasePaymentRepository } from "./payment/repository.js";
import { PaymentService } from "./payment/service.js";
import { DatabaseOrderRepository } from "./order/repository.js";
import { OrderService } from "./order/service.js";
import { DatabaseCommunicationRepository } from "./communication/repository.js";
import { ExpoPushGateway } from "./communication/push.js";
import { CommunicationService } from "./communication/service.js";
import { DatabaseTrustRepository } from "./trust/repository.js";
import { TrustService } from "./trust/service.js";
import { DatabaseGrowthRepository } from "./growth/repository.js";
import { GrowthService } from "./growth/service.js";

loadEnv({
  path: resolve(process.cwd(), "../../.env"),
  quiet: true
});

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

const databaseClient = createDatabaseClient(parseDatabaseConfig());
const authRepository = new DatabaseAuthRepository(databaseClient.db);
const authService = new AuthService(
  authRepository,
  parseAuthConfig()
);
const storeRepository = new DatabaseStoreRepository(databaseClient.db);
const storeService = new StoreService(storeRepository);
const catalogRepository = new DatabaseCatalogRepository(databaseClient.db);
const catalogService = new CatalogService(catalogRepository);
const marketplaceRepository = new DatabaseMarketplaceRepository(
  databaseClient.db
);
const marketplaceService = new MarketplaceService(marketplaceRepository);
const cartPricingRepository = new DatabaseCartPricingRepository(
  databaseClient.db
);
const cartPricingService = new CartPricingService(cartPricingRepository);
const deliveryRepository = new DatabaseDeliveryRepository(databaseClient.db);
const deliveryService = new DeliveryService(
  deliveryRepository,
  cartPricingService
);
const communicationRepository = new DatabaseCommunicationRepository(
  databaseClient.db
);
const communicationService = new CommunicationService(
  communicationRepository,
  new ExpoPushGateway()
);
const trustRepository = new DatabaseTrustRepository(databaseClient.db);
const trustService = new TrustService(
  trustRepository,
  communicationService
);
const growthRepository = new DatabaseGrowthRepository(databaseClient.db);
const growthService = new GrowthService(growthRepository);
const paymentRepository = new DatabasePaymentRepository(databaseClient.db);
const paymentGateway = new HesabPayGateway(parsePaymentProviderConfig());
const paymentService = new PaymentService(
  paymentRepository,
  deliveryService,
  paymentGateway,
  communicationService
);
const orderRepository = new DatabaseOrderRepository(databaseClient.db);
const orderService = new OrderService(
  orderRepository,
  deliveryService,
  paymentService,
  communicationService
);

const app = buildApp({
  databaseHealthCheck: () => checkDatabaseConnection(databaseClient),
  authService,
  storeService,
  catalogService,
  marketplaceService,
  cartPricingService,
  deliveryService,
  paymentService,
  orderService,
  trustService,
  communicationService,
  growthService
});

app.addHook("onClose", async () => {
  await closeDatabaseClient(databaseClient);
});

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  await closeDatabaseClient(databaseClient);
  process.exit(1);
}
