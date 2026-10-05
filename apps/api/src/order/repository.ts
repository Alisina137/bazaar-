import type {
  DeliveryCheckoutQuoteResponse,
  InventoryReservationRecord,
  MerchantOrderAction,
  OrderEventRecord,
  OrderFulfillmentRecord,
  OrderItemRecord,
  OrderRecord,
  OrderState,
  PaymentAttemptRecord
} from "@bazaarlink/contracts";
import {
  cartItems,
  cartStoreCoupons,
  checkoutSessions,
  inventoryMovements,
  inventoryReservations,
  orderFulfillments,
  orderItems,
  orders,
  orderStateEvents,
  paymentAttempts,
  paymentStateEvents,
  products,
  productVariants,
  storeSubscriptions,
  stores,
  type Database,
  type InventoryReservation,
  type Order,
  type OrderFulfillment,
  type OrderItem,
  type OrderStateEvent
} from "@bazaarlink/database";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  lte,
  sql
} from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { OrderError } from "./errors.js";
import {
  customerCanCancel,
  merchantOrderTransition
} from "./state-machine.js";

const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

function money(value: string): number {
  return Number(value);
}

function orderNumber(): string {
  return (
    "BZ-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    randomUUID().slice(0, 8).toUpperCase()
  );
}

function paymentReady(attempt: PaymentAttemptRecord): boolean {
  return attempt.provider === "manual"
    ? attempt.state === "pending"
    : attempt.state === "paid";
}

function sourceForPayment(
  source: "customer" | "merchant" | "system"
): "customer" | "merchant" | "system" {
  return source;
}

function toItem(row: OrderItem): OrderItemRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    productId: row.productId,
    variantId: row.variantId,
    productName: row.productName,
    variantTitle: row.variantTitle,
    imageUrl: row.imageUrl,
    quantity: row.quantity,
    unitListPrice: money(row.unitListPrice),
    unitPrice: money(row.unitPrice),
    lineItemsSubtotal: money(row.lineItemsSubtotal),
    lineProductDiscount: money(row.lineProductDiscount),
    lineTotal: money(row.lineTotal),
    createdAt: row.createdAt.toISOString()
  };
}

function toFulfillment(row: OrderFulfillment): OrderFulfillmentRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    type: row.type,
    state: row.state,
    label: row.label,
    trackingCode: row.trackingCode,
    expectedMinAt: row.expectedMinAt?.toISOString() ?? null,
    expectedMaxAt: row.expectedMaxAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    readyAt: row.readyAt?.toISOString() ?? null,
    dispatchedAt: row.dispatchedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toReservation(
  row: InventoryReservation
): InventoryReservationRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    orderItemId: row.orderItemId,
    productId: row.productId,
    variantId: row.variantId,
    quantity: row.quantity,
    state: row.state,
    expiresAt: row.expiresAt.toISOString(),
    committedAt: row.committedAt?.toISOString() ?? null,
    releasedAt: row.releasedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toEvent(row: OrderStateEvent): OrderEventRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    fromState: row.fromState,
    toState: row.toState,
    source: row.source,
    actorUserId: row.actorUserId,
    reason: row.reason,
    createdAt: row.createdAt.toISOString()
  };
}

export interface PlaceOrdersRepositoryInput {
  userId: string;
  quote: DeliveryCheckoutQuoteResponse;
  attempts: PaymentAttemptRecord[];
  idempotencyKey: string;
}

export interface OrderRepository {
  placeOrders(
    input: PlaceOrdersRepositoryInput
  ): Promise<{ orders: OrderRecord[]; reused: boolean }>;
  findByCheckout(
    userId: string,
    checkoutSessionId: string
  ): Promise<OrderRecord[]>;
  listCustomerOrders(userId: string): Promise<OrderRecord[]>;
  getCustomerOrder(
    userId: string,
    orderId: string
  ): Promise<OrderRecord | null>;
  listMerchantOrders(
    ownerUserId: string,
    storeId: string
  ): Promise<OrderRecord[] | null>;
  getMerchantOrder(
    ownerUserId: string,
    storeId: string,
    orderId: string
  ): Promise<OrderRecord | null>;
  customerCancel(
    userId: string,
    orderId: string,
    reason: string
  ): Promise<OrderRecord | null>;
  merchantAction(
    ownerUserId: string,
    storeId: string,
    orderId: string,
    action: MerchantOrderAction,
    reason: string | null
  ): Promise<OrderRecord | null>;
  expireCustomerReservations(userId: string): Promise<void>;
  expireStoreReservations(storeId: string): Promise<void>;
}

export class DatabaseOrderRepository implements OrderRepository {
  constructor(private readonly db: Database) {}

  private async hydrate(orderIds: string[]): Promise<OrderRecord[]> {
    if (orderIds.length === 0) return [];

    const [orderRows, itemRows, fulfillmentRows, reservationRows, eventRows] =
      await Promise.all([
        this.db
          .select({
            order: orders,
            storeName: stores.name,
            storeHandle: stores.handle,
            storePhone: stores.phone
          })
          .from(orders)
          .innerJoin(stores, eq(stores.id, orders.storeId))
          .where(inArray(orders.id, orderIds)),
        this.db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds))
          .orderBy(asc(orderItems.createdAt)),
        this.db
          .select()
          .from(orderFulfillments)
          .where(inArray(orderFulfillments.orderId, orderIds)),
        this.db
          .select()
          .from(inventoryReservations)
          .where(inArray(inventoryReservations.orderId, orderIds)),
        this.db
          .select()
          .from(orderStateEvents)
          .where(inArray(orderStateEvents.orderId, orderIds))
          .orderBy(asc(orderStateEvents.createdAt))
      ]);

    const orderById = new Map(orderRows.map((row) => [row.order.id, row]));
    return orderIds
      .map((id) => orderById.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map(({ order, storeName, storeHandle, storePhone }) => {
        const fulfillment = fulfillmentRows.find(
          (row) => row.orderId === order.id
        );
        if (!fulfillment) {
          throw new Error("order_fulfillment_missing");
        }

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          checkoutSessionId: order.checkoutSessionId,
          customerUserId: order.customerUserId,
          storeId: order.storeId,
          storeName,
          storeHandle,
          storePhone,
          state: order.state,
          fulfillmentType: order.fulfillmentType,
          currency: "AFN",
          totals: {
            itemsSubtotal: money(order.itemsSubtotal),
            productDiscount: money(order.productDiscount),
            couponDiscount: money(order.couponDiscount),
            preDeliveryTotal: money(order.preDeliveryTotal),
            deliveryBase: money(order.deliveryBase),
            urgencySurcharge: money(order.urgencySurcharge),
            productDeliverySurcharge: money(
              order.productDeliverySurcharge
            ),
            freeDeliveryDiscount: money(order.freeDeliveryDiscount),
            deliveryTotal: money(order.deliveryTotal),
            total: money(order.total)
          },
          customerAddress:
            order.customerAddressSnapshot as OrderRecord["customerAddress"],
          delivery:
            order.deliverySnapshot as unknown as OrderRecord["delivery"],
          payment:
            order.paymentSnapshot as unknown as OrderRecord["payment"],
          cancellationReason: order.cancellationReason,
          confirmationExpiresAt:
            order.confirmationExpiresAt.toISOString(),
          placedAt: order.placedAt.toISOString(),
          confirmedAt: order.confirmedAt?.toISOString() ?? null,
          preparingAt: order.preparingAt?.toISOString() ?? null,
          readyAt: order.readyAt?.toISOString() ?? null,
          dispatchedAt: order.dispatchedAt?.toISOString() ?? null,
          deliveredAt: order.deliveredAt?.toISOString() ?? null,
          pickedUpAt: order.pickedUpAt?.toISOString() ?? null,
          cancelledAt: order.cancelledAt?.toISOString() ?? null,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          items: itemRows
            .filter((row) => row.orderId === order.id)
            .map(toItem),
          fulfillment: toFulfillment(fulfillment),
          reservations: reservationRows
            .filter((row) => row.orderId === order.id)
            .map(toReservation),
          timeline: eventRows
            .filter((row) => row.orderId === order.id)
            .map(toEvent)
        };
      });
  }

  private async listIdsForCustomer(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.customerUserId, userId))
      .orderBy(desc(orders.placedAt));
    return rows.map((row) => row.id);
  }

  async findByCheckout(
    userId: string,
    checkoutSessionId: string
  ): Promise<OrderRecord[]> {
    const rows = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.customerUserId, userId),
          eq(orders.checkoutSessionId, checkoutSessionId)
        )
      )
      .orderBy(asc(orders.createdAt));

    return this.hydrate(rows.map((row) => row.id));
  }

  async listCustomerOrders(userId: string): Promise<OrderRecord[]> {
    return this.hydrate(await this.listIdsForCustomer(userId));
  }

  async getCustomerOrder(
    userId: string,
    orderId: string
  ): Promise<OrderRecord | null> {
    const [row] = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.customerUserId, userId)
        )
      )
      .limit(1);
    if (!row) return null;
    return (await this.hydrate([row.id]))[0] ?? null;
  }

  private async merchantAccess(
    ownerUserId: string,
    storeId: string
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(
        and(
          eq(stores.id, storeId),
          eq(stores.ownerUserId, ownerUserId)
        )
      )
      .limit(1);
    return Boolean(row);
  }

  async listMerchantOrders(
    ownerUserId: string,
    storeId: string
  ): Promise<OrderRecord[] | null> {
    if (!(await this.merchantAccess(ownerUserId, storeId))) return null;
    const rows = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.storeId, storeId))
      .orderBy(desc(orders.placedAt));
    return this.hydrate(rows.map((row) => row.id));
  }

  async getMerchantOrder(
    ownerUserId: string,
    storeId: string,
    orderId: string
  ): Promise<OrderRecord | null> {
    if (!(await this.merchantAccess(ownerUserId, storeId))) return null;
    const [row] = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(eq(orders.id, orderId), eq(orders.storeId, storeId))
      )
      .limit(1);
    if (!row) return null;
    return (await this.hydrate([row.id]))[0] ?? null;
  }

  async placeOrders(
    input: PlaceOrdersRepositoryInput
  ): Promise<{ orders: OrderRecord[]; reused: boolean }> {
    const result = await this.db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.checkoutSessionId, input.quote.sessionId),
            eq(orders.customerUserId, input.userId)
          )
        )
        .orderBy(asc(orders.createdAt));

      if (existing.length > 0) {
        return {
          ids: existing.map((row) => row.id),
          reused: true
        };
      }

      const [checkout] = await tx
        .select()
        .from(checkoutSessions)
        .where(
          and(
            eq(checkoutSessions.id, input.quote.sessionId),
            eq(checkoutSessions.userId, input.userId)
          )
        )
        .limit(1)
        .for("update");

      if (
        !checkout ||
        checkout.status !== "quoted" ||
        !checkout.expiresAt ||
        checkout.expiresAt.getTime() <= Date.now()
      ) {
        throw new OrderError("checkout_unavailable", 409);
      }

      const attemptByStore = new Map(
        input.attempts.map((attempt) => [attempt.storeId, attempt])
      );
      const selectedDelivery = new Map(
        input.quote.deliverySelections.map((selection) => [
          selection.storeId,
          selection
        ])
      );

      const createdIds: string[] = [];
      const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS);

      for (const group of input.quote.cart.groups) {
        const delivery = selectedDelivery.get(group.store.id);
        const suppliedAttempt = attemptByStore.get(group.store.id);
        if (!delivery || !suppliedAttempt) {
          throw new OrderError("payment_not_ready", 409);
        }

        const [store] = await tx
          .select({
            id: stores.id,
            status: stores.status,
            subscriptionStatus: storeSubscriptions.status
          })
          .from(stores)
          .innerJoin(
            storeSubscriptions,
            eq(storeSubscriptions.storeId, stores.id)
          )
          .where(eq(stores.id, group.store.id))
          .limit(1)
          .for("update");

        if (
          !store ||
          store.status !== "published" ||
          !["active", "grace_period"].includes(store.subscriptionStatus)
        ) {
          throw new OrderError("checkout_unavailable", 409);
        }

        const [attempt] = await tx
          .select()
          .from(paymentAttempts)
          .where(
            and(
              eq(paymentAttempts.id, suppliedAttempt.id),
              eq(paymentAttempts.userId, input.userId),
              eq(paymentAttempts.checkoutSessionId, input.quote.sessionId),
              eq(paymentAttempts.storeId, group.store.id)
            )
          )
          .limit(1)
          .for("update");

        if (!attempt) {
          throw new OrderError("payment_not_ready", 409);
        }

        const attemptRecord = {
          ...suppliedAttempt,
          state: attempt.state,
          provider: attempt.provider,
          amount: money(attempt.amount)
        } satisfies PaymentAttemptRecord;

        if (!paymentReady(attemptRecord)) {
          throw new OrderError("payment_not_ready", 409);
        }

        const total =
          group.preDeliveryTotal + delivery.price.finalDeliveryPrice;
        if (Math.abs(money(attempt.amount) - total) >= 0.005) {
          throw new OrderError("payment_not_ready", 409);
        }

        const [created] = await tx
          .insert(orders)
          .values({
            orderNumber: orderNumber(),
            checkoutSessionId: input.quote.sessionId,
            customerUserId: input.userId,
            storeId: group.store.id,
            idempotencyKey: input.idempotencyKey,
            state: "pending_confirmation",
            fulfillmentType: delivery.fulfillmentType,
            itemsSubtotal: group.itemsSubtotal.toFixed(2),
            productDiscount: group.productDiscount.toFixed(2),
            couponDiscount: group.couponDiscount.toFixed(2),
            preDeliveryTotal: group.preDeliveryTotal.toFixed(2),
            deliveryBase: delivery.price.baseDelivery.toFixed(2),
            urgencySurcharge:
              delivery.price.urgencySurcharge.toFixed(2),
            productDeliverySurcharge:
              delivery.price.productDeliverySurcharge.toFixed(2),
            freeDeliveryDiscount:
              delivery.price.freeDeliveryDiscount.toFixed(2),
            deliveryTotal:
              delivery.price.finalDeliveryPrice.toFixed(2),
            total: total.toFixed(2),
            customerAddressSnapshot:
              delivery.fulfillmentType === "digital"
                ? null
                : (input.quote.address as unknown as Record<string, unknown>),
            deliverySnapshot:
              delivery as unknown as Record<string, unknown>,
            paymentSnapshot: {
              attemptId: attempt.id,
              method: attempt.method,
              provider: attempt.provider,
              state: attempt.state,
              amount: money(attempt.amount),
              currency: "AFN"
            },
            confirmationExpiresAt: expiresAt
          })
          .returning();

        if (!created) throw new Error("order_insert_failed");

        for (const item of group.items) {
          let reserved = false;

          if (item.variantId) {
            const [row] = await tx
              .update(productVariants)
              .set({
                reservedQuantity:
                  sql`${productVariants.reservedQuantity} + ${item.quantity}`,
                updatedAt: new Date()
              })
              .where(
                and(
                  eq(productVariants.id, item.variantId),
                  eq(productVariants.productId, item.productId),
                  eq(productVariants.available, true),
                  sql`${productVariants.availableQuantity} - ${productVariants.reservedQuantity} >= ${item.quantity}`,
                  sql`exists (
                    select 1 from ${products}
                    where ${products.id} = ${item.productId}
                      and ${products.storeId} = ${group.store.id}
                      and ${products.status} = 'active'
                  )`
                )
              )
              .returning({ id: productVariants.id });
            reserved = Boolean(row);
          } else {
            const [row] = await tx
              .update(products)
              .set({
                reservedQuantity:
                  sql`${products.reservedQuantity} + ${item.quantity}`,
                updatedAt: new Date()
              })
              .where(
                and(
                  eq(products.id, item.productId),
                  eq(products.storeId, group.store.id),
                  eq(products.status, "active"),
                  sql`${products.availableQuantity} - ${products.reservedQuantity} >= ${item.quantity}`,
                  sql`not exists (
                    select 1 from ${productVariants}
                    where ${productVariants.productId} = ${item.productId}
                  )`
                )
              )
              .returning({ id: products.id });
            reserved = Boolean(row);
          }

          if (!reserved) {
            throw new OrderError("inventory_unavailable", 409);
          }

          const [createdItem] = await tx
            .insert(orderItems)
            .values({
              orderId: created.id,
              productId: item.productId,
              variantId: item.variantId,
              productName: item.name,
              variantTitle: item.variantTitle,
              imageUrl: item.imageUrl,
              quantity: item.quantity,
              unitListPrice: item.unitListPrice.toFixed(2),
              unitPrice: item.unitPrice.toFixed(2),
              lineItemsSubtotal: item.lineItemsSubtotal.toFixed(2),
              lineProductDiscount:
                item.lineProductDiscount.toFixed(2),
              lineTotal: item.lineTotal.toFixed(2)
            })
            .returning();

          if (!createdItem) throw new Error("order_item_insert_failed");

          await tx.insert(inventoryReservations).values({
            orderId: created.id,
            orderItemId: createdItem.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            state: "reserved",
            expiresAt
          });
        }

        await tx.insert(orderFulfillments).values({
          orderId: created.id,
          type: delivery.fulfillmentType,
          state: "pending",
          label: delivery.label,
          expectedMinAt:
            delivery.estimatedMinAt === null
              ? null
              : new Date(delivery.estimatedMinAt),
          expectedMaxAt:
            delivery.estimatedMaxAt === null
              ? null
              : new Date(delivery.estimatedMaxAt),
          ruleSnapshot:
            delivery.ruleUsed as unknown as Record<string, unknown>
        });

        await tx.insert(orderStateEvents).values({
          orderId: created.id,
          fromState: null,
          toState: "pending_confirmation",
          source: "system",
          details: { reason: "order_placed" }
        });

        await tx
          .update(paymentAttempts)
          .set({
            orderId: created.id,
            updatedAt: new Date()
          })
          .where(eq(paymentAttempts.id, attempt.id));

        createdIds.push(created.id);
      }

      await tx
        .update(checkoutSessions)
        .set({ status: "ordered", updatedAt: new Date() })
        .where(eq(checkoutSessions.id, input.quote.sessionId));

      await tx
        .delete(cartItems)
        .where(eq(cartItems.cartId, input.quote.cart.id));
      await tx
        .delete(cartStoreCoupons)
        .where(eq(cartStoreCoupons.cartId, input.quote.cart.id));

      return { ids: createdIds, reused: false };
    });

    return {
      orders: await this.hydrate(result.ids),
      reused: result.reused
    };
  }

  private async releaseOrRestoreInventory(
    orderId: string,
    terminalState: "released" | "expired"
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const reservations = await tx
        .select()
        .from(inventoryReservations)
        .where(eq(inventoryReservations.orderId, orderId))
        .for("update");

      for (const reservation of reservations) {
        if (
          reservation.state === "released" ||
          reservation.state === "expired"
        ) {
          continue;
        }

        if (reservation.variantId) {
          if (reservation.state === "reserved") {
            await tx
              .update(productVariants)
              .set({
                reservedQuantity:
                  sql`${productVariants.reservedQuantity} - ${reservation.quantity}`,
                updatedAt: new Date()
              })
              .where(
                and(
                  eq(productVariants.id, reservation.variantId),
                  sql`${productVariants.reservedQuantity} >= ${reservation.quantity}`
                )
              );
          } else if (reservation.state === "committed") {
            const [updated] = await tx
              .update(productVariants)
              .set({
                availableQuantity:
                  sql`${productVariants.availableQuantity} + ${reservation.quantity}`,
                updatedAt: new Date()
              })
              .where(eq(productVariants.id, reservation.variantId))
              .returning({
                newQuantity: productVariants.availableQuantity
              });
            if (updated) {
              await tx.insert(inventoryMovements).values({
                storeId: (
                  await tx
                    .select({ storeId: orders.storeId })
                    .from(orders)
                    .where(eq(orders.id, orderId))
                    .limit(1)
                )[0]!.storeId,
                productId: reservation.productId,
                variantId: reservation.variantId,
                delta: reservation.quantity,
                previousQuantity:
                  updated.newQuantity - reservation.quantity,
                newQuantity: updated.newQuantity,
                reason: "order_cancelled:" + orderId
              });
            }
          }
        } else {
          if (reservation.state === "reserved") {
            await tx
              .update(products)
              .set({
                reservedQuantity:
                  sql`${products.reservedQuantity} - ${reservation.quantity}`,
                updatedAt: new Date()
              })
              .where(
                and(
                  eq(products.id, reservation.productId),
                  sql`${products.reservedQuantity} >= ${reservation.quantity}`
                )
              );
          } else if (reservation.state === "committed") {
            const [updated] = await tx
              .update(products)
              .set({
                availableQuantity:
                  sql`${products.availableQuantity} + ${reservation.quantity}`,
                updatedAt: new Date()
              })
              .where(eq(products.id, reservation.productId))
              .returning({ newQuantity: products.availableQuantity });
            if (updated) {
              const [order] = await tx
                .select({ storeId: orders.storeId })
                .from(orders)
                .where(eq(orders.id, orderId))
                .limit(1);
              await tx.insert(inventoryMovements).values({
                storeId: order!.storeId,
                productId: reservation.productId,
                variantId: null,
                delta: reservation.quantity,
                previousQuantity:
                  updated.newQuantity - reservation.quantity,
                newQuantity: updated.newQuantity,
                reason: "order_cancelled:" + orderId
              });
            }
          }
        }

        await tx
          .update(inventoryReservations)
          .set({
            state: terminalState,
            releasedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(inventoryReservations.id, reservation.id));
      }
    });
  }

  private async updatePaymentForCancellation(
    order: Order,
    source: "customer" | "merchant" | "system",
    reason: string
  ): Promise<"cancelled" | "refund_pending"> {
    const [attempt] = await this.db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.orderId, order.id))
      .limit(1);

    if (!attempt) return "cancelled";

    if (
      attempt.state === "paid" ||
      attempt.state === "partially_refunded"
    ) {
      await this.db.transaction(async (tx) => {
        const now = new Date();
        const [updated] = await tx
          .update(paymentAttempts)
          .set({
            state: "refund_pending",
            refundState: "pending",
            updatedAt: now
          })
          .where(
            and(
              eq(paymentAttempts.id, attempt.id),
              inArray(paymentAttempts.state, [
                "paid",
                "partially_refunded"
              ])
            )
          )
          .returning();

        if (updated) {
          await tx.insert(paymentStateEvents).values({
            paymentAttemptId: attempt.id,
            fromState: attempt.state,
            toState: "refund_pending",
            source: sourceForPayment(source),
            details: {
              reason: "order_cancelled",
              orderId: order.id,
              cancellationReason: reason
            }
          });
        }
      });
      return "refund_pending";
    }

    if (
      attempt.state === "created" ||
      attempt.state === "pending"
    ) {
      await this.db.transaction(async (tx) => {
        const now = new Date();
        const [updated] = await tx
          .update(paymentAttempts)
          .set({
            state: "cancelled",
            cancelledAt: now,
            updatedAt: now
          })
          .where(
            and(
              eq(paymentAttempts.id, attempt.id),
              inArray(paymentAttempts.state, ["created", "pending"])
            )
          )
          .returning();

        if (updated) {
          await tx.insert(paymentStateEvents).values({
            paymentAttemptId: attempt.id,
            fromState: attempt.state,
            toState: "cancelled",
            source: sourceForPayment(source),
            details: {
              reason: "order_cancelled",
              orderId: order.id,
              cancellationReason: reason
            }
          });
        }
      });
    }

    return "cancelled";
  }

  private async cancelInternal(
    orderId: string,
    source: "customer" | "merchant" | "system",
    actorUserId: string | null,
    reason: string,
    expired: boolean
  ): Promise<void> {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) return;

    const terminalState = await this.updatePaymentForCancellation(
      order,
      source,
      reason
    );

    await this.releaseOrRestoreInventory(
      orderId,
      expired ? "expired" : "released"
    );

    const nextState: OrderState =
      terminalState === "refund_pending"
        ? "refund_pending"
        : "cancelled";

    await this.db.transaction(async (tx) => {
      const now = new Date();
      const [updated] = await tx
        .update(orders)
        .set({
          state: nextState,
          cancellationReason: reason,
          cancelledBy: source,
          cancelledAt: now,
          paymentSnapshot: {
            ...(order.paymentSnapshot ?? {}),
            state:
              terminalState === "refund_pending"
                ? "refund_pending"
                : "cancelled"
          },
          updatedAt: now
        })
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.state, order.state)
          )
        )
        .returning({ id: orders.id });

      if (!updated) return;

      await tx
        .update(orderFulfillments)
        .set({ state: "cancelled", updatedAt: now })
        .where(eq(orderFulfillments.orderId, orderId));

      await tx.insert(orderStateEvents).values({
        orderId,
        fromState: order.state,
        toState: nextState,
        source,
        actorUserId,
        reason,
        details: {
          expiredReservation: expired,
          refundPending: terminalState === "refund_pending"
        }
      });
    });
  }

  async customerCancel(
    userId: string,
    orderId: string,
    reason: string
  ): Promise<OrderRecord | null> {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.customerUserId, userId)
        )
      )
      .limit(1);

    if (!order) return null;
    if (!customerCanCancel(order.state)) {
      throw new OrderError("cancellation_not_allowed", 409);
    }

    await this.cancelInternal(
      orderId,
      "customer",
      userId,
      reason,
      false
    );
    return this.getCustomerOrder(userId, orderId);
  }

  private async commitReservations(order: Order): Promise<void> {
    await this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(inventoryReservations)
        .where(
          and(
            eq(inventoryReservations.orderId, order.id),
            eq(inventoryReservations.state, "reserved")
          )
        )
        .for("update");

      for (const reservation of rows) {
        if (reservation.variantId) {
          const [updated] = await tx
            .update(productVariants)
            .set({
              availableQuantity:
                sql`${productVariants.availableQuantity} - ${reservation.quantity}`,
              reservedQuantity:
                sql`${productVariants.reservedQuantity} - ${reservation.quantity}`,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(productVariants.id, reservation.variantId),
                sql`${productVariants.availableQuantity} >= ${reservation.quantity}`,
                sql`${productVariants.reservedQuantity} >= ${reservation.quantity}`
              )
            )
            .returning({
              newQuantity: productVariants.availableQuantity
            });

          if (!updated) {
            throw new OrderError("inventory_unavailable", 409);
          }

          await tx.insert(inventoryMovements).values({
            storeId: order.storeId,
            productId: reservation.productId,
            variantId: reservation.variantId,
            delta: -reservation.quantity,
            previousQuantity:
              updated.newQuantity + reservation.quantity,
            newQuantity: updated.newQuantity,
            reason: "order_confirmed:" + order.orderNumber
          });
        } else {
          const [updated] = await tx
            .update(products)
            .set({
              availableQuantity:
                sql`${products.availableQuantity} - ${reservation.quantity}`,
              reservedQuantity:
                sql`${products.reservedQuantity} - ${reservation.quantity}`,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(products.id, reservation.productId),
                sql`${products.availableQuantity} >= ${reservation.quantity}`,
                sql`${products.reservedQuantity} >= ${reservation.quantity}`
              )
            )
            .returning({ newQuantity: products.availableQuantity });

          if (!updated) {
            throw new OrderError("inventory_unavailable", 409);
          }

          await tx.insert(inventoryMovements).values({
            storeId: order.storeId,
            productId: reservation.productId,
            variantId: null,
            delta: -reservation.quantity,
            previousQuantity:
              updated.newQuantity + reservation.quantity,
            newQuantity: updated.newQuantity,
            reason: "order_confirmed:" + order.orderNumber
          });
        }

        await tx
          .update(inventoryReservations)
          .set({
            state: "committed",
            committedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(inventoryReservations.id, reservation.id));
      }
    });
  }

  async merchantAction(
    ownerUserId: string,
    storeId: string,
    orderId: string,
    action: MerchantOrderAction,
    reason: string | null
  ): Promise<OrderRecord | null> {
    if (!(await this.merchantAccess(ownerUserId, storeId))) return null;

    const [order] = await this.db
      .select()
      .from(orders)
      .where(
        and(eq(orders.id, orderId), eq(orders.storeId, storeId))
      )
      .limit(1);
    if (!order) return null;

    const transition = merchantOrderTransition(
      order.state,
      order.fulfillmentType,
      action
    );
    if (!transition) {
      throw new OrderError("order_state_conflict", 409);
    }

    if (
      (action === "reject" || action === "cancel") &&
      !reason?.trim()
    ) {
      throw new OrderError("invalid_request", 400);
    }

    if (transition.releasesInventory) {
      await this.cancelInternal(
        orderId,
        "merchant",
        ownerUserId,
        reason!.trim(),
        false
      );
      return this.getMerchantOrder(ownerUserId, storeId, orderId);
    }

    if (transition.startsRefund) {
      const terminal = await this.updatePaymentForCancellation(
        order,
        "merchant",
        reason?.trim() || "merchant_refund_requested"
      );
      if (terminal !== "refund_pending") {
        throw new OrderError("refund_not_available", 409);
      }
    }

    if (transition.requiresReservationCommit) {
      await this.commitReservations(order);
    }

    const now = new Date();
    await this.db.transaction(async (tx) => {
      const orderChanges: Partial<typeof orders.$inferInsert> = {
        state: transition.nextState,
        updatedAt: now
      };

      if (transition.nextState === "confirmed") {
        orderChanges.confirmedAt = now;
      } else if (transition.nextState === "preparing") {
        orderChanges.preparingAt = now;
      } else if (
        transition.nextState === "ready" ||
        transition.nextState === "ready_for_pickup"
      ) {
        orderChanges.readyAt = now;
      } else if (transition.nextState === "out_for_delivery") {
        orderChanges.dispatchedAt = now;
      } else if (transition.nextState === "delivered") {
        orderChanges.deliveredAt = now;
      } else if (transition.nextState === "picked_up") {
        orderChanges.pickedUpAt = now;
      }

      if (transition.nextState === "refund_pending") {
        orderChanges.paymentSnapshot = {
          ...(order.paymentSnapshot ?? {}),
          state: "refund_pending"
        };
      }

      const [updated] = await tx
        .update(orders)
        .set(orderChanges)
        .where(
          and(
            eq(orders.id, order.id),
            eq(orders.state, order.state)
          )
        )
        .returning({ id: orders.id });

      if (!updated) {
        throw new OrderError("order_state_conflict", 409);
      }

      const fulfillmentChanges: Partial<
        typeof orderFulfillments.$inferInsert
      > = { updatedAt: now };

      if (transition.nextState === "preparing") {
        fulfillmentChanges.state = "preparing";
        fulfillmentChanges.startedAt = now;
      } else if (transition.nextState === "ready") {
        fulfillmentChanges.state = "ready";
        fulfillmentChanges.readyAt = now;
      } else if (transition.nextState === "ready_for_pickup") {
        fulfillmentChanges.state = "ready_for_pickup";
        fulfillmentChanges.readyAt = now;
      } else if (transition.nextState === "out_for_delivery") {
        fulfillmentChanges.state = "out_for_delivery";
        fulfillmentChanges.dispatchedAt = now;
      } else if (transition.nextState === "delivered") {
        fulfillmentChanges.state = "delivered";
        fulfillmentChanges.completedAt = now;
      } else if (transition.nextState === "picked_up") {
        fulfillmentChanges.state = "picked_up";
        fulfillmentChanges.completedAt = now;
      } else if (transition.nextState === "delivery_failed") {
        fulfillmentChanges.state = "delivery_failed";
      }

      await tx
        .update(orderFulfillments)
        .set(fulfillmentChanges)
        .where(eq(orderFulfillments.orderId, order.id));

      await tx.insert(orderStateEvents).values({
        orderId: order.id,
        fromState: order.state,
        toState: transition.nextState,
        source: "merchant",
        actorUserId: ownerUserId,
        reason: reason?.trim() || null,
        details: { action }
      });
    });

    return this.getMerchantOrder(ownerUserId, storeId, orderId);
  }

  private async expireRows(orderIds: string[]): Promise<void> {
    for (const orderId of orderIds) {
      const [order] = await this.db
        .select({ state: orders.state })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      if (order?.state !== "pending_confirmation") continue;
      await this.cancelInternal(
        orderId,
        "system",
        null,
        "merchant_confirmation_expired",
        true
      );
    }
  }

  async expireCustomerReservations(userId: string): Promise<void> {
    const rows = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.customerUserId, userId),
          eq(orders.state, "pending_confirmation"),
          lte(orders.confirmationExpiresAt, new Date())
        )
      );
    await this.expireRows(rows.map((row) => row.id));
  }

  async expireStoreReservations(storeId: string): Promise<void> {
    const rows = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orders.state, "pending_confirmation"),
          lte(orders.confirmationExpiresAt, new Date())
        )
      );
    await this.expireRows(rows.map((row) => row.id));
  }
}
