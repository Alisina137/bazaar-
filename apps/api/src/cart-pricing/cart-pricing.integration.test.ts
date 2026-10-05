import {
  closeDatabaseClient,
  createDatabaseClient,
  parseDatabaseConfig,
  storeCoupons,
  storeSubscriptions,
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
import { DatabaseCatalogRepository } from "../catalog/repository.js";
import { CatalogService } from "../catalog/service.js";
import { DatabaseStoreRepository } from "../store/repository.js";
import { StoreService } from "../store/service.js";
import { INTEGRATION_TEST_TIMEOUT_MS } from "../test/load-integration-env.js";
import { DatabaseCartPricingRepository } from "./repository.js";
import { CartPricingService } from "./service.js";

vi.setConfig({ testTimeout: INTEGRATION_TEST_TIMEOUT_MS });

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)(
  "database-backed cart pricing and checkout foundation",
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
    const app = buildApp({
      authService,
      storeService,
      catalogService,
      cartPricingService
    });

    const ownerUserIds: string[] = [];
    let customerUserId: string | null = null;

    afterAll(async () => {
      if (customerUserId) {
        await client.db.delete(users).where(eq(users.id, customerUserId));
      }

      for (const ownerUserId of ownerUserIds) {
        await client.db
          .delete(stores)
          .where(eq(stores.ownerUserId, ownerUserId));
        await client.db.delete(users).where(eq(users.id, ownerUserId));
      }

      await app.close();
      await closeDatabaseClient(client);
    });

    it(
      "groups merchants, reprices live catalog data, applies one seller coupon, saves local addresses, and creates an authoritative pre-delivery quote",
      async () => {
        const ownerA = await authService.register({
          email: "cart-owner-a-" + randomUUID() + "@example.com",
          password: "cart-password",
          displayName: "Cart Owner A",
          preferredLocale: "fa-AF"
        });
        const ownerB = await authService.register({
          email: "cart-owner-b-" + randomUUID() + "@example.com",
          password: "cart-password",
          displayName: "Cart Owner B",
          preferredLocale: "ps-AF"
        });
        const customer = await authService.register({
          email: "cart-customer-" + randomUUID() + "@example.com",
          password: "cart-password",
          displayName: "Cart Customer",
          preferredLocale: "fa-AF"
        });

        ownerUserIds.push(ownerA.user.id, ownerB.user.id);
        customerUserId = customer.user.id;

        const storeA = await storeService.createStore(ownerA.user.id, {
          name: "Kabul Mobile",
          handle: "cart-mobile-" + randomUUID().slice(0, 8),
          category: "Electronics",
          province: "Kabul",
          cityDistrict: "District 3",
          phone: "+93700000001",
          preferredLocale: "fa-AF"
        });
        const storeB = await storeService.createStore(ownerB.user.id, {
          name: "Ariana Fashion",
          handle: "cart-fashion-" + randomUUID().slice(0, 8),
          category: "Fashion",
          province: "Kabul",
          cityDistrict: "District 10",
          phone: "+93700000002",
          preferredLocale: "ps-AF"
        });

        const [categoryA, categoryB] = await Promise.all([
          catalogService.createCategory(ownerA.user.id, storeA.id, {
            name: "Phones",
            sortOrder: 1
          }),
          catalogService.createCategory(ownerB.user.id, storeB.id, {
            name: "Clothing",
            sortOrder: 1
          })
        ]);

        const [phone, jacket] = await Promise.all([
          catalogService.createProduct(ownerA.user.id, storeA.id, {
            name: "Phase 5 Phone",
            categoryId: categoryA.id,
            price: 23000,
            compareAtPrice: 25000,
            availableQuantity: 5,
            lowStockThreshold: 1
          }),
          catalogService.createProduct(ownerB.user.id, storeB.id, {
            name: "Phase 5 Jacket",
            categoryId: categoryB.id,
            price: 1000,
            availableQuantity: 3,
            lowStockThreshold: 1
          })
        ]);

        await Promise.all([
          catalogService.publishProduct(
            ownerA.user.id,
            storeA.id,
            phone.id
          ),
          catalogService.publishProduct(
            ownerB.user.id,
            storeB.id,
            jacket.id
          )
        ]);
        await Promise.all([
          storeService.publishStore(ownerA.user.id, storeA.id),
          storeService.publishStore(ownerB.user.id, storeB.id)
        ]);

        await client.db
          .update(storeSubscriptions)
          .set({ plan: "pro", updatedAt: new Date() })
          .where(eq(storeSubscriptions.storeId, storeA.id));

        await client.db.insert(storeCoupons).values({
          storeId: storeA.id,
          code: "SAVE10",
          type: "percentage",
          value: "10.00",
          minimumOrderAmount: "1000.00",
          active: true
        });

        const addPhone = await app.inject({
          method: "POST",
          url: "/customer/cart/items",
          headers: {
            authorization: "Bearer " + customer.session.token
          },
          payload: {
            productId: phone.id,
            quantity: 2
          }
        });
        expect(addPhone.statusCode).toBe(201);

        const addJacket = await app.inject({
          method: "POST",
          url: "/customer/cart/items",
          headers: {
            authorization: "Bearer " + customer.session.token
          },
          payload: {
            productId: jacket.id,
            quantity: 1
          }
        });
        expect(addJacket.statusCode).toBe(201);

        const groupedCart = addJacket.json();
        expect(groupedCart.groups).toHaveLength(2);
        expect(
          groupedCart.groups.map(
            (group: { store: { name: string } }) => group.store.name
          )
        ).toEqual(["Ariana Fashion", "Kabul Mobile"]);
        expect(groupedCart.totals).toEqual({
          itemsSubtotal: 51000,
          productDiscount: 4000,
          couponDiscount: 0,
          preDeliveryTotal: 47000
        });

        const applyCoupon = await app.inject({
          method: "PUT",
          url: "/customer/cart/coupons/" + storeA.id,
          headers: {
            authorization: "Bearer " + customer.session.token
          },
          payload: {
            code: "save10"
          }
        });
        expect(applyCoupon.statusCode).toBe(200);
        expect(applyCoupon.json().totals).toEqual({
          itemsSubtotal: 51000,
          productDiscount: 4000,
          couponDiscount: 4600,
          preDeliveryTotal: 42400
        });
        expect(
          applyCoupon
            .json()
            .groups.find(
              (group: { store: { id: string } }) =>
                group.store.id === storeA.id
            )
            .coupon
        ).toMatchObject({
          code: "SAVE10",
          type: "percentage",
          discountAmount: 4600,
          valid: true
        });

        const addressResponse = await app.inject({
          method: "POST",
          url: "/customer/addresses",
          headers: {
            authorization: "Bearer " + customer.session.token
          },
          payload: {
            label: "Home",
            recipientName: "Phase 5 Customer",
            country: "Afghanistan",
            province: "Kabul",
            districtCity: "District 3",
            areaNeighborhood: "Karte 4",
            addressDescription: "Second street, blue gate",
            nearestLandmark: "Behind the mosque",
            phone: "+93700123456",
            deliveryInstructions: "Call before arrival"
          }
        });
        expect(addressResponse.statusCode).toBe(201);
        expect(addressResponse.json()).toMatchObject({
          province: "Kabul",
          districtCity: "District 3",
          areaNeighborhood: "Karte 4",
          nearestLandmark: "Behind the mosque",
          isDefault: true
        });
        const address = addressResponse.json();

        const crossUserAddressUpdate = await app.inject({
          method: "PATCH",
          url: "/customer/addresses/" + address.id,
          headers: {
            authorization: "Bearer " + ownerB.session.token
          },
          payload: {
            label: "Not mine"
          }
        });
        expect(crossUserAddressUpdate.statusCode).toBe(404);
        expect(crossUserAddressUpdate.json()).toEqual({
          error: {
            code: "address_not_found"
          }
        });

        const quoteResponse = await app.inject({
          method: "POST",
          url: "/customer/checkout/quote",
          headers: {
            authorization: "Bearer " + customer.session.token
          },
          payload: {
            addressId: address.id
          }
        });
        expect(quoteResponse.statusCode).toBe(201);
        expect(quoteResponse.json()).toMatchObject({
          status: "quoted",
          address: {
            id: address.id
          },
          cart: {
            totals: {
              preDeliveryTotal: 42400
            }
          },
          steps: {
            address: "ready",
            delivery: "pending_phase_6",
            payment: "pending_phase_7",
            review: "pricing_ready",
            placeOrder: "blocked_until_delivery_payment"
          },
          canProceedToDelivery: true,
          canPlaceOrder: false
        });
        const quote = quoteResponse.json();

        const getQuote = await app.inject({
          method: "GET",
          url: "/customer/checkout/" + quote.sessionId,
          headers: {
            authorization: "Bearer " + customer.session.token
          }
        });
        expect(getQuote.statusCode).toBe(200);
        expect(getQuote.json().sessionId).toBe(quote.sessionId);
        expect(getQuote.json().cart.totals.preDeliveryTotal).toBe(42400);

        await catalogService.updateProduct(
          ownerA.user.id,
          storeA.id,
          phone.id,
          {
            price: 23500,
            compareAtPrice: 25000
          }
        );

        const repricedCart = await app.inject({
          method: "GET",
          url: "/customer/cart",
          headers: {
            authorization: "Bearer " + customer.session.token
          }
        });
        expect(repricedCart.statusCode).toBe(200);
        expect(repricedCart.json().priceChanged).toBe(true);
        expect(repricedCart.json().totals).toEqual({
          itemsSubtotal: 51000,
          productDiscount: 3000,
          couponDiscount: 4700,
          preDeliveryTotal: 43300
        });
        expect(
          repricedCart
            .json()
            .groups.find(
              (group: { store: { id: string } }) =>
                group.store.id === storeA.id
            )
            .items[0]
        ).toMatchObject({
          unitPrice: 23500,
          unitListPrice: 25000,
          priceChanged: true
        });

        await catalogService.adjustInventory(
          ownerA.user.id,
          storeA.id,
          phone.id,
          {
            variantId: null,
            delta: -4,
            reason: "Phase 5 checkout race test"
          }
        );

        const stockChangedCart = await app.inject({
          method: "GET",
          url: "/customer/cart",
          headers: {
            authorization: "Bearer " + customer.session.token
          }
        });
        expect(stockChangedCart.statusCode).toBe(200);
        expect(stockChangedCart.json().hasBlockingIssues).toBe(true);
        expect(
          stockChangedCart
            .json()
            .groups.find(
              (group: { store: { id: string } }) =>
                group.store.id === storeA.id
            )
            .items[0]
        ).toMatchObject({
          availableQuantity: 1,
          unavailableReason: "insufficient_stock"
        });

        const blockedQuote = await app.inject({
          method: "POST",
          url: "/customer/checkout/quote",
          headers: {
            authorization: "Bearer " + customer.session.token
          },
          payload: {
            addressId: address.id
          }
        });
        expect(blockedQuote.statusCode).toBe(409);
        expect(blockedQuote.json()).toEqual({
          error: {
            code: "checkout_unavailable"
          }
        });
      }
    );
  }
);
