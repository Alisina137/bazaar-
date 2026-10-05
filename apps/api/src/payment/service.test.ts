import type {
  DeliveryCheckoutQuoteResponse,
  PaymentAttemptRecord,
  StorePaymentSettingsRecord
} from "@bazaarlink/contracts";
import { describe, expect, it, vi } from "vitest";

import type { DeliveryServiceContract } from "../delivery/service.js";
import type { PaymentGateway } from "./provider.js";
import type { PaymentRepository } from "./repository.js";
import { PaymentService } from "./service.js";

const STORE_ID = "33333333-3333-4333-8333-333333333333";
const SESSION_ID = "11111111-1111-4111-8111-111111111111";

function quote(
  fulfillmentType: "delivery" | "pickup" | "digital" = "delivery"
): DeliveryCheckoutQuoteResponse {
  return {
    sessionId: SESSION_ID,
    status: "quoted",
    cart: {
      id: "cart",
      currency: "AFN",
      groups: [
        {
          store: {
            id: STORE_ID,
            name: "Store"
          },
          items: [
            {
              id: "item",
              name: "Phone",
              variantTitle: null,
              lineTotal: 1000
            }
          ],
          preDeliveryTotal: 1000
        }
      ]
    },
    deliverySelections: [
      {
        storeId: STORE_ID,
        optionId: "delivery",
        fulfillmentType,
        label: "Standard",
        price: {
          baseDelivery: 50,
          urgencySurcharge: 0,
          productDeliverySurcharge: 0,
          freeDeliveryDiscount: 0,
          finalDeliveryPrice: 50
        }
      }
    ],
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  } as unknown as DeliveryCheckoutQuoteResponse;
}

function settings(): StorePaymentSettingsRecord {
  return {
    storeId: STORE_ID,
    cashOnDeliveryEnabled: true,
    hesabpayEnabled: true,
    cardEnabled: true,
    payAtStoreEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function pendingAttempt(
  method: "hesabpay" | "card" = "hesabpay"
): PaymentAttemptRecord {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    userId: "user",
    checkoutSessionId: SESSION_ID,
    storeId: STORE_ID,
    orderId: null,
    method,
    provider: "hesabpay",
    state: "pending",
    amount: 1050,
    currency: "AFN",
    idempotencyKey: "idempotency",
    providerSessionId: "session",
    providerTransactionId: null,
    providerReference: null,
    hostedCheckoutUrl: "https://checkout.hesab.com/checkout/session",
    failureCode: null,
    failureReason: null,
    refundState: "none",
    refundedAmount: 0,
    metadata: {},
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    paidAt: null,
    failedAt: null,
    cancelledAt: null,
    refundedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

describe("PaymentService", () => {
  it("enforces fulfillment-specific manual methods", async () => {
    const repository = {
      getSettingsForStores: vi.fn().mockResolvedValue(
        new Map([[STORE_ID, settings()]])
      )
    } as unknown as PaymentRepository;
    const deliveryService = {
      getCheckoutQuote: vi.fn().mockResolvedValue(quote("delivery"))
    } as unknown as DeliveryServiceContract;
    const gateway = { ready: true } as PaymentGateway;

    const service = new PaymentService(
      repository,
      deliveryService,
      gateway
    );
    const result = await service.options("user", SESSION_ID);
    const methods = result.merchantGroups[0]?.methods ?? [];

    expect(
      methods.find((method) => method.method === "cash_on_delivery")
    ).toMatchObject({ available: true, provider: "manual" });
    expect(
      methods.find((method) => method.method === "pay_at_store")
    ).toMatchObject({
      available: false,
      unavailableReason: "pickup_required"
    });
    expect(
      methods.find((method) => method.method === "card")
    ).toMatchObject({
      available: true,
      provider: "hesabpay",
      requiresHostedCheckout: true
    });
  });

  it("allows pay-at-store only for pickup fulfillment", async () => {
    const repository = {
      getSettingsForStores: vi.fn().mockResolvedValue(
        new Map([[STORE_ID, settings()]])
      )
    } as unknown as PaymentRepository;
    const deliveryService = {
      getCheckoutQuote: vi.fn().mockResolvedValue(quote("pickup"))
    } as unknown as DeliveryServiceContract;

    const result = await new PaymentService(
      repository,
      deliveryService,
      { ready: true } as PaymentGateway
    ).options("user", SESSION_ID);

    expect(
      result.merchantGroups[0]?.methods.find(
        (method) => method.method === "pay_at_store"
      )
    ).toMatchObject({ available: true });
    expect(
      result.merchantGroups[0]?.methods.find(
        (method) => method.method === "cash_on_delivery"
      )
    ).toMatchObject({
      available: false,
      unavailableReason: "delivery_required"
    });
  });

  it("does not accept a forged payment success webhook", async () => {
    const service = new PaymentService(
      {} as PaymentRepository,
      {} as DeliveryServiceContract,
      {
        ready: true,
        createSession: vi.fn(),
        verifyWebhook: vi.fn().mockResolvedValue(false)
      }
    );

    await expect(
      service.processHesabPayWebhook({
        signature: "forged",
        timestamp: "1707719607",
        user_id: "44444444-4444-4444-8444-444444444444",
        amount: 1050,
        success: true
      })
    ).rejects.toMatchObject({
      code: "webhook_unverified",
      statusCode: 401
    });
  });

  it("keeps hosted payments blocked until the verified webhook marks them paid", async () => {
    const attempt = pendingAttempt();
    const repository = {
      getSettingsForStores: vi.fn().mockResolvedValue(
        new Map([[STORE_ID, settings()]])
      ),
      listAttempts: vi.fn().mockResolvedValue([attempt])
    } as unknown as PaymentRepository;
    const deliveryService = {
      getCheckoutQuote: vi.fn().mockResolvedValue(quote("delivery"))
    } as unknown as DeliveryServiceContract;

    const status = await new PaymentService(
      repository,
      deliveryService,
      { ready: true } as PaymentGateway
    ).status("user", SESSION_ID);

    expect(status.canProceedToReview).toBe(false);
    expect(status.requiresCustomerAction).toBe(true);
    expect(status.steps.payment).toBe("action_required");
  });
});
