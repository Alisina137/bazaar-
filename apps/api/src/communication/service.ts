import type {
  CreateSupportTicketInput,
  NotificationListResponse,
  NotificationRecord,
  NotificationType,
  ProductReviewRecord,
  RegisterPushTokenInput,
  SupportTicketListResponse,
  SupportTicketRecord,
  SupportTicketStatus
} from "@bazaarlink/contracts";

import { CommunicationError } from "./errors.js";
import type { PushGateway } from "./push.js";
import type {
  CommunicationRepository,
  LowStockItem
} from "./repository.js";

export interface BusinessNotificationEmitter {
  orderPlaced(input: {
    id: string;
    orderNumber: string;
    customerUserId: string;
    storeId: string;
  }): Promise<void>;
  paymentResult(input: {
    attemptId: string;
    userId: string;
    storeId: string;
    checkoutSessionId: string;
    result: "paid" | "failed";
  }): Promise<void>;
  orderAction(input: {
    id: string;
    orderNumber: string;
    customerUserId: string;
    storeId: string;
    state: string;
    paymentState: string;
    paymentProvider: string;
  }): Promise<void>;
  newReview(review: ProductReviewRecord): Promise<void>;
}

export class CommunicationService implements BusinessNotificationEmitter {
  constructor(
    private readonly repository: CommunicationRepository,
    private readonly pushGateway: PushGateway
  ) {}

  private async emit(input: {
    userId: string;
    type: NotificationType;
    eventKey: string;
    deepLink: string;
    data?: Record<string, unknown>;
  }): Promise<NotificationRecord> {
    const notification = await this.repository.createNotification(input);

    const tokens = await this.repository.activePushTokens(input.userId);
    if (tokens.length > 0) {
      const locale = await this.repository.userLocale(input.userId);
      const results = await this.pushGateway.send(
        locale,
        notification,
        tokens
      );
      await Promise.all(
        results.map((result) =>
          this.repository.recordPushResult({
            notificationId: notification.id,
            tokenId: result.tokenId,
            success: result.success,
            providerTicketId: result.providerTicketId,
            error: result.error
          })
        )
      );
    }

    return notification;
  }

  private async emitStoreOwner(input: {
    storeId: string;
    type: NotificationType;
    eventKey: string;
    deepLink: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    const owner = await this.repository.storeOwner(input.storeId);
    if (!owner) return;
    await this.emit({ ...input, userId: owner });
  }

  async orderPlaced(input: {
    id: string;
    orderNumber: string;
    customerUserId: string;
    storeId: string;
  }): Promise<void> {
    const data = {
      orderId: input.id,
      orderNumber: input.orderNumber,
      storeId: input.storeId
    };
    await Promise.all([
      this.emit({
        userId: input.customerUserId,
        type: "order_placed",
        eventKey: "order:" + input.id + ":placed:customer",
        deepLink: "/orders/" + input.id,
        data
      }),
      this.emitStoreOwner({
        storeId: input.storeId,
        type: "order_placed",
        eventKey: "order:" + input.id + ":placed:merchant",
        deepLink: "/seller/order/" + input.id,
        data
      })
    ]);
  }

  async paymentResult(input: {
    attemptId: string;
    userId: string;
    storeId: string;
    checkoutSessionId: string;
    result: "paid" | "failed";
  }): Promise<void> {
    const type =
      input.result === "paid"
        ? "payment_successful" as const
        : "payment_failed" as const;
    const data = {
      attemptId: input.attemptId,
      storeId: input.storeId,
      checkoutSessionId: input.checkoutSessionId
    };

    const work: Promise<unknown>[] = [
      this.emit({
        userId: input.userId,
        type,
        eventKey:
          "payment:" + input.attemptId + ":" + input.result + ":customer",
        deepLink:
          "/checkout?sessionId=" +
          encodeURIComponent(input.checkoutSessionId),
        data
      })
    ];
    if (input.result === "paid") {
      work.push(
        this.emitStoreOwner({
          storeId: input.storeId,
          type,
          eventKey:
            "payment:" + input.attemptId + ":paid:merchant",
          deepLink: "/seller/(tabs)/orders",
          data
        })
      );
    }
    await Promise.all(work);
  }

  async orderAction(input: {
    id: string;
    orderNumber: string;
    customerUserId: string;
    storeId: string;
    state: string;
    paymentState: string;
    paymentProvider: string;
  }): Promise<void> {
    const data = {
      orderId: input.id,
      orderNumber: input.orderNumber,
      storeId: input.storeId
    };
    const customerLink = "/orders/" + input.id;
    const merchantLink = "/seller/order/" + input.id;

    const customer = async (
      type: NotificationType,
      suffix: string
    ) =>
      this.emit({
        userId: input.customerUserId,
        type,
        eventKey: "order:" + input.id + ":" + suffix + ":customer",
        deepLink: customerLink,
        data
      });

    switch (input.state) {
      case "confirmed":
        await customer("order_confirmed", "confirmed");
        await this.notifyLowStock(input.id, input.storeId, input.orderNumber);
        break;
      case "preparing":
        await customer("order_preparing", "preparing");
        break;
      case "out_for_delivery":
        await customer("out_for_delivery", "out_for_delivery");
        break;
      case "delivery_failed":
        await customer("delivery_failed", "delivery_failed");
        break;
      case "cancelled":
        await Promise.all([
          customer("order_cancelled", "cancelled"),
          this.emitStoreOwner({
            storeId: input.storeId,
            type: "order_cancelled",
            eventKey: "order:" + input.id + ":cancelled:merchant",
            deepLink: merchantLink,
            data
          })
        ]);
        break;
      case "delivered":
      case "picked_up":
        await Promise.all([
          customer("delivered", input.state),
          customer("review_available", "review_available"),
          this.emitStoreOwner({
            storeId: input.storeId,
            type: "delivered",
            eventKey: "order:" + input.id + ":" + input.state + ":merchant",
            deepLink: merchantLink,
            data
          })
        ]);
        break;
    }

    if (
      input.paymentProvider === "manual" &&
      input.paymentState === "paid" &&
      (input.state === "delivered" || input.state === "picked_up")
    ) {
      await Promise.all([
        this.emit({
          userId: input.customerUserId,
          type: "payment_successful",
          eventKey: "order:" + input.id + ":manual-payment:customer",
          deepLink: customerLink,
          data
        }),
        this.emitStoreOwner({
          storeId: input.storeId,
          type: "payment_successful",
          eventKey: "order:" + input.id + ":manual-payment:merchant",
          deepLink: merchantLink,
          data
        })
      ]);
    }
  }

  private async notifyLowStock(
    orderId: string,
    storeId: string,
    orderNumber: string
  ): Promise<void> {
    const items = await this.repository.lowStockForOrder(orderId);
    await Promise.all(
      items.map((item: LowStockItem) =>
        this.emitStoreOwner({
          storeId,
          type: "low_stock",
          eventKey:
            "low-stock:" +
            item.productId +
            ":" +
            item.freeQuantity,
          deepLink: "/seller/inventory",
          data: {
            orderId,
            orderNumber,
            productId: item.productId,
            productName: item.productName,
            freeQuantity: item.freeQuantity,
            threshold: item.threshold
          }
        })
      )
    );
  }

  async newReview(review: ProductReviewRecord): Promise<void> {
    await this.emitStoreOwner({
      storeId: review.storeId,
      type: "new_review",
      eventKey: "review:" + review.id + ":merchant",
      deepLink: "/seller/reviews",
      data: {
        reviewId: review.id,
        productId: review.productId,
        rating: review.rating
      }
    });
  }

  private async reconcileSubscriptionIssues(userId: string): Promise<void> {
    const issues = await this.repository.subscriptionIssues(userId);
    await Promise.all(
      issues.map((issue) =>
        this.emit({
          userId,
          type: "subscription_issue",
          eventKey:
            "subscription:" + issue.storeId + ":" + issue.status,
          deepLink: "/seller/subscription",
          data: {
            storeId: issue.storeId,
            storeName: issue.storeName,
            status: issue.status
          }
        })
      )
    );
  }

  async listNotifications(userId: string): Promise<NotificationListResponse> {
    await this.reconcileSubscriptionIssues(userId);
    return {
      notifications: await this.repository.listNotifications(userId),
      unreadCount: await this.repository.unreadCount(userId)
    };
  }

  async unreadCount(userId: string): Promise<number> {
    await this.reconcileSubscriptionIssues(userId);
    return this.repository.unreadCount(userId);
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    if (!(await this.repository.markRead(userId, notificationId))) {
      throw new CommunicationError("notification_not_found", 404);
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repository.markAllRead(userId);
  }

  async registerPushToken(
    userId: string,
    input: RegisterPushTokenInput
  ): Promise<void> {
    await this.repository.registerPushToken(
      userId,
      input.token.trim(),
      input.platform,
      input.deviceId?.trim() || null
    );
  }

  async createSupportTicket(
    userId: string,
    input: CreateSupportTicketInput
  ): Promise<SupportTicketRecord> {
    const ticket = await this.repository.createTicket(userId, input);
    if (!ticket) {
      throw new CommunicationError("support_context_invalid", 409);
    }
    return ticket;
  }

  async listSupportTickets(
    userId: string
  ): Promise<SupportTicketListResponse> {
    return {
      tickets: await this.repository.listUserTickets(userId)
    };
  }

  async getSupportTicket(
    userId: string,
    ticketId: string
  ): Promise<SupportTicketRecord> {
    const ticket = await this.repository.getUserTicket(userId, ticketId);
    if (!ticket) {
      throw new CommunicationError("support_ticket_not_found", 404);
    }
    return ticket;
  }

  async replySupportTicket(
    userId: string,
    ticketId: string,
    message: string
  ): Promise<SupportTicketRecord> {
    const current = await this.repository.getUserTicket(userId, ticketId);
    if (!current) {
      throw new CommunicationError("support_ticket_not_found", 404);
    }
    if (current.status === "closed") {
      throw new CommunicationError("support_ticket_closed", 409);
    }
    const ticket = await this.repository.replyUserTicket(
      userId,
      ticketId,
      message
    );
    if (!ticket) {
      throw new CommunicationError("support_ticket_not_found", 404);
    }
    return ticket;
  }

  async closeSupportTicket(
    userId: string,
    ticketId: string
  ): Promise<SupportTicketRecord> {
    const ticket = await this.repository.closeUserTicket(userId, ticketId);
    if (!ticket) {
      throw new CommunicationError("support_ticket_not_found", 404);
    }
    return ticket;
  }

  async listPlatformTickets(
    status?: SupportTicketStatus
  ): Promise<SupportTicketListResponse> {
    return {
      tickets: await this.repository.listPlatformTickets(status)
    };
  }

  async getPlatformTicket(ticketId: string): Promise<SupportTicketRecord> {
    const ticket = await this.repository.getPlatformTicket(ticketId);
    if (!ticket) {
      throw new CommunicationError("support_ticket_not_found", 404);
    }
    return ticket;
  }

  async replyPlatformTicket(
    actorUserId: string,
    ticketId: string,
    message: string
  ): Promise<SupportTicketRecord> {
    const current = await this.repository.getPlatformTicket(ticketId);
    if (!current) {
      throw new CommunicationError("support_ticket_not_found", 404);
    }
    if (current.status === "closed") {
      throw new CommunicationError("support_ticket_closed", 409);
    }
    const ticket = await this.repository.replyPlatformTicket(
      actorUserId,
      ticketId,
      message
    );
    if (!ticket) {
      throw new CommunicationError("support_ticket_not_found", 404);
    }
    await this.emit({
      userId: ticket.userId,
      type: "support_reply",
      eventKey:
        "support:" +
        ticket.id +
        ":reply:" +
        (ticket.messages.at(-1)?.id ?? Date.now()),
      deepLink: "/support/" + ticket.id,
      data: { ticketId: ticket.id }
    });
    return ticket;
  }

  async setPlatformTicketStatus(
    ticketId: string,
    status: SupportTicketStatus
  ): Promise<SupportTicketRecord> {
    const ticket = await this.repository.setPlatformTicketStatus(
      ticketId,
      status
    );
    if (!ticket) {
      throw new CommunicationError("support_ticket_not_found", 404);
    }
    return ticket;
  }
}
