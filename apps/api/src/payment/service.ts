import type {
  CreatePaymentAttemptsInput,
  DeliveryCheckoutQuoteResponse,
  MerchantPaymentConfigurationResponse,
  PaymentAttemptRecord,
  PaymentCheckoutResponse,
  PaymentMethod,
  PaymentMethodAvailability,
  PaymentOptionsResponse,
  RefundPaymentResponse,
  UpdateStorePaymentSettingsInput
} from "@bazaarlink/contracts";
import { createHash } from "node:crypto";

import type { DeliveryServiceContract } from "../delivery/service.js";
import { PaymentError } from "./errors.js";
import type {
  HostedPaymentItem,
  PaymentGateway
} from "./provider.js";
import type { PaymentRepository } from "./repository.js";
import {
  assertPaymentStateTransition
} from "./state-machine.js";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function paymentProviderFor(method: PaymentMethod) {
  return method === "cash_on_delivery" || method === "pay_at_store"
    ? "manual" as const
    : "hesabpay" as const;
}

function latestByStore(attempts: PaymentAttemptRecord[]) {
  const map = new Map<string, PaymentAttemptRecord>();
  for (const attempt of attempts) {
    if (!map.has(attempt.storeId)) map.set(attempt.storeId, attempt);
  }
  return map;
}

export interface PaymentServiceContract {
  getMerchantConfiguration(
    ownerUserId: string,
    storeId: string
  ): Promise<MerchantPaymentConfigurationResponse>;
  updateMerchantSettings(
    ownerUserId: string,
    storeId: string,
    input: UpdateStorePaymentSettingsInput
  ): Promise<MerchantPaymentConfigurationResponse>;
  options(
    userId: string,
    checkoutSessionId: string
  ): Promise<PaymentOptionsResponse>;
  createAttempts(
    userId: string,
    input: CreatePaymentAttemptsInput
  ): Promise<PaymentCheckoutResponse>;
  status(
    userId: string,
    checkoutSessionId: string
  ): Promise<PaymentCheckoutResponse>;
  cancel(
    userId: string,
    attemptId: string
  ): Promise<PaymentAttemptRecord>;
  requestRefund(
    ownerUserId: string,
    storeId: string,
    attemptId: string,
    amount?: number
  ): Promise<RefundPaymentResponse>;
  processHesabPayWebhook(
    payload: Record<string, unknown>
  ): Promise<PaymentAttemptRecord>;
}

export class PaymentService implements PaymentServiceContract {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly deliveryService: DeliveryServiceContract,
    private readonly gateway: PaymentGateway
  ) {}

  private providerReadiness() {
    return {
      hesabpayHostedCheckout: this.gateway.ready,
      cardViaHesabPay: this.gateway.ready
    };
  }

  private async merchantBase(
    ownerUserId: string,
    storeId: string
  ) {
    const config = await this.repository.getMerchantConfiguration(
      ownerUserId,
      storeId
    );

    if (!config) {
      throw new PaymentError("store_not_found", 404);
    }

    if (
      !["active", "grace_period"].includes(
        config.store.subscription.status
      )
    ) {
      throw new PaymentError("subscription_unavailable", 409);
    }

    return config;
  }

  async getMerchantConfiguration(
    ownerUserId: string,
    storeId: string
  ): Promise<MerchantPaymentConfigurationResponse> {
    return {
      ...(await this.merchantBase(ownerUserId, storeId)),
      providerReadiness: this.providerReadiness()
    };
  }

  async updateMerchantSettings(
    ownerUserId: string,
    storeId: string,
    input: UpdateStorePaymentSettingsInput
  ): Promise<MerchantPaymentConfigurationResponse> {
    await this.merchantBase(ownerUserId, storeId);

    if (
      !this.gateway.ready &&
      (input.hesabpayEnabled === true || input.cardEnabled === true)
    ) {
      throw new PaymentError("provider_unavailable", 409);
    }

    const updated = await this.repository.updateSettings(
      ownerUserId,
      storeId,
      input
    );
    if (!updated) throw new PaymentError("store_not_found", 404);

    return this.getMerchantConfiguration(ownerUserId, storeId);
  }

  private methodAvailability(
    method: PaymentMethod,
    settings: {
      cashOnDeliveryEnabled: boolean;
      hesabpayEnabled: boolean;
      cardEnabled: boolean;
      payAtStoreEnabled: boolean;
    },
    fulfillmentType: "delivery" | "pickup" | "digital"
  ): PaymentMethodAvailability {
    const provider = paymentProviderFor(method);
    const enabled =
      method === "cash_on_delivery"
        ? settings.cashOnDeliveryEnabled
        : method === "hesabpay"
          ? settings.hesabpayEnabled
          : method === "card"
            ? settings.cardEnabled
            : settings.payAtStoreEnabled;

    if (!enabled) {
      return {
        method,
        provider,
        available: false,
        unavailableReason: "merchant_disabled",
        requiresHostedCheckout: provider !== "manual"
      };
    }

    if (provider !== "manual" && !this.gateway.ready) {
      return {
        method,
        provider,
        available: false,
        unavailableReason: "provider_unavailable",
        requiresHostedCheckout: true
      };
    }

    if (method === "cash_on_delivery" && fulfillmentType !== "delivery") {
      return {
        method,
        provider,
        available: false,
        unavailableReason: "delivery_required",
        requiresHostedCheckout: false
      };
    }

    if (method === "pay_at_store" && fulfillmentType !== "pickup") {
      return {
        method,
        provider,
        available: false,
        unavailableReason: "pickup_required",
        requiresHostedCheckout: false
      };
    }

    return {
      method,
      provider,
      available: true,
      unavailableReason: null,
      requiresHostedCheckout: provider !== "manual"
    };
  }

  private async quote(
    userId: string,
    checkoutSessionId: string
  ): Promise<DeliveryCheckoutQuoteResponse> {
    try {
      return await this.deliveryService.getCheckoutQuote(
        userId,
        checkoutSessionId
      );
    } catch {
      throw new PaymentError("checkout_unavailable", 409);
    }
  }

  async options(
    userId: string,
    checkoutSessionId: string
  ): Promise<PaymentOptionsResponse> {
    const quote = await this.quote(userId, checkoutSessionId);
    const storeIds = quote.cart.groups.map((group) => group.store.id);
    const settings = await this.repository.getSettingsForStores(storeIds);
    const selectionByStore = new Map(
      quote.deliverySelections.map((selection) => [
        selection.storeId,
        selection
      ])
    );

    const merchantGroups = quote.cart.groups.map((group) => {
      const delivery = selectionByStore.get(group.store.id);
      if (!delivery) throw new PaymentError("checkout_unavailable", 409);
      const storeSettings = settings.get(group.store.id);
      if (!storeSettings) {
        throw new PaymentError("payment_configuration_not_found", 409);
      }

      const methods = (
        [
          "cash_on_delivery",
          "hesabpay",
          "card",
          "pay_at_store"
        ] as const
      ).map((method) =>
        this.methodAvailability(
          method,
          storeSettings,
          delivery.fulfillmentType
        )
      );

      return {
        storeId: group.store.id,
        storeName: group.store.name,
        amount: roundMoney(
          group.preDeliveryTotal + delivery.price.finalDeliveryPrice
        ),
        currency: "AFN" as const,
        fulfillmentType: delivery.fulfillmentType,
        methods
      };
    });

    return {
      checkoutSessionId,
      currency: "AFN",
      merchantGroups,
      canContinue: merchantGroups.every((group) =>
        group.methods.some((method) => method.available)
      ),
      expiresAt: quote.expiresAt
    };
  }

  private providerItems(
    quote: DeliveryCheckoutQuoteResponse,
    storeId: string
  ): HostedPaymentItem[] {
    const group = quote.cart.groups.find(
      (candidate) => candidate.store.id === storeId
    );
    const delivery = quote.deliverySelections.find(
      (candidate) => candidate.storeId === storeId
    );
    if (!group || !delivery) {
      throw new PaymentError("checkout_unavailable", 409);
    }

    const payableAmount = roundMoney(
      group.preDeliveryTotal + delivery.price.finalDeliveryPrice
    );

    return [
      {
        id: "store-" + storeId.slice(0, 36),
        name: "BazaarLink · " + group.store.name,
        price: payableAmount
      }
    ];
  }

  private checkoutState(
    checkoutSessionId: string,
    attempts: PaymentAttemptRecord[],
    storeIds: string[]
  ): PaymentCheckoutResponse {
    const latest = latestByStore(attempts);
    const chosen = storeIds
      .map((storeId) => latest.get(storeId))
      .filter((attempt): attempt is PaymentAttemptRecord => Boolean(attempt));
    const complete =
      chosen.length === storeIds.length &&
      chosen.every((attempt) =>
        attempt.provider === "manual"
          ? attempt.state === "pending"
          : attempt.state === "paid"
      );
    const requiresCustomerAction = chosen.some(
      (attempt) =>
        attempt.provider !== "manual" && attempt.state === "pending"
    );

    return {
      checkoutSessionId,
      attempts: chosen,
      canProceedToReview: complete,
      requiresCustomerAction,
      steps: {
        address: "ready",
        delivery: "ready",
        payment: complete ? "ready" : "action_required",
        review: complete ? "payment_ready" : "blocked",
        placeOrder: complete ? "ready" : "blocked"
      }
    };
  }

  async createAttempts(
    userId: string,
    input: CreatePaymentAttemptsInput
  ): Promise<PaymentCheckoutResponse> {
    const quote = await this.quote(userId, input.checkoutSessionId);
    const options = await this.options(userId, input.checkoutSessionId);

    if (!options.canContinue) {
      throw new PaymentError("payment_method_unavailable", 409);
    }

    const selectionByStore = new Map(
      input.selections.map((selection) => [
        selection.storeId,
        selection.method
      ])
    );
    if (selectionByStore.size !== options.merchantGroups.length) {
      throw new PaymentError("invalid_request", 400);
    }

    const attempts: PaymentAttemptRecord[] = [];
    for (const group of options.merchantGroups) {
      const method = selectionByStore.get(group.storeId);
      const availability = group.methods.find(
        (candidate) =>
          candidate.method === method && candidate.available
      );
      if (!method || !availability) {
        throw new PaymentError("payment_method_unavailable", 409);
      }

      const idempotencyKey =
        input.idempotencyKey + ":" + group.storeId;
      let attempt = await this.repository.createOrGetAttempt({
        userId,
        checkoutSessionId: input.checkoutSessionId,
        storeId: group.storeId,
        method,
        provider: availability.provider,
        amount: group.amount,
        idempotencyKey,
        expiresAt: new Date(options.expiresAt),
        metadata: {
          fulfillmentType: group.fulfillmentType,
          providerMode:
            availability.provider === "hesabpay"
              ? "hosted_checkout"
              : "manual"
        }
      });

      if (
        attempt.checkoutSessionId !== input.checkoutSessionId ||
        attempt.storeId !== group.storeId ||
        attempt.method !== method ||
        Math.abs(attempt.amount - group.amount) > 0.009
      ) {
        throw new PaymentError("payment_state_conflict", 409);
      }

      if (attempt.state === "created") {
        if (attempt.provider === "manual") {
          assertPaymentStateTransition("created", "pending");
          const transitioned = await this.repository.transition({
            attemptId: attempt.id,
            expectedStates: ["created"],
            toState: "pending",
            source: "system",
            details: { reason: "manual_payment_selected" }
          });
          if (!transitioned) {
            throw new PaymentError("payment_state_conflict", 409);
          }
          attempt = transitioned;
        } else {
          try {
            const session = await this.gateway.createSession({
              attemptId: attempt.id,
              method: method as "hesabpay" | "card",
              items: this.providerItems(quote, group.storeId)
            });
            const withProvider = await this.repository.updateProviderData(
              attempt.id,
              {
                providerSessionId: session.sessionId,
                hostedCheckoutUrl: session.url,
                failureCode: null,
                failureReason: null
              }
            );
            if (!withProvider) {
              throw new PaymentError("payment_attempt_not_found", 404);
            }

            assertPaymentStateTransition("created", "pending");
            const transitioned = await this.repository.transition({
              attemptId: attempt.id,
              expectedStates: ["created"],
              toState: "pending",
              source: "system",
              details: { reason: "hosted_checkout_created" }
            });
            if (!transitioned) {
              throw new PaymentError("payment_state_conflict", 409);
            }
            attempt = transitioned;
          } catch (error) {
            const reason =
              error instanceof PaymentError
                ? error.code
                : "provider_unavailable";
            const failed = await this.repository.transition({
              attemptId: attempt.id,
              expectedStates: ["created"],
              toState: "failed",
              source: "system",
              failureCode: reason,
              failureReason: "Hosted checkout session could not be created.",
              details: { reason }
            });
            attempt = failed ?? attempt;
          }
        }
      }

      attempts.push(attempt);
    }

    return this.checkoutState(
      input.checkoutSessionId,
      attempts,
      options.merchantGroups.map((group) => group.storeId)
    );
  }

  async status(
    userId: string,
    checkoutSessionId: string
  ): Promise<PaymentCheckoutResponse> {
    const options = await this.options(userId, checkoutSessionId);
    let attempts = await this.repository.listAttempts(
      userId,
      checkoutSessionId
    );

    for (const attempt of attempts) {
      if (
        attempt.state === "pending" &&
        attempt.expiresAt &&
        new Date(attempt.expiresAt).getTime() <= Date.now()
      ) {
        const expired = await this.repository.transition({
          attemptId: attempt.id,
          expectedStates: ["pending"],
          toState: "expired",
          source: "system",
          details: { reason: "checkout_quote_expired" }
        });
        if (expired) {
          attempts = attempts.map((candidate) =>
            candidate.id === expired.id ? expired : candidate
          );
        }
      }
    }

    return this.checkoutState(
      checkoutSessionId,
      attempts,
      options.merchantGroups.map((group) => group.storeId)
    );
  }

  async cancel(
    userId: string,
    attemptId: string
  ): Promise<PaymentAttemptRecord> {
    const attempt = await this.repository.findUserAttempt(userId, attemptId);
    if (!attempt) throw new PaymentError("payment_attempt_not_found", 404);

    const cancelled = await this.repository.transition({
      attemptId,
      expectedStates: ["created", "pending"],
      toState: "cancelled",
      source: "customer",
      details: { reason: "customer_cancelled" }
    });
    if (!cancelled) {
      throw new PaymentError("payment_state_conflict", 409);
    }
    return cancelled;
  }

  async requestRefund(
    ownerUserId: string,
    storeId: string,
    attemptId: string,
    amount?: number
  ): Promise<RefundPaymentResponse> {
    await this.merchantBase(ownerUserId, storeId);
    const attempt = await this.repository.findAttempt(attemptId);
    if (!attempt || attempt.storeId !== storeId) {
      throw new PaymentError("payment_attempt_not_found", 404);
    }

    if (!["paid", "partially_refunded"].includes(attempt.state)) {
      throw new PaymentError("refund_not_available", 409);
    }

    const remaining = roundMoney(attempt.amount - attempt.refundedAmount);
    const requestedAmount = amount ?? remaining;
    if (
      !Number.isFinite(requestedAmount) ||
      requestedAmount <= 0 ||
      requestedAmount > remaining
    ) {
      throw new PaymentError("invalid_request", 400);
    }

    assertPaymentStateTransition(
      attempt.state as "paid" | "partially_refunded",
      "refund_pending"
    );
    const updated = await this.repository.transition({
      attemptId,
      expectedStates: ["paid", "partially_refunded"],
      toState: "refund_pending",
      source: "merchant",
      refundState: "pending",
      details: {
        reason: "merchant_refund_requested",
        requestedAmount
      }
    });
    if (!updated) throw new PaymentError("payment_state_conflict", 409);

    return {
      attempt: updated,
      requestedAmount,
      manualActionRequired: true
    };
  }

  async processHesabPayWebhook(
    payload: Record<string, unknown>
  ): Promise<PaymentAttemptRecord> {
    const signature =
      typeof payload.signature === "string" ? payload.signature : null;
    const timestamp =
      typeof payload.timestamp === "string" ||
      typeof payload.timestamp === "number"
        ? String(payload.timestamp)
        : null;

    if (
      !signature ||
      !timestamp ||
      !(await this.gateway.verifyWebhook(signature, timestamp))
    ) {
      throw new PaymentError("webhook_unverified", 401);
    }

    const attemptId =
      typeof payload.user_id === "string" ? payload.user_id : null;
    if (!attemptId) throw new PaymentError("invalid_request", 400);

    let attempt = await this.repository.findAttempt(attemptId);
    if (!attempt || attempt.provider !== "hesabpay") {
      throw new PaymentError("payment_attempt_not_found", 404);
    }

    const amount =
      typeof payload.amount === "number"
        ? payload.amount
        : typeof payload.amount === "string"
          ? Number(payload.amount)
          : Number.NaN;
    if (
      !Number.isFinite(amount) ||
      Math.abs(roundMoney(amount) - attempt.amount) > 0.009
    ) {
      throw new PaymentError("webhook_unverified", 401);
    }

    const eventName =
      typeof payload.event === "string"
        ? payload.event
        : typeof payload.type === "string"
          ? payload.type
          : null;
    const successful =
      eventName === "payment_success"
        ? true
        : eventName === "payment_failure"
          ? false
          : payload.success === true
            ? true
            : payload.success === false
              ? false
              : null;
    if (successful === null) {
      throw new PaymentError("invalid_request", 400);
    }

    const transactionId =
      typeof payload.transaction_id === "string"
        ? payload.transaction_id
        : null;
    const reference =
      typeof payload.sender_account === "string"
        ? payload.sender_account
        : null;

    attempt =
      (await this.repository.updateProviderData(attempt.id, {
        providerTransactionId:
          transactionId ?? attempt.providerTransactionId,
        providerReference: reference ?? attempt.providerReference
      })) ?? attempt;

    if (successful && attempt.state === "created") {
      const pending = await this.repository.transition({
        attemptId: attempt.id,
        expectedStates: ["created"],
        toState: "pending",
        source: "provider_webhook",
        details: { reason: "webhook_arrived_before_session_transition" }
      });
      if (pending) attempt = pending;
    }

    const target = successful ? "paid" : "failed";
    if (attempt.state === target) return attempt;

    const sanitized = { ...payload };
    delete sanitized.signature;
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(sanitized))
      .digest("hex");
    const deduplicationKey =
      "hesabpay:" +
      (transactionId ?? attempt.id) +
      ":" +
      target;

    const transitioned = await this.repository.transition({
      attemptId: attempt.id,
      expectedStates: successful
        ? ["pending"]
        : ["created", "pending"],
      toState: target,
      source: "provider_webhook",
      providerEventId: transactionId,
      deduplicationKey,
      payloadFingerprint: fingerprint,
      failureCode: successful ? null : "provider_rejected",
      failureReason: successful
        ? null
        : typeof payload.message === "string"
          ? payload.message.slice(0, 1000)
          : "Payment failed at provider.",
      details: sanitized
    });

    if (!transitioned) {
      const current = await this.repository.findAttempt(attempt.id);
      if (current?.state === target) return current;
      throw new PaymentError("payment_state_conflict", 409);
    }

    return transitioned;
  }
}
