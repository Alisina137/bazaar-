import type {
  MerchantPaymentConfigurationResponse,
  PaymentAttemptRecord,
  PaymentEventSource,
  PaymentMethod,
  PaymentProvider,
  PaymentRefundState,
  PaymentState,
  StorePaymentSettingsRecord,
  UpdateStorePaymentSettingsInput
} from "@bazaarlink/contracts";
import {
  checkoutSessions,
  paymentAttempts,
  paymentStateEvents,
  storePaymentSettings,
  storeSubscriptions,
  stores,
  type Database,
  type PaymentAttempt,
  type StorePaymentSettings
} from "@bazaarlink/database";
import { and, desc, eq, inArray } from "drizzle-orm";

import { getStoreEntitlements } from "../store/entitlements.js";

export interface PaymentCheckoutSessionRecord {
  id: string;
  userId: string;
  status: "draft" | "quoted" | "expired" | "ordered";
  pricingSnapshot: Record<string, unknown> | null;
  expiresAt: Date | null;
}

export interface PaymentRepository {
  getMerchantConfiguration(
    ownerUserId: string,
    storeId: string
  ): Promise<Omit<MerchantPaymentConfigurationResponse, "providerReadiness"> | null>;
  getSettingsForStores(
    storeIds: string[]
  ): Promise<Map<string, StorePaymentSettingsRecord>>;
  updateSettings(
    ownerUserId: string,
    storeId: string,
    input: UpdateStorePaymentSettingsInput
  ): Promise<StorePaymentSettingsRecord | null>;
  getCheckoutSession(
    userId: string,
    sessionId: string
  ): Promise<PaymentCheckoutSessionRecord | null>;
  createOrGetAttempt(input: {
    userId: string;
    checkoutSessionId: string;
    storeId: string;
    method: PaymentMethod;
    provider: PaymentProvider;
    amount: number;
    idempotencyKey: string;
    expiresAt: Date | null;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentAttemptRecord>;
  findAttempt(attemptId: string): Promise<PaymentAttemptRecord | null>;
  findUserAttempt(
    userId: string,
    attemptId: string
  ): Promise<PaymentAttemptRecord | null>;
  listAttempts(
    userId: string,
    checkoutSessionId: string
  ): Promise<PaymentAttemptRecord[]>;
  updateProviderData(
    attemptId: string,
    input: {
      providerSessionId?: string | null;
      providerTransactionId?: string | null;
      providerReference?: string | null;
      hostedCheckoutUrl?: string | null;
      failureCode?: string | null;
      failureReason?: string | null;
    }
  ): Promise<PaymentAttemptRecord | null>;
  transition(input: {
    attemptId: string;
    expectedStates: PaymentState[];
    toState: PaymentState;
    source: PaymentEventSource;
    providerEventId?: string | null;
    deduplicationKey?: string | null;
    payloadFingerprint?: string | null;
    details?: Record<string, unknown>;
    refundState?: PaymentRefundState;
    failureCode?: string | null;
    failureReason?: string | null;
  }): Promise<PaymentAttemptRecord | null>;
}

function toSettings(row: StorePaymentSettings): StorePaymentSettingsRecord {
  return {
    storeId: row.storeId,
    cashOnDeliveryEnabled: row.cashOnDeliveryEnabled,
    hesabpayEnabled: row.hesabpayEnabled,
    cardEnabled: row.cardEnabled,
    payAtStoreEnabled: row.payAtStoreEnabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toAttempt(row: PaymentAttempt): PaymentAttemptRecord {
  return {
    id: row.id,
    userId: row.userId,
    checkoutSessionId: row.checkoutSessionId,
    storeId: row.storeId,
    orderId: row.orderId,
    method: row.method,
    provider: row.provider,
    state: row.state,
    amount: Number(row.amount),
    currency: "AFN",
    idempotencyKey: row.idempotencyKey,
    providerSessionId: row.providerSessionId,
    providerTransactionId: row.providerTransactionId,
    providerReference: row.providerReference,
    hostedCheckoutUrl: row.hostedCheckoutUrl,
    failureCode: row.failureCode,
    failureReason: row.failureReason,
    refundState: row.refundState,
    refundedAmount: Number(row.refundedAmount),
    metadata: row.metadata,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    refundedAt: row.refundedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export class DatabasePaymentRepository implements PaymentRepository {
  constructor(private readonly db: Database) {}

  private async ensureSettings(
    storeId: string
  ): Promise<StorePaymentSettingsRecord> {
    const [existing] = await this.db
      .select()
      .from(storePaymentSettings)
      .where(eq(storePaymentSettings.storeId, storeId))
      .limit(1);

    if (existing) return toSettings(existing);

    const [created] = await this.db
      .insert(storePaymentSettings)
      .values({ storeId })
      .onConflictDoNothing({ target: storePaymentSettings.storeId })
      .returning();

    if (created) return toSettings(created);

    const [concurrent] = await this.db
      .select()
      .from(storePaymentSettings)
      .where(eq(storePaymentSettings.storeId, storeId))
      .limit(1);

    if (!concurrent) throw new Error("payment_settings_create_failed");
    return toSettings(concurrent);
  }

  async getMerchantConfiguration(
    ownerUserId: string,
    storeId: string
  ): Promise<Omit<MerchantPaymentConfigurationResponse, "providerReadiness"> | null> {
    const [row] = await this.db
      .select({
        id: stores.id,
        name: stores.name,
        plan: storeSubscriptions.plan,
        subscriptionStatus: storeSubscriptions.status,
        currentPeriodEnd: storeSubscriptions.currentPeriodEnd,
        gracePeriodEnd: storeSubscriptions.gracePeriodEnd
      })
      .from(stores)
      .innerJoin(
        storeSubscriptions,
        eq(storeSubscriptions.storeId, stores.id)
      )
      .where(
        and(
          eq(stores.id, storeId),
          eq(stores.ownerUserId, ownerUserId)
        )
      )
      .limit(1);

    if (!row) return null;
    const entitlements = getStoreEntitlements(row.plan);

    return {
      store: {
        id: row.id,
        name: row.name,
        subscription: {
          plan: row.plan,
          status: row.subscriptionStatus,
          currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
          gracePeriodEnd: row.gracePeriodEnd?.toISOString() ?? null,
          entitlements
        }
      },
      entitlements,
      settings: await this.ensureSettings(row.id)
    };
  }

  async getSettingsForStores(
    storeIds: string[]
  ): Promise<Map<string, StorePaymentSettingsRecord>> {
    const uniqueIds = [...new Set(storeIds)];
    if (uniqueIds.length === 0) return new Map();

    const existing = await this.db
      .select()
      .from(storePaymentSettings)
      .where(inArray(storePaymentSettings.storeId, uniqueIds));
    const map = new Map(existing.map((row) => [row.storeId, toSettings(row)]));

    for (const storeId of uniqueIds) {
      if (!map.has(storeId)) {
        map.set(storeId, await this.ensureSettings(storeId));
      }
    }

    return map;
  }

  async updateSettings(
    ownerUserId: string,
    storeId: string,
    input: UpdateStorePaymentSettingsInput
  ): Promise<StorePaymentSettingsRecord | null> {
    const config = await this.getMerchantConfiguration(ownerUserId, storeId);
    if (!config) return null;

    const [updated] = await this.db
      .update(storePaymentSettings)
      .set({
        ...(input.cashOnDeliveryEnabled !== undefined
          ? { cashOnDeliveryEnabled: input.cashOnDeliveryEnabled }
          : {}),
        ...(input.hesabpayEnabled !== undefined
          ? { hesabpayEnabled: input.hesabpayEnabled }
          : {}),
        ...(input.cardEnabled !== undefined
          ? { cardEnabled: input.cardEnabled }
          : {}),
        ...(input.payAtStoreEnabled !== undefined
          ? { payAtStoreEnabled: input.payAtStoreEnabled }
          : {}),
        updatedAt: new Date()
      })
      .where(eq(storePaymentSettings.storeId, storeId))
      .returning();

    return updated ? toSettings(updated) : null;
  }

  async getCheckoutSession(
    userId: string,
    sessionId: string
  ): Promise<PaymentCheckoutSessionRecord | null> {
    const [row] = await this.db
      .select({
        id: checkoutSessions.id,
        userId: checkoutSessions.userId,
        status: checkoutSessions.status,
        pricingSnapshot: checkoutSessions.pricingSnapshot,
        expiresAt: checkoutSessions.expiresAt
      })
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.id, sessionId),
          eq(checkoutSessions.userId, userId)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async createOrGetAttempt(input: {
    userId: string;
    checkoutSessionId: string;
    storeId: string;
    method: PaymentMethod;
    provider: PaymentProvider;
    amount: number;
    idempotencyKey: string;
    expiresAt: Date | null;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentAttemptRecord> {
    const [created] = await this.db
      .insert(paymentAttempts)
      .values({
        userId: input.userId,
        checkoutSessionId: input.checkoutSessionId,
        storeId: input.storeId,
        method: input.method,
        provider: input.provider,
        amount: input.amount.toFixed(2),
        idempotencyKey: input.idempotencyKey,
        expiresAt: input.expiresAt,
        metadata: input.metadata ?? {}
      })
      .onConflictDoNothing({ target: paymentAttempts.idempotencyKey })
      .returning();

    if (created) {
      await this.db.insert(paymentStateEvents).values({
        paymentAttemptId: created.id,
        fromState: null,
        toState: "created",
        source: "system",
        details: { reason: "payment_attempt_created" }
      });
      return toAttempt(created);
    }

    const [existing] = await this.db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.idempotencyKey, input.idempotencyKey))
      .limit(1);

    if (!existing) throw new Error("payment_attempt_create_failed");
    return toAttempt(existing);
  }

  async findAttempt(attemptId: string): Promise<PaymentAttemptRecord | null> {
    const [row] = await this.db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.id, attemptId))
      .limit(1);

    return row ? toAttempt(row) : null;
  }

  async findUserAttempt(
    userId: string,
    attemptId: string
  ): Promise<PaymentAttemptRecord | null> {
    const [row] = await this.db
      .select()
      .from(paymentAttempts)
      .where(
        and(
          eq(paymentAttempts.id, attemptId),
          eq(paymentAttempts.userId, userId)
        )
      )
      .limit(1);

    return row ? toAttempt(row) : null;
  }

  async listAttempts(
    userId: string,
    checkoutSessionId: string
  ): Promise<PaymentAttemptRecord[]> {
    const rows = await this.db
      .select()
      .from(paymentAttempts)
      .where(
        and(
          eq(paymentAttempts.userId, userId),
          eq(paymentAttempts.checkoutSessionId, checkoutSessionId)
        )
      )
      .orderBy(desc(paymentAttempts.createdAt));

    return rows.map(toAttempt);
  }

  async updateProviderData(
    attemptId: string,
    input: {
      providerSessionId?: string | null;
      providerTransactionId?: string | null;
      providerReference?: string | null;
      hostedCheckoutUrl?: string | null;
      failureCode?: string | null;
      failureReason?: string | null;
    }
  ): Promise<PaymentAttemptRecord | null> {
    const [row] = await this.db
      .update(paymentAttempts)
      .set({
        ...input,
        updatedAt: new Date()
      })
      .where(eq(paymentAttempts.id, attemptId))
      .returning();

    return row ? toAttempt(row) : null;
  }

  async transition(input: {
    attemptId: string;
    expectedStates: PaymentState[];
    toState: PaymentState;
    source: PaymentEventSource;
    providerEventId?: string | null;
    deduplicationKey?: string | null;
    payloadFingerprint?: string | null;
    details?: Record<string, unknown>;
    refundState?: PaymentRefundState;
    failureCode?: string | null;
    failureReason?: string | null;
  }): Promise<PaymentAttemptRecord | null> {
    return this.db.transaction(async (tx) => {
      if (input.deduplicationKey) {
        const [duplicate] = await tx
          .select({ id: paymentStateEvents.id })
          .from(paymentStateEvents)
          .where(
            eq(
              paymentStateEvents.deduplicationKey,
              input.deduplicationKey
            )
          )
          .limit(1);

        if (duplicate) {
          const [current] = await tx
            .select()
            .from(paymentAttempts)
            .where(eq(paymentAttempts.id, input.attemptId))
            .limit(1);
          return current ? toAttempt(current) : null;
        }
      }

      const [current] = await tx
        .select()
        .from(paymentAttempts)
        .where(eq(paymentAttempts.id, input.attemptId))
        .limit(1);

      if (!current) return null;
      if (current.state === input.toState) return toAttempt(current);
      if (!input.expectedStates.includes(current.state)) return null;

      const now = new Date();
      const [updated] = await tx
        .update(paymentAttempts)
        .set({
          state: input.toState,
          ...(input.refundState !== undefined
            ? { refundState: input.refundState }
            : {}),
          ...(input.failureCode !== undefined
            ? { failureCode: input.failureCode }
            : {}),
          ...(input.failureReason !== undefined
            ? { failureReason: input.failureReason }
            : {}),
          ...(input.toState === "paid" ? { paidAt: now } : {}),
          ...(input.toState === "failed" ? { failedAt: now } : {}),
          ...(input.toState === "cancelled" ? { cancelledAt: now } : {}),
          ...(input.toState === "refunded" ? { refundedAt: now } : {}),
          updatedAt: now
        })
        .where(
          and(
            eq(paymentAttempts.id, input.attemptId),
            eq(paymentAttempts.state, current.state)
          )
        )
        .returning();

      if (!updated) return null;

      await tx
        .insert(paymentStateEvents)
        .values({
          paymentAttemptId: input.attemptId,
          fromState: current.state,
          toState: input.toState,
          source: input.source,
          providerEventId: input.providerEventId ?? null,
          deduplicationKey: input.deduplicationKey ?? null,
          payloadFingerprint: input.payloadFingerprint ?? null,
          details: input.details ?? {}
        })
        .onConflictDoNothing({
          target: paymentStateEvents.deduplicationKey
        });

      return toAttempt(updated);
    });
  }
}
