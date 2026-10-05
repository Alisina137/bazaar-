import {
  closeDatabaseClient,
  createDatabaseClient,
  parseDatabaseConfig,
  stores,
  users
} from "@bazaarlink/database";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  afterAll,
  describe,
  expect,
  it,
  vi
} from "vitest";

import { buildApp } from "../app.js";
import { parseAuthConfig } from "../auth/config.js";
import { DatabaseAuthRepository } from "../auth/repository.js";
import { AuthService } from "../auth/service.js";
import { DatabaseCartPricingRepository } from "../cart-pricing/repository.js";
import { CartPricingService } from "../cart-pricing/service.js";
import { DatabaseCatalogRepository } from "../catalog/repository.js";
import { CatalogService } from "../catalog/service.js";
import { DatabaseStoreRepository } from "../store/repository.js";
import { StoreService } from "../store/service.js";
import { INTEGRATION_TEST_TIMEOUT_MS } from "../test/load-integration-env.js";
import { DatabaseDeliveryRepository } from "./repository.js";
import { DeliveryService } from "./service.js";

vi.setConfig({ testTimeout: INTEGRATION_TEST_TIMEOUT_MS });

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)(
  "database-backed deterministic delivery checkout",
  () => {
    const client = createDatabaseClient(parseDatabaseConfig());
    const authService = new AuthService(
      new DatabaseAuthRepository(client.db),
      parseAuthConfig()
    );
    const storeService = new StoreService(
      new DatabaseStoreRepository(client.db)
    );
    const catalogService = new CatalogService(
      new DatabaseCatalogRepository(client.db)
    );
    const cartPricingService = new CartPricingService(
      new DatabaseCartPricingRepository(client.db)
    );
    const deliveryService = new DeliveryService(
      new DatabaseDeliveryRepository(client.db),
      cartPricingService
    );
    const app = buildApp({
      authService,
      storeService,
      catalogService,
      cartPricingService,
      deliveryService
    });

    let ownerUserId: string | null = null;
    let customerUserId: string | null = null;

    afterAll(async () => {
      if (customerUserId) {
        await client.db.delete(users).where(eq(users.id, customerUserId));
      }

      if (ownerUserId) {
        await client.db
          .delete(stores)
          .where(eq(stores.ownerUserId, ownerUserId));
        await client.db.delete(users).where(eq(users.id, ownerUserId));
      }

      await app.close();
      await closeDatabaseClient(client);
    });

    it(
      "prices overlapping zones, urgency, product surcharges, free delivery, outside coverage, and persists a delivery-ready quote",
      async () => {
        const owner = await authService.register({
          email: "delivery-owner-" + randomUUID() + "@example.com",
          password: "delivery-password",
          displayName: "Delivery Owner",
          preferredLocale: "fa-AF"
        });
        const customer = await authService.register({
          email: "delivery-customer-" + randomUUID() + "@example.com",
          password: "delivery-password",
          displayName: "Delivery Customer",
          preferredLocale: "fa-AF"
        });

        ownerUserId = owner.user.id;
        customerUserId = customer.user.id;

        const store = await storeService.createStore(owner.user.id, {
          name: "Phase 6 Kabul Store",
          handle: "delivery-" + randomUUID().slice(0, 8),
          category: "Electronics",
          province: "Kabul",
          cityDistrict: "District 3",
          phone: "+93700000006",
          preferredLocale: "fa-AF",
          physicalAddress: "Karte 4, Kabul"
        });

        const category = await catalogService.createCategory(
          owner.user.id,
          store.id,
          {
            name: "Delivery Products",
            sortOrder: 1
          }
        );

        const product = await catalogService.createProduct(
          owner.user.id,
          store.id,
          {
            name: "Fragile Phase 6 Product",
            categoryId: category.id,
            price: 1000,
            availableQuantity: 10,
            deliveryProfile: "fragile",
            deliverySurcharge: 20
          }
        );

        await catalogService.publishProduct(
          owner.user.id,
          store.id,
          product.id
        );
        await storeService.publishStore(owner.user.id, store.id);

        const addCart = await app.inject({
          method: "POST",
          url: "/customer/cart/items",
          headers: {
            authorization: "Bearer " + customer.session.token
          },
          payload: {
            productId: product.id,
            quantity: 2
          }
        });
        expect(addCart.statusCode).toBe(201);
        expect(addCart.json().totals.preDeliveryTotal).toBe(2000);

        const addressResponse = await app.inject({
          method: "POST",
          url: "/customer/addresses",
          headers: {
            authorization: "Bearer " + customer.session.token
          },
          payload: {
            label: "Karte 4 Home",
            recipientName: "Delivery Customer",
            province: "Kabul",
            districtCity: "District 3",
            areaNeighborhood: "Karte 4",
            addressDescription: "Blue gate near the market",
            phone: "+93700111111"
          }
        });
        expect(addressResponse.statusCode).toBe(201);
        const address = addressResponse.json();

        const settingsResponse = await app.inject({
          method: "PUT",
          url: "/seller/stores/" + store.id + "/delivery/settings",
          headers: {
            authorization: "Bearer " + owner.session.token
          },
          payload: {
            deliveryEnabled: true,
            pickupEnabled: false,
            originAddress: "Karte 4, Kabul",
            originProvince: "Kabul",
            originDistrict: "District 3",
            originArea: "Karte 4",
            defaultDeliveryFee: null,
            freeDeliveryThreshold: null,
            operatingWeekdays: [0, 1, 2, 3, 4, 5, 6],
            cutoffTime: null
          }
        });
        expect(settingsResponse.statusCode).toBe(200);

        const broadZone = await app.inject({
          method: "POST",
          url: "/seller/stores/" + store.id + "/delivery/zones",
          headers: {
            authorization: "Bearer " + owner.session.token
          },
          payload: {
            name: "Kabul Province",
            province: "Kabul",
            fee: 100,
            priority: 0
          }
        });
        expect(broadZone.statusCode).toBe(201);

        const specificZone = await app.inject({
          method: "POST",
          url: "/seller/stores/" + store.id + "/delivery/zones",
          headers: {
            authorization: "Bearer " + owner.session.token
          },
          payload: {
            name: "Karte 4",
            province: "Kabul",
            districtCity: "District 3",
            areaNeighborhood: "Karte 4",
            fee: 50,
            priority: 0
          }
        });
        expect(specificZone.statusCode).toBe(201);
        const specific = specificZone
          .json()
          .zones.find((zone: { name: string }) => zone.name === "Karte 4");

        const speedResponse = await app.inject({
          method: "POST",
          url: "/seller/stores/" + store.id + "/delivery/speeds",
          headers: {
            authorization: "Bearer " + owner.session.token
          },
          payload: {
            name: "Same Day",
            kind: "same_day",
            surchargeType: "fixed",
            surchargeValue: 150,
            minEtaMinutes: 30,
            maxEtaMinutes: 90,
            supportedWeekdays: [0, 1, 2, 3, 4, 5, 6],
            sortOrder: -10
          }
        });
        expect(speedResponse.statusCode).toBe(201);
        const sameDay = speedResponse
          .json()
          .speeds.find((speed: { name: string }) => speed.name === "Same Day");

        const optionsResponse = await app.inject({
          method: "POST",
          url: "/customer/delivery/options",
          headers: {
            authorization: "Bearer " + customer.session.token
          },
          payload: {
            addressId: address.id
          }
        });
        expect(optionsResponse.statusCode).toBe(200);
        expect(optionsResponse.json().canContinue).toBe(true);

        const sameDayOption = optionsResponse
          .json()
          .merchantGroups[0].options.find(
            (option: { optionId: string }) => option.optionId === sameDay.id
          );

        expect(sameDayOption).toMatchObject({
          fulfillmentType: "delivery",
          ruleUsed: {
            type: "zone",
            id: specific.id,
            label: "Karte 4",
            distanceSource: "not_required"
          },
          price: {
            baseDelivery: 50,
            urgencySurcharge: 150,
            productDeliverySurcharge: 40,
            freeDeliveryDiscount: 0,
            finalDeliveryPrice: 240
          }
        });

        const quoteResponse = await app.inject({
          method: "POST",
          url: "/customer/delivery/checkout-quote",
          headers: {
            authorization: "Bearer " + customer.session.token
          },
          payload: {
            addressId: address.id,
            selections: [
              {
                storeId: store.id,
                optionId: sameDay.id
              }
            ]
          }
        });
        expect(quoteResponse.statusCode).toBe(201);
        expect(quoteResponse.json()).toMatchObject({
          status: "quoted",
          totals: {
            preDeliveryTotal: 2000,
            deliveryBase: 50,
            urgencySurcharge: 150,
            productDeliverySurcharge: 40,
            freeDeliveryDiscount: 0,
            deliveryTotal: 240,
            disclosedFees: 0,
            configuredTax: 0,
            finalBeforePaymentTotal: 2240
          },
          steps: {
            address: "ready",
            delivery: "ready",
            payment: "pending_phase_7",
            review: "delivery_pricing_ready",
            placeOrder: "blocked_until_phase_8"
          },
          canProceedToPayment: true,
          canPlaceOrder: false
        });

        const persistedQuote = await app.inject({
          method: "GET",
          url:
            "/customer/delivery/checkout-quote/" +
            quoteResponse.json().sessionId,
          headers: {
            authorization: "Bearer " + customer.session.token
          }
        });
        expect(persistedQuote.statusCode).toBe(200);
        expect(persistedQuote.json().totals.finalBeforePaymentTotal).toBe(
          2240
        );

        const freeSettings = await app.inject({
          method: "PUT",
          url: "/seller/stores/" + store.id + "/delivery/settings",
          headers: {
            authorization: "Bearer " + owner.session.token
          },
          payload: {
            freeDeliveryThreshold: 2000
          }
        });
        expect(freeSettings.statusCode).toBe(200);

        const freeOptions = await app.inject({
          method: "POST",
          url: "/customer/delivery/options",
          headers: {
            authorization: "Bearer " + customer.session.token
          },
          payload: {
            addressId: address.id
          }
        });
        expect(freeOptions.statusCode).toBe(200);
        const freeSameDay = freeOptions
          .json()
          .merchantGroups[0].options.find(
            (option: { optionId: string }) => option.optionId === sameDay.id
          );
        expect(freeSameDay).toMatchObject({
          ruleUsed: {
            type: "free_delivery"
          },
          price: {
            baseDelivery: 50,
            urgencySurcharge: 150,
            productDeliverySurcharge: 40,
            freeDeliveryDiscount: 240,
            finalDeliveryPrice: 0
          }
        });

        const outsideAddressResponse = await app.inject({
          method: "POST",
          url: "/customer/addresses",
          headers: {
            authorization: "Bearer " + customer.session.token
          },
          payload: {
            label: "Outside Coverage",
            recipientName: "Delivery Customer",
            province: "Herat",
            districtCity: "Herat City",
            addressDescription: "Outside configured zones",
            phone: "+93700111112"
          }
        });
        expect(outsideAddressResponse.statusCode).toBe(201);

        const outsideOptions = await app.inject({
          method: "POST",
          url: "/customer/delivery/options",
          headers: {
            authorization: "Bearer " + customer.session.token
          },
          payload: {
            addressId: outsideAddressResponse.json().id
          }
        });
        expect(outsideOptions.statusCode).toBe(200);
        expect(outsideOptions.json()).toMatchObject({
          canContinue: false,
          merchantGroups: [
            {
              storeId: store.id,
              available: false,
              unavailableReason: "outside_coverage",
              options: []
            }
          ]
        });
      }
    );
  }
);
