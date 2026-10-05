import {
  closeDatabaseClient,
  createDatabaseClient,
  orders,
  parseDatabaseConfig,
  paymentAttempts,
  products,
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
import { DatabaseDeliveryRepository } from "../delivery/repository.js";
import { DeliveryService } from "../delivery/service.js";
import { DatabasePaymentRepository } from "../payment/repository.js";
import type {
  HostedPaymentSessionInput,
  PaymentGateway
} from "../payment/provider.js";
import { PaymentService } from "../payment/service.js";
import { DatabaseStoreRepository } from "../store/repository.js";
import { StoreService } from "../store/service.js";
import { INTEGRATION_TEST_TIMEOUT_MS } from "../test/load-integration-env.js";
import { DatabaseOrderRepository } from "./repository.js";
import { OrderService } from "./service.js";

vi.setConfig({ testTimeout: INTEGRATION_TEST_TIMEOUT_MS });

class OrderTestGateway implements PaymentGateway {
  readonly ready = true;

  async createSession(input: HostedPaymentSessionInput) {
    return {
      url: "https://checkout.example.test/" + input.attemptId,
      sessionId: "phase8-" + input.attemptId.slice(0, 8)
    };
  }

  async verifyWebhook(signature: string) {
    return signature === "valid-signature";
  }
}

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)(
  "database-backed Phase 8 order and fulfillment lifecycle",
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
    const paymentService = new PaymentService(
      new DatabasePaymentRepository(client.db),
      deliveryService,
      new OrderTestGateway()
    );
    const orderService = new OrderService(
      new DatabaseOrderRepository(client.db),
      deliveryService,
      paymentService
    );
    const app = buildApp({
      authService,
      storeService,
      catalogService,
      cartPricingService,
      deliveryService,
      paymentService,
      orderService
    });

    let ownerUserId: string | null = null;
    let customerUserId: string | null = null;

    afterAll(async () => {
      if (customerUserId) {
        await client.db
          .delete(orders)
          .where(eq(orders.customerUserId, customerUserId));
        await client.db
          .delete(paymentAttempts)
          .where(eq(paymentAttempts.userId, customerUserId));
      }

      if (ownerUserId) {
        await client.db
          .delete(stores)
          .where(eq(stores.ownerUserId, ownerUserId));
      }

      if (customerUserId) {
        await client.db.delete(users).where(eq(users.id, customerUserId));
      }

      if (ownerUserId) {
        await client.db.delete(users).where(eq(users.id, ownerUserId));
      }

      await app.close();
      await closeDatabaseClient(client);
    });

    it(
      "places idempotent merchant orders, reserves stock, fulfills delivery, cancels safely, and starts paid refunds",
      async () => {
        const owner = await authService.register({
          email: "order-owner-" + randomUUID() + "@example.com",
          password: "order-password",
          displayName: "Order Owner",
          preferredLocale: "fa-AF"
        });
        const customer = await authService.register({
          email: "order-customer-" + randomUUID() + "@example.com",
          password: "order-password",
          displayName: "Order Customer",
          preferredLocale: "fa-AF"
        });

        ownerUserId = owner.user.id;
        customerUserId = customer.user.id;

        const store = await storeService.createStore(owner.user.id, {
          name: "Phase 8 Kabul Store",
          handle: "order-" + randomUUID().slice(0, 8),
          category: "Electronics",
          province: "Kabul",
          cityDistrict: "District 3",
          phone: "+93700000008",
          preferredLocale: "fa-AF",
          physicalAddress: "Karte 4, Kabul"
        });

        const category = await catalogService.createCategory(
          owner.user.id,
          store.id,
          { name: "Order Products", sortOrder: 1 }
        );
        const product = await catalogService.createProduct(
          owner.user.id,
          store.id,
          {
            name: "Phase 8 Product",
            categoryId: category.id,
            price: 1000,
            availableQuantity: 5
          }
        );
        await catalogService.publishProduct(
          owner.user.id,
          store.id,
          product.id
        );
        await storeService.publishStore(owner.user.id, store.id);

        const customerHeaders = {
          authorization: "Bearer " + customer.session.token
        };
        const ownerHeaders = {
          authorization: "Bearer " + owner.session.token
        };

        const addressResponse = await app.inject({
          method: "POST",
          url: "/customer/addresses",
          headers: customerHeaders,
          payload: {
            label: "Order Home",
            recipientName: "Order Customer",
            province: "Kabul",
            districtCity: "District 3",
            areaNeighborhood: "Karte 4",
            addressDescription: "Phase 8 address",
            phone: "+93700111118",
            deliveryInstructions: "Call before arrival"
          }
        });
        expect(addressResponse.statusCode).toBe(201);
        const address = addressResponse.json();

        const deliverySettings = await app.inject({
          method: "PUT",
          url: "/seller/stores/" + store.id + "/delivery/settings",
          headers: ownerHeaders,
          payload: {
            deliveryEnabled: true,
            pickupEnabled: true,
            defaultDeliveryFee: 50,
            originProvince: "Kabul",
            originDistrict: "District 3",
            operatingWeekdays: [0, 1, 2, 3, 4, 5, 6]
          }
        });
        expect(deliverySettings.statusCode).toBe(200);

        const addItem = async () => {
          const response = await app.inject({
            method: "POST",
            url: "/customer/cart/items",
            headers: customerHeaders,
            payload: { productId: product.id, quantity: 1 }
          });
          expect(response.statusCode).toBe(201);
        };

        const createQuote = async (
          fulfillmentType: "delivery" | "pickup" = "delivery"
        ) => {
          const deliveryOptions = await app.inject({
            method: "POST",
            url: "/customer/delivery/options",
            headers: customerHeaders,
            payload: { addressId: address.id }
          });
          expect(deliveryOptions.statusCode).toBe(200);

          const option = deliveryOptions
            .json()
            .merchantGroups[0].options.find(
              (candidate: { fulfillmentType: string }) =>
                candidate.fulfillmentType === fulfillmentType
            );
          expect(option).toBeTruthy();

          const quote = await app.inject({
            method: "POST",
            url: "/customer/delivery/checkout-quote",
            headers: customerHeaders,
            payload: {
              addressId: address.id,
              selections: [
                {
                  storeId: store.id,
                  optionId: option.optionId
                }
              ]
            }
          });
          expect(quote.statusCode).toBe(201);
          return quote.json();
        };

        const selectManualPayment = async (
          checkoutSessionId: string,
          method: "cash_on_delivery" | "pay_at_store"
        ) => {
          const response = await app.inject({
            method: "POST",
            url: "/customer/payments/attempts",
            headers: customerHeaders,
            payload: {
              checkoutSessionId,
              idempotencyKey: "payment-" + randomUUID(),
              selections: [{ storeId: store.id, method }]
            }
          });
          expect(response.statusCode).toBe(201);
          expect(response.json().canProceedToReview).toBe(true);
          return response.json();
        };

        const place = async (
          checkoutSessionId: string,
          key: string
        ) => {
          return app.inject({
            method: "POST",
            url: "/customer/orders/place",
            headers: customerHeaders,
            payload: {
              checkoutSessionId,
              idempotencyKey: key
            }
          });
        };

        // Customer cancellation releases reserved inventory and cancels COD.
        await addItem();
        const cancelQuote = await createQuote();
        await selectManualPayment(
          cancelQuote.sessionId,
          "cash_on_delivery"
        );

        const cancelOrderKey = "order-cancel-" + randomUUID();
        const placedForCancel = await place(
          cancelQuote.sessionId,
          cancelOrderKey
        );
        expect(placedForCancel.statusCode).toBe(201);
        expect(placedForCancel.json()).toMatchObject({
          reused: false,
          orders: [
            {
              storeId: store.id,
              state: "pending_confirmation",
              fulfillmentType: "delivery",
              payment: {
                method: "cash_on_delivery",
                state: "pending"
              }
            }
          ]
        });
        const cancelledOrderId = placedForCancel.json().orders[0].id;

        const duplicatePlace = await place(
          cancelQuote.sessionId,
          cancelOrderKey
        );
        expect(duplicatePlace.statusCode).toBe(201);
        expect(duplicatePlace.json()).toMatchObject({
          reused: true,
          orders: [{ id: cancelledOrderId }]
        });

        const [reservedStock] = await client.db
          .select({
            available: products.availableQuantity,
            reserved: products.reservedQuantity
          })
          .from(products)
          .where(eq(products.id, product.id))
          .limit(1);
        expect(reservedStock).toMatchObject({
          available: 5,
          reserved: 1
        });

        const customerCancel = await app.inject({
          method: "POST",
          url: "/customer/orders/" + cancelledOrderId + "/cancel",
          headers: customerHeaders,
          payload: { reason: "Changed my mind" }
        });
        expect(customerCancel.statusCode).toBe(200);
        expect(customerCancel.json()).toMatchObject({
          state: "cancelled",
          cancellationReason: "Changed my mind",
          payment: {
            state: "cancelled"
          },
          reservations: [
            {
              state: "released"
            }
          ]
        });

        const [releasedStock] = await client.db
          .select({
            available: products.availableQuantity,
            reserved: products.reservedQuantity
          })
          .from(products)
          .where(eq(products.id, product.id))
          .limit(1);
        expect(releasedStock).toMatchObject({
          available: 5,
          reserved: 0
        });

        // COD order moves through the full delivery lifecycle.
        await addItem();
        const deliveryQuote = await createQuote();
        await selectManualPayment(
          deliveryQuote.sessionId,
          "cash_on_delivery"
        );
        const placed = await place(
          deliveryQuote.sessionId,
          "order-delivery-" + randomUUID()
        );
        expect(placed.statusCode).toBe(201);
        const deliveryOrderId = placed.json().orders[0].id;

        const merchantList = await app.inject({
          method: "GET",
          url: "/seller/stores/" + store.id + "/orders",
          headers: ownerHeaders
        });
        expect(merchantList.statusCode).toBe(200);
        expect(
          merchantList
            .json()
            .orders.some(
              (order: { id: string }) => order.id === deliveryOrderId
            )
        ).toBe(true);

        const runMerchantAction = async (
          action: string,
          expectedState: string
        ) => {
          const response = await app.inject({
            method: "POST",
            url:
              "/seller/stores/" +
              store.id +
              "/orders/" +
              deliveryOrderId +
              "/action",
            headers: ownerHeaders,
            payload: { action }
          });
          expect(response.statusCode).toBe(200);
          expect(response.json().state).toBe(expectedState);
          return response.json();
        };

        const confirmed = await runMerchantAction(
          "confirm",
          "confirmed"
        );
        expect(confirmed.reservations[0].state).toBe("committed");

        const [committedStock] = await client.db
          .select({
            available: products.availableQuantity,
            reserved: products.reservedQuantity
          })
          .from(products)
          .where(eq(products.id, product.id))
          .limit(1);
        expect(committedStock).toMatchObject({
          available: 4,
          reserved: 0
        });

        await runMerchantAction("start_preparing", "preparing");
        await runMerchantAction("mark_ready", "ready");
        await runMerchantAction("dispatch", "out_for_delivery");
        const delivered = await runMerchantAction(
          "deliver",
          "delivered"
        );
        expect(delivered.fulfillment.state).toBe("delivered");

        const customerTracking = await app.inject({
          method: "GET",
          url: "/customer/orders/" + deliveryOrderId,
          headers: customerHeaders
        });
        expect(customerTracking.statusCode).toBe(200);
        expect(customerTracking.json()).toMatchObject({
          state: "delivered",
          storeId: store.id,
          customerAddress: {
            recipientName: "Order Customer",
            deliveryInstructions: "Call before arrival"
          },
          delivery: {
            fulfillmentType: "delivery"
          },
          payment: {
            method: "cash_on_delivery"
          }
        });
        expect(customerTracking.json().timeline.length).toBeGreaterThanOrEqual(
          6
        );

        // Pickup uses its dedicated ready/picked-up states.
        await addItem();
        const pickupQuote = await createQuote("pickup");
        await selectManualPayment(
          pickupQuote.sessionId,
          "pay_at_store"
        );
        const pickupPlaced = await place(
          pickupQuote.sessionId,
          "order-pickup-" + randomUUID()
        );
        expect(pickupPlaced.statusCode).toBe(201);
        const pickupOrderId = pickupPlaced.json().orders[0].id;

        const pickupAction = async (
          action: string,
          expectedState: string
        ) => {
          const response = await app.inject({
            method: "POST",
            url:
              "/seller/stores/" +
              store.id +
              "/orders/" +
              pickupOrderId +
              "/action",
            headers: ownerHeaders,
            payload: { action }
          });
          expect(response.statusCode).toBe(200);
          expect(response.json().state).toBe(expectedState);
        };
        await pickupAction("confirm", "confirmed");
        await pickupAction("start_preparing", "preparing");
        await pickupAction("mark_ready", "ready_for_pickup");
        await pickupAction("mark_picked_up", "picked_up");

        // A paid hosted payment can enter the refund workflow after delivery.
        const enableCard = await app.inject({
          method: "PUT",
          url: "/seller/stores/" + store.id + "/payments",
          headers: ownerHeaders,
          payload: { cardEnabled: true }
        });
        expect(enableCard.statusCode).toBe(200);

        await addItem();
        const paidQuote = await createQuote();
        const cardPayment = await app.inject({
          method: "POST",
          url: "/customer/payments/attempts",
          headers: customerHeaders,
          payload: {
            checkoutSessionId: paidQuote.sessionId,
            idempotencyKey: "card-" + randomUUID(),
            selections: [{ storeId: store.id, method: "card" }]
          }
        });
        expect(cardPayment.statusCode).toBe(201);
        const cardAttempt = cardPayment.json().attempts[0];
        expect(cardAttempt.state).toBe("pending");

        const webhook = await app.inject({
          method: "POST",
          url: "/webhooks/hesabpay",
          payload: {
            signature: "valid-signature",
            timestamp: "1707719608",
            user_id: cardAttempt.id,
            amount: cardAttempt.amount,
            transaction_id: "phase8-" + randomUUID(),
            success: true
          }
        });
        expect(webhook.statusCode).toBe(200);
        expect(webhook.json().state).toBe("paid");

        const paidPlaced = await place(
          paidQuote.sessionId,
          "order-paid-" + randomUUID()
        );
        expect(paidPlaced.statusCode).toBe(201);
        const paidOrderId = paidPlaced.json().orders[0].id;

        const paidAction = async (
          action: string,
          expectedState: string
        ) => {
          const response = await app.inject({
            method: "POST",
            url:
              "/seller/stores/" +
              store.id +
              "/orders/" +
              paidOrderId +
              "/action",
            headers: ownerHeaders,
            payload: { action }
          });
          expect(response.statusCode).toBe(200);
          expect(response.json().state).toBe(expectedState);
          return response.json();
        };

        await paidAction("confirm", "confirmed");
        await paidAction("start_preparing", "preparing");
        await paidAction("mark_ready", "ready");
        await paidAction("dispatch", "out_for_delivery");
        await paidAction("deliver", "delivered");
        const refundPending = await paidAction(
          "request_refund",
          "refund_pending"
        );
        expect(refundPending.payment.state).toBe("refund_pending");

        const customerOrders = await app.inject({
          method: "GET",
          url: "/customer/orders",
          headers: customerHeaders
        });
        expect(customerOrders.statusCode).toBe(200);
        expect(customerOrders.json().orders).toHaveLength(4);
      }
    );
  }
);
