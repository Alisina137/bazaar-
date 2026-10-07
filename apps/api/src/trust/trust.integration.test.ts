import {
  authAccounts,
  carts,
  categories,
  checkoutSessions,
  closeDatabaseClient,
  createDatabaseClient,
  notifications,
  orderItems,
  orders,
  parseDatabaseConfig,
  productReviews,
  products,
  reviewReports,
  stores,
  supportTickets,
  users
} from "@bazaarlink/database";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  afterAll,
  describe,
  expect,
  it,
  vi
} from "vitest";

import { CommunicationService } from "../communication/service.js";
import { DatabaseCommunicationRepository } from "../communication/repository.js";
import { INTEGRATION_TEST_TIMEOUT_MS } from "../test/load-integration-env.js";
import { DatabaseTrustRepository } from "./repository.js";
import { TrustService } from "./service.js";

vi.setConfig({ testTimeout: INTEGRATION_TEST_TIMEOUT_MS });

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)(
  "database-backed Phase 9 trust and communication",
  () => {
    const client = createDatabaseClient(parseDatabaseConfig());
    const communicationRepository = new DatabaseCommunicationRepository(
      client.db
    );
    const communicationService = new CommunicationService(
      communicationRepository,
      {
        send: async () => []
      }
    );
    const trustService = new TrustService(
      new DatabaseTrustRepository(client.db),
      communicationService
    );

    const userIds: string[] = [];
    let storeId: string | null = null;
    let productId: string | null = null;
    let orderId: string | null = null;
    let checkoutSessionId: string | null = null;
    let cartId: string | null = null;
    let categoryId: string | null = null;

    afterAll(async () => {
      if (userIds.length > 0) {
        await client.db
          .delete(supportTickets)
          .where(inArray(supportTickets.userId, userIds));
      }

      if (userIds.length > 0) {
        await client.db
          .delete(reviewReports)
          .where(inArray(reviewReports.reporterUserId, userIds));
        await client.db
          .delete(productReviews)
          .where(inArray(productReviews.customerUserId, userIds));
        await client.db
          .delete(notifications)
          .where(inArray(notifications.userId, userIds));
      }

      if (orderId) {
        await client.db.delete(orders).where(eq(orders.id, orderId));
      }

      if (checkoutSessionId) {
        await client.db
          .delete(checkoutSessions)
          .where(eq(checkoutSessions.id, checkoutSessionId));
      }

      if (cartId) {
        await client.db.delete(carts).where(eq(carts.id, cartId));
      }

      if (productId) {
        await client.db.delete(products).where(eq(products.id, productId));
      }

      if (categoryId) {
        await client.db
          .delete(categories)
          .where(eq(categories.id, categoryId));
      }

      if (storeId) {
        await client.db.delete(stores).where(eq(stores.id, storeId));
      }

      if (userIds.length > 0) {
        await client.db.delete(users).where(inArray(users.id, userIds));
      }

      await closeDatabaseClient(client);
    });

    it(
      "links completed purchases to reviews, moderation, trust, notifications, and support",
      async () => {
        const [customer] = await client.db
          .insert(users)
          .values({
            displayName: "Phase 9 Customer",
            preferredLocale: "fa-AF"
          })
          .returning();
        const [owner] = await client.db
          .insert(users)
          .values({
            displayName: "Phase 9 Owner",
            preferredLocale: "fa-AF"
          })
          .returning();
        const [reporter] = await client.db
          .insert(users)
          .values({
            displayName: "Phase 9 Reporter",
            preferredLocale: "ps-AF"
          })
          .returning();
        const [moderator] = await client.db
          .insert(users)
          .values({
            displayName: "Phase 9 Support",
            preferredLocale: "en"
          })
          .returning();

        expect(customer && owner && reporter && moderator).toBeTruthy();
        if (!customer || !owner || !reporter || !moderator) {
          throw new Error("phase9_user_seed_failed");
        }

        userIds.push(
          customer.id,
          owner.id,
          reporter.id,
          moderator.id
        );

        await client.db.insert(authAccounts).values({
          userId: owner.id,
          provider: "phone_password",
          identifier: "+9379" + randomUUID().replace(/-/g, "").slice(0, 8),
          passwordHash: "phase9-test-hash",
          verifiedAt: new Date()
        });

        const [store] = await client.db
          .insert(stores)
          .values({
            ownerUserId: owner.id,
            name: "Phase 9 Trust Store",
            handle: "phase9-" + randomUUID().slice(0, 8),
            category: "Electronics",
            province: "Kabul",
            cityDistrict: "District 3",
            phone: "+93700000009",
            preferredLocale: "fa-AF",
            status: "published",
            publishedAt: new Date()
          })
          .returning();
        if (!store) throw new Error("phase9_store_seed_failed");
        storeId = store.id;

        const [category] = await client.db
          .insert(categories)
          .values({
            storeId: store.id,
            name: "Phase 9 Products"
          })
          .returning();
        if (!category) throw new Error("phase9_category_seed_failed");
        categoryId = category.id;

        const [product] = await client.db
          .insert(products)
          .values({
            storeId: store.id,
            categoryId: category.id,
            name: "Phase 9 Phone",
            price: "1000.00",
            status: "active",
            availableQuantity: 10,
            publishedAt: new Date()
          })
          .returning();
        if (!product) throw new Error("phase9_product_seed_failed");
        productId = product.id;

        const [cart] = await client.db
          .insert(carts)
          .values({ userId: customer.id })
          .returning();
        if (!cart) throw new Error("phase9_cart_seed_failed");
        cartId = cart.id;

        const [checkout] = await client.db
          .insert(checkoutSessions)
          .values({
            userId: customer.id,
            cartId: cart.id,
            status: "ordered"
          })
          .returning();
        if (!checkout) throw new Error("phase9_checkout_seed_failed");
        checkoutSessionId = checkout.id;

        const [order] = await client.db
          .insert(orders)
          .values({
            orderNumber: "BZ-P9-" + randomUUID().slice(0, 8),
            checkoutSessionId: checkout.id,
            customerUserId: customer.id,
            storeId: store.id,
            idempotencyKey: "phase9-" + randomUUID(),
            state: "delivered",
            fulfillmentType: "delivery",
            itemsSubtotal: "1000.00",
            productDiscount: "0.00",
            couponDiscount: "0.00",
            preDeliveryTotal: "1000.00",
            deliveryBase: "50.00",
            urgencySurcharge: "0.00",
            productDeliverySurcharge: "0.00",
            freeDeliveryDiscount: "0.00",
            deliveryTotal: "50.00",
            total: "1050.00",
            deliverySnapshot: {},
            paymentSnapshot: {
              method: "cash_on_delivery",
              provider: "manual",
              state: "paid"
            },
            confirmationExpiresAt: new Date(Date.now() + 60_000),
            deliveredAt: new Date()
          })
          .returning();
        if (!order) throw new Error("phase9_order_seed_failed");
        orderId = order.id;

        const [orderItem] = await client.db
          .insert(orderItems)
          .values({
            orderId: order.id,
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitListPrice: "1000.00",
            unitPrice: "1000.00",
            lineItemsSubtotal: "1000.00",
            lineProductDiscount: "0.00",
            lineTotal: "1000.00"
          })
          .returning();
        if (!orderItem) throw new Error("phase9_order_item_seed_failed");

        const trust = await trustService.sellerTrust(store.id);
        expect(trust).toMatchObject({
          phoneVerified: true,
          verificationLevel: "phone_verified"
        });

        const eligibility = await trustService.eligibility(
          customer.id,
          order.id
        );
        expect(eligibility.items).toHaveLength(1);
        expect(eligibility.items[0]).toMatchObject({
          orderItemId: orderItem.id,
          eligible: true,
          alreadyReviewed: false
        });

        const review = await trustService.createReview(customer.id, {
          orderItemId: orderItem.id,
          rating: 5,
          text: "Excellent verified purchase."
        });
        expect(review).toMatchObject({
          verifiedPurchase: true,
          rating: 5,
          productId: product.id,
          storeId: store.id
        });

        const sellerResponse = await trustService.respondStoreReview(
          owner.id,
          store.id,
          review.id,
          "Thank you for your review."
        );
        expect(sellerResponse.merchantResponse).toBe(
          "Thank you for your review."
        );

        await expect(
          trustService.createReview(customer.id, {
            orderItemId: orderItem.id,
            rating: 4
          })
        ).rejects.toMatchObject({ code: "review_already_exists" });

        const publicReviews = await trustService.productReviews(product.id);
        expect(publicReviews.summary).toMatchObject({
          reviewCount: 1,
          averageRating: 5
        });
        expect(publicReviews.reviews[0]?.verifiedPurchase).toBe(true);

        const report = await trustService.reportReview(
          reporter.id,
          review.id,
          {
            reason: "misleading",
            details: "Phase 9 moderation test"
          }
        );
        expect(report.status).toBe("open");

        const queue = await trustService.moderationQueue();
        expect(
          queue.items.some((item) => item.review.id === review.id)
        ).toBe(true);

        const hidden = await trustService.moderateReview(
          moderator.id,
          review.id,
          {
            action: "hide",
            reason: "Integration moderation"
          }
        );
        expect(hidden.status).toBe("hidden");

        const afterModeration = await trustService.productReviews(
          product.id
        );
        expect(afterModeration.summary.reviewCount).toBe(0);

        await communicationService.orderPlaced({
          id: order.id,
          orderNumber: order.orderNumber,
          customerUserId: customer.id,
          storeId: store.id
        });
        await communicationService.orderPlaced({
          id: order.id,
          orderNumber: order.orderNumber,
          customerUserId: customer.id,
          storeId: store.id
        });

        const customerNotifications =
          await communicationRepository.listNotifications(customer.id);
        expect(
          customerNotifications.filter(
            (item) => item.type === "order_placed"
          )
        ).toHaveLength(1);

        const ownerNotifications =
          await communicationRepository.listNotifications(owner.id);
        expect(
          ownerNotifications.some((item) => item.type === "new_review")
        ).toBe(true);
        expect(
          ownerNotifications.filter(
            (item) => item.type === "order_placed"
          )
        ).toHaveLength(1);

        const ticket = await communicationService.createSupportTicket(
          customer.id,
          {
            category: "account",
            subject: "Phase 9 support test",
            message: "Please help with my account."
          }
        );
        expect(ticket.status).toBe("waiting_support");

        const replied = await communicationService.replyPlatformTicket(
          moderator.id,
          ticket.id,
          "Support reply from Phase 9."
        );
        expect(replied.status).toBe("waiting_customer");
        expect(replied.messages.at(-1)?.authorKind).toBe("platform");

        const afterSupport =
          await communicationRepository.listNotifications(customer.id);
        expect(
          afterSupport.some((item) => item.type === "support_reply")
        ).toBe(true);
      }
    );
  }
);
