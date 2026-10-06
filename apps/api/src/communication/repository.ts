import type {
  CreateSupportTicketInput,
  NotificationRecord,
  NotificationType,
  PushPlatform,
  SupportMessageRecord,
  SupportTicketRecord,
  SupportTicketStatus
} from "@bazaarlink/contracts";
import {
  notifications,
  orderItems,
  orders,
  productVariants,
  products,
  pushDeliveries,
  pushDeviceTokens,
  storeSubscriptions,
  stores,
  supportMessages,
  supportTickets,
  userRoles,
  users,
  type Database,
  type Notification,
  type SupportMessage,
  type SupportTicket
} from "@bazaarlink/database";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  or
} from "drizzle-orm";

function toNotification(row: Notification): NotificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    data: row.data,
    deepLink: row.deepLink,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  };
}

function toMessage(row: SupportMessage): SupportMessageRecord {
  return {
    id: row.id,
    ticketId: row.ticketId,
    authorUserId: row.authorUserId,
    authorKind: row.authorKind,
    body: row.body,
    createdAt: row.createdAt.toISOString()
  };
}

function toTicket(
  row: SupportTicket,
  messages: SupportMessage[]
): SupportTicketRecord {
  return {
    id: row.id,
    userId: row.userId,
    storeId: row.storeId,
    orderId: row.orderId,
    category: row.category,
    subject: row.subject,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    messages: messages
      .filter((message) => message.ticketId === row.id)
      .map(toMessage)
  };
}

export interface PushTokenRecord {
  id: string;
  token: string;
  platform: PushPlatform;
}

export interface SubscriptionIssue {
  storeId: string;
  storeName: string;
  status: "grace_period" | "expired" | "canceled";
  ownerUserId: string;
}

export interface LowStockItem {
  productId: string;
  productName: string;
  freeQuantity: number;
  threshold: number;
}

export interface CommunicationRepository {
  createNotification(input: {
    userId: string;
    type: NotificationType;
    eventKey: string;
    deepLink: string;
    data?: Record<string, unknown>;
  }): Promise<NotificationRecord>;
  listNotifications(userId: string): Promise<NotificationRecord[]>;
  unreadCount(userId: string): Promise<number>;
  markRead(userId: string, notificationId: string): Promise<boolean>;
  markAllRead(userId: string): Promise<void>;
  registerPushToken(
    userId: string,
    token: string,
    platform: PushPlatform,
    deviceId: string | null
  ): Promise<void>;
  activePushTokens(userId: string): Promise<PushTokenRecord[]>;
  recordPushResult(input: {
    notificationId: string;
    tokenId: string;
    success: boolean;
    providerTicketId: string | null;
    error: string | null;
  }): Promise<void>;
  userLocale(userId: string): Promise<"fa-AF" | "ps-AF" | "en">;
  storeOwner(storeId: string): Promise<string | null>;
  subscriptionIssues(userId: string): Promise<SubscriptionIssue[]>;
  lowStockForOrder(orderId: string): Promise<LowStockItem[]>;
  createTicket(
    userId: string,
    input: CreateSupportTicketInput
  ): Promise<SupportTicketRecord | null>;
  listUserTickets(userId: string): Promise<SupportTicketRecord[]>;
  getUserTicket(
    userId: string,
    ticketId: string
  ): Promise<SupportTicketRecord | null>;
  replyUserTicket(
    userId: string,
    ticketId: string,
    message: string
  ): Promise<SupportTicketRecord | null>;
  closeUserTicket(
    userId: string,
    ticketId: string
  ): Promise<SupportTicketRecord | null>;
  listPlatformTickets(
    status?: SupportTicketStatus
  ): Promise<SupportTicketRecord[]>;
  getPlatformTicket(ticketId: string): Promise<SupportTicketRecord | null>;
  replyPlatformTicket(
    actorUserId: string,
    ticketId: string,
    message: string
  ): Promise<SupportTicketRecord | null>;
  setPlatformTicketStatus(
    ticketId: string,
    status: SupportTicketStatus
  ): Promise<SupportTicketRecord | null>;
  platformSupportUsers(): Promise<string[]>;
}

export class DatabaseCommunicationRepository
  implements CommunicationRepository
{
  constructor(private readonly db: Database) {}

  async createNotification(input: {
    userId: string;
    type: NotificationType;
    eventKey: string;
    deepLink: string;
    data?: Record<string, unknown>;
  }): Promise<NotificationRecord> {
    const [created] = await this.db
      .insert(notifications)
      .values({
        userId: input.userId,
        type: input.type,
        eventKey: input.eventKey,
        deepLink: input.deepLink,
        data: input.data ?? {}
      })
      .onConflictDoNothing({
        target: [notifications.userId, notifications.eventKey]
      })
      .returning();

    if (created) return toNotification(created);

    const [existing] = await this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, input.userId),
          eq(notifications.eventKey, input.eventKey)
        )
      )
      .limit(1);

    if (!existing) throw new Error("notification_create_failed");
    return toNotification(existing);
  }

  async listNotifications(userId: string): Promise<NotificationRecord[]> {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
    return rows.map(toNotification);
  }

  async unreadCount(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.readAt)
        )
      );
    return row?.value ?? 0;
  }

  async markRead(userId: string, notificationId: string): Promise<boolean> {
    const [updated] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      )
      .returning({ id: notifications.id });
    return Boolean(updated);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.readAt)
        )
      );
  }

  async registerPushToken(
    userId: string,
    token: string,
    platform: PushPlatform,
    deviceId: string | null
  ): Promise<void> {
    await this.db
      .insert(pushDeviceTokens)
      .values({
        userId,
        token,
        platform,
        deviceId,
        active: true
      })
      .onConflictDoUpdate({
        target: pushDeviceTokens.token,
        set: {
          userId,
          platform,
          deviceId,
          active: true,
          lastRegisteredAt: new Date(),
          updatedAt: new Date()
        }
      });
  }

  async activePushTokens(userId: string): Promise<PushTokenRecord[]> {
    return this.db
      .select({
        id: pushDeviceTokens.id,
        token: pushDeviceTokens.token,
        platform: pushDeviceTokens.platform
      })
      .from(pushDeviceTokens)
      .where(
        and(
          eq(pushDeviceTokens.userId, userId),
          eq(pushDeviceTokens.active, true)
        )
      );
  }

  async recordPushResult(input: {
    notificationId: string;
    tokenId: string;
    success: boolean;
    providerTicketId: string | null;
    error: string | null;
  }): Promise<void> {
    await this.db
      .insert(pushDeliveries)
      .values({
        notificationId: input.notificationId,
        deviceTokenId: input.tokenId,
        state: input.success ? "sent" : "failed",
        providerTicketId: input.providerTicketId,
        error: input.error,
        attemptedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [
          pushDeliveries.notificationId,
          pushDeliveries.deviceTokenId
        ],
        set: {
          state: input.success ? "sent" : "failed",
          providerTicketId: input.providerTicketId,
          error: input.error,
          attemptedAt: new Date(),
          updatedAt: new Date()
        }
      });
  }

  async userLocale(userId: string): Promise<"fa-AF" | "ps-AF" | "en"> {
    const [row] = await this.db
      .select({ locale: users.preferredLocale })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row?.locale === "ps-AF" || row?.locale === "en"
      ? row.locale
      : "fa-AF";
  }

  async storeOwner(storeId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ ownerUserId: stores.ownerUserId })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);
    return row?.ownerUserId ?? null;
  }

  async subscriptionIssues(userId: string): Promise<SubscriptionIssue[]> {
    const rows = await this.db
      .select({
        storeId: stores.id,
        storeName: stores.name,
        status: storeSubscriptions.status,
        ownerUserId: stores.ownerUserId
      })
      .from(stores)
      .innerJoin(
        storeSubscriptions,
        eq(storeSubscriptions.storeId, stores.id)
      )
      .where(
        and(
          eq(stores.ownerUserId, userId),
          inArray(storeSubscriptions.status, [
            "grace_period",
            "expired",
            "canceled"
          ])
        )
      );

    return rows as SubscriptionIssue[];
  }

  async lowStockForOrder(orderId: string): Promise<LowStockItem[]> {
    const items = await this.db
      .select({
        productId: orderItems.productId,
        variantId: orderItems.variantId,
        productName: orderItems.productName
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const output: LowStockItem[] = [];
    for (const item of items) {
      if (item.variantId) {
        const [variant] = await this.db
          .select({
            availableQuantity: productVariants.availableQuantity,
            reservedQuantity: productVariants.reservedQuantity,
            threshold: productVariants.lowStockThreshold
          })
          .from(productVariants)
          .where(eq(productVariants.id, item.variantId))
          .limit(1);
        if (variant) {
          const free = Math.max(
            0,
            variant.availableQuantity - variant.reservedQuantity
          );
          if (free <= variant.threshold) {
            output.push({
              productId: item.productId,
              productName: item.productName,
              freeQuantity: free,
              threshold: variant.threshold
            });
          }
        }
      } else {
        const [product] = await this.db
          .select({
            availableQuantity: products.availableQuantity,
            reservedQuantity: products.reservedQuantity,
            threshold: products.lowStockThreshold
          })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);
        if (product) {
          const free = Math.max(
            0,
            product.availableQuantity - product.reservedQuantity
          );
          if (free <= product.threshold) {
            output.push({
              productId: item.productId,
              productName: item.productName,
              freeQuantity: free,
              threshold: product.threshold
            });
          }
        }
      }
    }
    return output;
  }

  private async hydrateTickets(ids: string[]): Promise<SupportTicketRecord[]> {
    if (ids.length === 0) return [];
    const [ticketRows, messageRows] = await Promise.all([
      this.db
        .select()
        .from(supportTickets)
        .where(inArray(supportTickets.id, ids)),
      this.db
        .select()
        .from(supportMessages)
        .where(inArray(supportMessages.ticketId, ids))
        .orderBy(asc(supportMessages.createdAt))
    ]);
    const byId = new Map(ticketRows.map((row) => [row.id, row]));
    return ids
      .map((id) => byId.get(id))
      .filter((row): row is SupportTicket => Boolean(row))
      .map((row) => toTicket(row, messageRows));
  }

  private async validateSupportContext(
    userId: string,
    input: CreateSupportTicketInput
  ): Promise<{ orderId: string | null; storeId: string | null } | null> {
    if (input.orderId) {
      const [order] = await this.db
        .select({ id: orders.id, storeId: orders.storeId })
        .from(orders)
        .where(
          and(
            eq(orders.id, input.orderId),
            eq(orders.customerUserId, userId)
          )
        )
        .limit(1);
      if (!order) return null;
      return { orderId: order.id, storeId: order.storeId };
    }

    if (input.storeId) {
      const [store] = await this.db
        .select({ id: stores.id })
        .from(stores)
        .where(
          and(
            eq(stores.id, input.storeId),
            eq(stores.ownerUserId, userId)
          )
        )
        .limit(1);
      if (!store) return null;
      return { orderId: null, storeId: store.id };
    }

    return { orderId: null, storeId: null };
  }

  async createTicket(
    userId: string,
    input: CreateSupportTicketInput
  ): Promise<SupportTicketRecord | null> {
    const context = await this.validateSupportContext(userId, input);
    if (!context) return null;

    const id = await this.db.transaction(async (tx) => {
      const [ticket] = await tx
        .insert(supportTickets)
        .values({
          userId,
          orderId: context.orderId,
          storeId: context.storeId,
          category: input.category,
          subject: input.subject.trim(),
          status: "waiting_support"
        })
        .returning({ id: supportTickets.id });
      if (!ticket) throw new Error("support_ticket_insert_failed");

      await tx.insert(supportMessages).values({
        ticketId: ticket.id,
        authorUserId: userId,
        authorKind: "user",
        body: input.message.trim()
      });
      return ticket.id;
    });

    return (await this.hydrateTickets([id]))[0] ?? null;
  }

  async listUserTickets(userId: string): Promise<SupportTicketRecord[]> {
    const rows = await this.db
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.updatedAt));
    return this.hydrateTickets(rows.map((row) => row.id));
  }

  async getUserTicket(
    userId: string,
    ticketId: string
  ): Promise<SupportTicketRecord | null> {
    const [row] = await this.db
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.id, ticketId),
          eq(supportTickets.userId, userId)
        )
      )
      .limit(1);
    if (!row) return null;
    return (await this.hydrateTickets([row.id]))[0] ?? null;
  }

  async replyUserTicket(
    userId: string,
    ticketId: string,
    message: string
  ): Promise<SupportTicketRecord | null> {
    const ticket = await this.getUserTicket(userId, ticketId);
    if (!ticket || ticket.status === "closed") return ticket;

    await this.db.transaction(async (tx) => {
      await tx.insert(supportMessages).values({
        ticketId,
        authorUserId: userId,
        authorKind: "user",
        body: message.trim()
      });
      await tx
        .update(supportTickets)
        .set({
          status: "waiting_support",
          updatedAt: new Date()
        })
        .where(eq(supportTickets.id, ticketId));
    });
    return this.getUserTicket(userId, ticketId);
  }

  async closeUserTicket(
    userId: string,
    ticketId: string
  ): Promise<SupportTicketRecord | null> {
    const [updated] = await this.db
      .update(supportTickets)
      .set({
        status: "closed",
        closedAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(supportTickets.id, ticketId),
          eq(supportTickets.userId, userId)
        )
      )
      .returning({ id: supportTickets.id });
    if (!updated) return null;
    return this.getUserTicket(userId, ticketId);
  }

  async listPlatformTickets(
    status?: SupportTicketStatus
  ): Promise<SupportTicketRecord[]> {
    const rows = await this.db
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(status ? eq(supportTickets.status, status) : undefined)
      .orderBy(desc(supportTickets.updatedAt));
    return this.hydrateTickets(rows.map((row) => row.id));
  }

  async getPlatformTicket(
    ticketId: string
  ): Promise<SupportTicketRecord | null> {
    const [row] = await this.db
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);
    if (!row) return null;
    return (await this.hydrateTickets([row.id]))[0] ?? null;
  }

  async replyPlatformTicket(
    actorUserId: string,
    ticketId: string,
    message: string
  ): Promise<SupportTicketRecord | null> {
    const ticket = await this.getPlatformTicket(ticketId);
    if (!ticket || ticket.status === "closed") return ticket;

    await this.db.transaction(async (tx) => {
      await tx.insert(supportMessages).values({
        ticketId,
        authorUserId: actorUserId,
        authorKind: "platform",
        body: message.trim()
      });
      await tx
        .update(supportTickets)
        .set({
          status: "waiting_customer",
          updatedAt: new Date()
        })
        .where(eq(supportTickets.id, ticketId));
    });
    return this.getPlatformTicket(ticketId);
  }

  async setPlatformTicketStatus(
    ticketId: string,
    status: SupportTicketStatus
  ): Promise<SupportTicketRecord | null> {
    const [updated] = await this.db
      .update(supportTickets)
      .set({
        status,
        closedAt: status === "closed" ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(supportTickets.id, ticketId))
      .returning({ id: supportTickets.id });
    if (!updated) return null;
    return this.getPlatformTicket(ticketId);
  }

  async platformSupportUsers(): Promise<string[]> {
    const rows = await this.db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(
        or(
          eq(userRoles.role, "platform_support"),
          eq(userRoles.role, "platform_admin"),
          eq(userRoles.role, "super_admin")
        )
      );
    return [...new Set(rows.map((row) => row.userId))];
  }
}
