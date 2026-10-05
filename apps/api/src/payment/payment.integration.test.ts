import {
  closeDatabaseClient,
  createDatabaseClient,
  parseDatabaseConfig,
  paymentAttempts,
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
import { DatabaseStoreRepository } from "../store/repository.js";
import { StoreService } from "../store/service.js";
import { INTEGRATION_TEST_TIMEOUT_MS } from "../test/load-integration-env.js";
import type {
  HostedPaymentSessionInput,
  PaymentGateway
} from "./provider.js";
import { DatabasePaymentRepository } from "./repository.js";
import { PaymentService } from "./service.js";

vi.setConfig({ testTimeout: INTEGRATION_TEST_TIMEOUT_MS });

class FakeHesabPayGateway implements PaymentGateway {
  readonly ready = true;
  createCalls: HostedPaymentSessionInput[] = [];

  async createSession(input: HostedPaymentSessionInput) {
    this.createCalls.push(input);
    return {
      url: "https://checkout.example.test/" + input.attemptId,
      sessionId: "sandbox-" + input.attemptId.slice(0, 8)
    };
  }

  async verifyWebhook(signature: string) {
    return signature === "valid-signature";
  }
}

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)(
  "database-backed Phase 7 payment lifecycle",
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
    const gateway = new FakeHesabPayGateway();
    const paymentService = new PaymentService(
      new DatabasePaymentRepository(client.db),
      deliveryService,
      gateway
    );
    const app = buildApp({
      authService,
      storeService,
      catalogService,
      cartPricingService,
      deliveryService,
      paymentService
    });

    let ownerUserId: string | null = null;
    let customerUserId: string | null = null;

    afterAll(async () => {
      if (customerUserId) {
        await client.db
          .delete(paymentAttempts)
          .where(eq(paymentAttempts.userId, customerUserId));
      }

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
      "supports merchant settings, hosted payments, verified webhooks, manual methods, idempotency, and refunds",
      async () => {
        const owner = await authService.register({
          email: "payment-owner-" + randomUUID() + "@example.com",
          password: "payment-password",
          displayName: "Payment Owner",
          preferredLocale: "fa-AF"
        });
        const customer = await authService.register({
          email: "payment-customer-" + randomUUID() + "@example.com",
          password: "payment-password",
          displayName: "Payment Customer",
          preferredLocale: "fa-AF"
        });

        ownerUserId = owner.user.id;
        customerUserId = customer.user.id;

        const store = await storeService.createStore(owner.user.id, {
          name: "Phase 7 Kabul Store",
          handle: "payment-" + randomUUID().slice(0, 8),
          category: "Electronics",
          province: "Kabul",
          cityDistrict: "District 3",
          phone: "+93700000007",
          preferredLocale: "fa-AF",
          physicalAddress: "Karte 4, Kabul"
        });

        const category = await catalogService.createCategory(
          owner.user.id,
          store.id,
          { name: "Payment Products", sortOrder: 1 }
        );
        const product = await catalogService.createProduct(
          owner.user.id,
          store.id,
          {
            name: "Phase 7 Product",
            categoryId: category.id,
            price: 1000,
            availableQuantity: 10
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

        const addCart = await app.inject({
          method: "POST",
          url: "/customer/cart/items",
          headers: customerHeaders,
          payload: { productId: product.id, quantity: 1 }
        });
        expect(addCart.statusCode).toBe(201);

        const addressResponse = await app.inject({
          method: "POST",
          url: "/customer/addresses",
          headers: customerHeaders,
          payload: {
            label: "Payment Home",
            recipientName: "Payment Customer",
            province: "Kabul",
            districtCity: "District 3",
            areaNeighborhood: "Karte 4",
            addressDescription: "Blue gate",
            phone: "+93700111117"
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

        const paymentSettings = await app.inject({
          method: "GET",
          url: "/seller/stores/" + store.id + "/payments",
          headers: ownerHeaders
        });
        expect(paymentSettings.statusCode).toBe(200);
        expect(paymentSettings.json()).toMatchObject({
          settings: {
            cashOnDeliveryEnabled: true,
            hesabpayEnabled: false,
            cardEnabled: false,
            payAtStoreEnabled: true
          },
          providerReadiness: {
            hesabpayHostedCheckout: true,
            cardViaHesabPay: true
          }
        });

        const forbiddenSettings = await app.inject({
          method: "GET",
          url: "/seller/stores/" + store.id + "/payments",
          headers: customerHeaders
        });
        expect(forbiddenSettings.statusCode).toBe(404);

        const enableDigital = await app.inject({
          method: "PUT",
          url: "/seller/stores/" + store.id + "/payments",
          headers: ownerHeaders,
          payload: {
            hesabpayEnabled: true,
            cardEnabled: true
          }
        });
        expect(enableDigital.statusCode).toBe(200);

        const deliveryOptions = await app.inject({
          method: "POST",
          url: "/customer/delivery/options",
          headers: customerHeaders,
          payload: { addressId: address.id }
        });
        expect(deliveryOptions.statusCode).toBe(200);

        const deliveryOption = deliveryOptions
          .json()
          .merchantGroups[0].options.find(
            (option: { fulfillmentType: string }) =>
              option.fulfillmentType === "delivery"
          );
        const pickupOption = deliveryOptions
          .json()
          .merchantGroups[0].options.find(
            (option: { fulfillmentType: string }) =>
              option.fulfillmentType === "pickup"
          );
        expect(deliveryOption).toBeTruthy();
        expect(pickupOption).toBeTruthy();

        const deliveryQuote = await app.inject({
          method: "POST",
          url: "/customer/delivery/checkout-quote",
          headers: customerHeaders,
          payload: {
            addressId: address.id,
            selections: [
              {
                storeId: store.id,
                optionId: deliveryOption.optionId
              }
            ]
          }
        });
        expect(deliveryQuote.statusCode).toBe(201);
        const deliverySessionId = deliveryQuote.json().sessionId;

        const methodOptions = await app.inject({
          method: "GET",
          url: "/customer/payments/options/" + deliverySessionId,
          headers: customerHeaders
        });
        expect(methodOptions.statusCode).toBe(200);
        const methods = methodOptions.json().merchantGroups[0].methods;
        expect(
          methods.find(
            (method: { method: string }) =>
              method.method === "cash_on_delivery"
          )
        ).toMatchObject({ available: true, provider: "manual" });
        expect(
          methods.find(
            (method: { method: string }) => method.method === "hesabpay"
          )
        ).toMatchObject({
          available: true,
          provider: "hesabpay",
          requiresHostedCheckout: true
        });
        expect(
          methods.find(
            (method: { method: string }) => method.method === "card"
          )
        ).toMatchObject({
          available: true,
          provider: "hesabpay"
        });
        expect(
          methods.find(
            (method: { method: string }) =>
              method.method === "pay_at_store"
          )
        ).toMatchObject({
          available: false,
          unavailableReason: "pickup_required"
        });

        const hostedAttempt = await app.inject({
          method: "POST",
          url: "/customer/payments/attempts",
          headers: customerHeaders,
          payload: {
            checkoutSessionId: deliverySessionId,
            idempotencyKey: "hosted-" + randomUUID(),
            selections: [
              {
                storeId: store.id,
                method: "card"
              }
            ]
          }
        });
        expect(hostedAttempt.statusCode).toBe(201);
        expect(hostedAttempt.json()).toMatchObject({
          canProceedToReview: false,
          requiresCustomerAction: true,
          attempts: [
            {
              storeId: store.id,
              method: "card",
              provider: "hesabpay",
              state: "pending"
            }
          ]
        });
        const onlineAttempt = hostedAttempt.json().attempts[0];
        expect(onlineAttempt.hostedCheckoutUrl).toContain(
          "https://checkout.example.test/"
        );
        expect(gateway.createCalls).toHaveLength(1);

        const forgedWebhook = await app.inject({
          method: "POST",
          url: "/webhooks/hesabpay",
          payload: {
            signature: "forged-signature",
            timestamp: "1707719607",
            user_id: onlineAttempt.id,
            amount: onlineAttempt.amount,
            transaction_id: "tx-forged",
            success: true
          }
        });
        expect(forgedWebhook.statusCode).toBe(401);

        const pendingStatus = await app.inject({
          method: "GET",
          url: "/customer/payments/status/" + deliverySessionId,
          headers: customerHeaders
        });
        expect(pendingStatus.statusCode).toBe(200);
        expect(pendingStatus.json().canProceedToReview).toBe(false);

        const validWebhookPayload = {
          signature: "valid-signature",
          timestamp: "1707719607",
          user_id: onlineAttempt.id,
          amount: onlineAttempt.amount,
          transaction_id: "tx-" + randomUUID(),
          sender_account: "793111222",
          success: true,
          message: "Operation successful"
        };
        const validWebhook = await app.inject({
          method: "POST",
          url: "/webhooks/hesabpay",
          payload: validWebhookPayload
        });
        expect(validWebhook.statusCode).toBe(200);
        expect(validWebhook.json()).toMatchObject({
          received: true,
          attemptId: onlineAttempt.id,
          state: "paid"
        });

        const duplicateWebhook = await app.inject({
          method: "POST",
          url: "/webhooks/hesabpay",
          payload: validWebhookPayload
        });
        expect(duplicateWebhook.statusCode).toBe(200);
        expect(duplicateWebhook.json().state).toBe("paid");

        const paidStatus = await app.inject({
          method: "GET",
          url: "/customer/payments/status/" + deliverySessionId,
          headers: customerHeaders
        });
        expect(paidStatus.statusCode).toBe(200);
        expect(paidStatus.json()).toMatchObject({
          canProceedToReview: true,
          requiresCustomerAction: false,
          steps: {
            payment: "ready",
            review: "payment_ready",
            placeOrder: "blocked_until_phase_8"
          }
        });

        const refund = await app.inject({
          method: "POST",
          url:
            "/seller/stores/" +
            store.id +
            "/payments/" +
            onlineAttempt.id +
            "/refund",
          headers: ownerHeaders,
          payload: {}
        });
        expect(refund.statusCode).toBe(200);
        expect(refund.json()).toMatchObject({
          manualActionRequired: true,
          attempt: {
            id: onlineAttempt.id,
            state: "refund_pending",
            refundState: "pending"
          }
        });

        const codQuote = await app.inject({
          method: "POST",
          url: "/customer/delivery/checkout-quote",
          headers: customerHeaders,
          payload: {
            addressId: address.id,
            selections: [
              {
                storeId: store.id,
                optionId: deliveryOption.optionId
              }
            ]
          }
        });
        expect(codQuote.statusCode).toBe(201);
        const codSessionId = codQuote.json().sessionId;
        const codKey = "cod-" + randomUUID();

        const codAttempt = await app.inject({
          method: "POST",
          url: "/customer/payments/attempts",
          headers: customerHeaders,
          payload: {
            checkoutSessionId: codSessionId,
            idempotencyKey: codKey,
            selections: [
              {
                storeId: store.id,
                method: "cash_on_delivery"
              }
            ]
          }
        });
        expect(codAttempt.statusCode).toBe(201);
        expect(codAttempt.json()).toMatchObject({
          canProceedToReview: true,
          requiresCustomerAction: false,
          attempts: [
            {
              method: "cash_on_delivery",
              provider: "manual",
              state: "pending"
            }
          ]
        });
        const codAttemptId = codAttempt.json().attempts[0].id;

        const codDuplicate = await app.inject({
          method: "POST",
          url: "/customer/payments/attempts",
          headers: customerHeaders,
          payload: {
            checkoutSessionId: codSessionId,
            idempotencyKey: codKey,
            selections: [
              {
                storeId: store.id,
                method: "cash_on_delivery"
              }
            ]
          }
        });
        expect(codDuplicate.statusCode).toBe(201);
        expect(codDuplicate.json().attempts[0].id).toBe(codAttemptId);

        const pickupQuote = await app.inject({
          method: "POST",
          url: "/customer/delivery/checkout-quote",
          headers: customerHeaders,
          payload: {
            addressId: address.id,
            selections: [
              {
                storeId: store.id,
                optionId: pickupOption.optionId
              }
            ]
          }
        });
        expect(pickupQuote.statusCode).toBe(201);

        const payAtStore = await app.inject({
          method: "POST",
          url: "/customer/payments/attempts",
          headers: customerHeaders,
          payload: {
            checkoutSessionId: pickupQuote.json().sessionId,
            idempotencyKey: "pickup-" + randomUUID(),
            selections: [
              {
                storeId: store.id,
                method: "pay_at_store"
              }
            ]
          }
        });
        expect(payAtStore.statusCode).toBe(201);
        expect(payAtStore.json()).toMatchObject({
          canProceedToReview: true,
          attempts: [
            {
              method: "pay_at_store",
              provider: "manual",
              state: "pending"
            }
          ]
        });
      }
    );
  }
);
