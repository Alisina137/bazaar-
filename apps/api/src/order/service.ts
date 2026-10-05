import type {
  CancelOrderInput,
  MerchantOrderActionInput,
  OrderListResponse,
  OrderRecord,
  PlaceOrderInput,
  PlaceOrderResponse
} from "@bazaarlink/contracts";

import type { DeliveryServiceContract } from "../delivery/service.js";
import type { PaymentServiceContract } from "../payment/service.js";
import { OrderError } from "./errors.js";
import type { OrderRepository } from "./repository.js";

export interface OrderServiceContract {
  placeOrder(
    userId: string,
    input: PlaceOrderInput
  ): Promise<PlaceOrderResponse>;
  listCustomerOrders(userId: string): Promise<OrderListResponse>;
  getCustomerOrder(
    userId: string,
    orderId: string
  ): Promise<OrderRecord>;
  cancelCustomerOrder(
    userId: string,
    orderId: string,
    input: CancelOrderInput
  ): Promise<OrderRecord>;
  listMerchantOrders(
    ownerUserId: string,
    storeId: string
  ): Promise<OrderListResponse>;
  getMerchantOrder(
    ownerUserId: string,
    storeId: string,
    orderId: string
  ): Promise<OrderRecord>;
  merchantAction(
    ownerUserId: string,
    storeId: string,
    orderId: string,
    input: MerchantOrderActionInput
  ): Promise<OrderRecord>;
}

export class OrderService implements OrderServiceContract {
  constructor(
    private readonly repository: OrderRepository,
    private readonly deliveryService: DeliveryServiceContract,
    private readonly paymentService: PaymentServiceContract
  ) {}

  async placeOrder(
    userId: string,
    input: PlaceOrderInput
  ): Promise<PlaceOrderResponse> {
    const existing = await this.repository.findByCheckout(
      userId,
      input.checkoutSessionId
    );

    if (existing.length > 0) {
      return { orders: existing, reused: true };
    }

    let quote;
    try {
      quote = await this.deliveryService.getCheckoutQuote(
        userId,
        input.checkoutSessionId
      );
    } catch {
      throw new OrderError("checkout_unavailable", 409);
    }

    let payment;
    try {
      payment = await this.paymentService.status(
        userId,
        input.checkoutSessionId
      );
    } catch {
      throw new OrderError("payment_not_ready", 409);
    }

    if (!payment.canProceedToReview) {
      throw new OrderError("payment_not_ready", 409);
    }

    if (
      payment.attempts.length !== quote.cart.groups.length ||
      quote.cart.groups.some(
        (group) =>
          !payment.attempts.some(
            (attempt) => attempt.storeId === group.store.id
          )
      )
    ) {
      throw new OrderError("payment_not_ready", 409);
    }

    return this.repository.placeOrders({
      userId,
      quote,
      attempts: payment.attempts,
      idempotencyKey: input.idempotencyKey
    });
  }

  async listCustomerOrders(userId: string): Promise<OrderListResponse> {
    await this.repository.expireCustomerReservations(userId);
    return {
      orders: await this.repository.listCustomerOrders(userId)
    };
  }

  async getCustomerOrder(
    userId: string,
    orderId: string
  ): Promise<OrderRecord> {
    await this.repository.expireCustomerReservations(userId);
    const order = await this.repository.getCustomerOrder(userId, orderId);
    if (!order) throw new OrderError("order_not_found", 404);
    return order;
  }

  async cancelCustomerOrder(
    userId: string,
    orderId: string,
    input: CancelOrderInput
  ): Promise<OrderRecord> {
    const reason = input.reason.trim();
    if (!reason) throw new OrderError("invalid_request", 400);

    await this.repository.expireCustomerReservations(userId);
    const order = await this.repository.customerCancel(
      userId,
      orderId,
      reason
    );
    if (!order) throw new OrderError("order_not_found", 404);
    return order;
  }

  async listMerchantOrders(
    ownerUserId: string,
    storeId: string
  ): Promise<OrderListResponse> {
    await this.repository.expireStoreReservations(storeId);
    const orders = await this.repository.listMerchantOrders(
      ownerUserId,
      storeId
    );
    if (!orders) throw new OrderError("order_not_found", 404);
    return { orders };
  }

  async getMerchantOrder(
    ownerUserId: string,
    storeId: string,
    orderId: string
  ): Promise<OrderRecord> {
    await this.repository.expireStoreReservations(storeId);
    const order = await this.repository.getMerchantOrder(
      ownerUserId,
      storeId,
      orderId
    );
    if (!order) throw new OrderError("order_not_found", 404);
    return order;
  }

  async merchantAction(
    ownerUserId: string,
    storeId: string,
    orderId: string,
    input: MerchantOrderActionInput
  ): Promise<OrderRecord> {
    await this.repository.expireStoreReservations(storeId);
    const order = await this.repository.merchantAction(
      ownerUserId,
      storeId,
      orderId,
      input.action,
      input.reason?.trim() || null
    );
    if (!order) throw new OrderError("order_not_found", 404);
    return order;
  }
}
