import type {
  CreateProductReviewInput,
  ModerateReviewInput,
  ProductReviewRecord,
  ProductReviewsResponse,
  ReportReviewInput,
  ReviewEligibilityRecord,
  ReviewModerationQueueResponse,
  ReviewReportRecord,
  SellerTrustRecord,
  UpdateProductReviewInput
} from "@bazaarlink/contracts";
import {
  authAccounts,
  orderItems,
  orders,
  productReviews,
  reviewReports,
  stores,
  users,
  type Database,
  type ProductReview,
  type ReviewReport
} from "@bazaarlink/database";
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  sql
} from "drizzle-orm";

import { isReviewEligibleOrderState } from "./eligibility.js";
import { TrustRepositoryConflictError } from "./errors.js";

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  if (candidate.code === "23505") return true;
  return candidate.cause ? isUniqueViolation(candidate.cause) : false;
}

function toReview(
  row: ProductReview,
  displayName: string | null
): ProductReviewRecord {
  return {
    id: row.id,
    customerUserId: row.customerUserId,
    customerDisplayName: displayName,
    orderId: row.orderId,
    orderItemId: row.orderItemId,
    storeId: row.storeId,
    productId: row.productId,
    rating: row.rating,
    text: row.text,
    imageUrls: row.imageUrls,
    status: row.status,
    verifiedPurchase: true,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toReport(row: ReviewReport): ReviewReportRecord {
  return {
    id: row.id,
    reviewId: row.reviewId,
    reporterUserId: row.reporterUserId,
    reason: row.reason,
    details: row.details,
    status: row.status,
    resolutionNote: row.resolutionNote,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export interface TrustRepository {
  productReviews(productId: string): Promise<ProductReviewsResponse | null>;
  sellerTrust(storeId: string): Promise<SellerTrustRecord | null>;
  eligibility(
    userId: string,
    input?: { orderId?: string; orderItemId?: string }
  ): Promise<ReviewEligibilityRecord[]>;
  findCustomerReview(
    userId: string,
    reviewId: string
  ): Promise<ProductReviewRecord | null>;
  findReview(reviewId: string): Promise<ProductReviewRecord | null>;
  createReview(
    userId: string,
    input: CreateProductReviewInput
  ): Promise<ProductReviewRecord>;
  updateReview(
    userId: string,
    reviewId: string,
    input: UpdateProductReviewInput
  ): Promise<ProductReviewRecord | null>;
  reportReview(
    userId: string,
    reviewId: string,
    input: ReportReviewInput
  ): Promise<ReviewReportRecord | null>;
  moderationQueue(): Promise<ReviewModerationQueueResponse>;
  moderateReview(
    moderatorUserId: string,
    reviewId: string,
    input: ModerateReviewInput
  ): Promise<ProductReviewRecord | null>;
  listStoreReviews(
    ownerUserId: string,
    storeId: string
  ): Promise<ProductReviewRecord[] | null>;
}

export class DatabaseTrustRepository implements TrustRepository {
  constructor(private readonly db: Database) {}

  private async reviewRecord(
    reviewId: string
  ): Promise<ProductReviewRecord | null> {
    const [row] = await this.db
      .select({
        review: productReviews,
        displayName: users.displayName
      })
      .from(productReviews)
      .innerJoin(users, eq(users.id, productReviews.customerUserId))
      .where(eq(productReviews.id, reviewId))
      .limit(1);

    return row ? toReview(row.review, row.displayName) : null;
  }

  async productReviews(
    productId: string
  ): Promise<ProductReviewsResponse | null> {
    const [exists] = await this.db
      .select({ id: orderItems.productId })
      .from(orderItems)
      .where(eq(orderItems.productId, productId))
      .limit(1);

    const reviewRows = await this.db
      .select({
        review: productReviews,
        displayName: users.displayName
      })
      .from(productReviews)
      .innerJoin(users, eq(users.id, productReviews.customerUserId))
      .where(
        and(
          eq(productReviews.productId, productId),
          inArray(productReviews.status, ["published", "reported"])
        )
      )
      .orderBy(desc(productReviews.createdAt));

    if (!exists && reviewRows.length === 0) {
      const [product] = await this.db.execute(
        sql`select id from products where id = ${productId} limit 1`
      );
      if (!product) return null;
    }

    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const row of reviewRows) {
      counts[row.review.rating as 1 | 2 | 3 | 4 | 5] += 1;
      sum += row.review.rating;
    }

    return {
      productId,
      summary: {
        reviewCount: reviewRows.length,
        averageRating:
          reviewRows.length > 0
            ? Math.round((sum / reviewRows.length) * 10) / 10
            : null,
        ratingCounts: counts
      },
      reviews: reviewRows.map((row) =>
        toReview(row.review, row.displayName)
      )
    };
  }

  async sellerTrust(storeId: string): Promise<SellerTrustRecord | null> {
    const [row] = await this.db
      .select({
        id: stores.id,
        ownerUserId: stores.ownerUserId,
        phoneVerified: sql<boolean>`exists (
          select 1 from ${authAccounts}
          where ${authAccounts.userId} = ${stores.ownerUserId}
            and ${authAccounts.provider} = 'phone_password'
            and ${authAccounts.verifiedAt} is not null
        )`
      })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);

    if (!row) return null;

    return {
      storeId: row.id,
      phoneVerified: Boolean(row.phoneVerified),
      verificationLevel: row.phoneVerified
        ? "phone_verified"
        : "unverified"
    };
  }

  async eligibility(
    userId: string,
    input: { orderId?: string; orderItemId?: string } = {}
  ): Promise<ReviewEligibilityRecord[]> {
    const conditions = [eq(orders.customerUserId, userId)];
    if (input.orderId) conditions.push(eq(orders.id, input.orderId));
    if (input.orderItemId) {
      conditions.push(eq(orderItems.id, input.orderItemId));
    }

    const rows = await this.db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        orderState: orders.state,
        deliveredAt: orders.deliveredAt,
        pickedUpAt: orders.pickedUpAt,
        orderItemId: orderItems.id,
        productId: orderItems.productId,
        productName: orderItems.productName,
        variantTitle: orderItems.variantTitle,
        imageUrl: orderItems.imageUrl,
        reviewId: productReviews.id
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(
        productReviews,
        eq(productReviews.orderItemId, orderItems.id)
      )
      .where(and(...conditions))
      .orderBy(desc(orders.placedAt));

    return rows.map((row) => ({
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      orderState: row.orderState,
      orderItemId: row.orderItemId,
      productId: row.productId,
      productName: row.productName,
      variantTitle: row.variantTitle,
      imageUrl: row.imageUrl,
      eligible: isReviewEligibleOrderState(row.orderState),
      alreadyReviewed: Boolean(row.reviewId),
      reviewId: row.reviewId ?? null,
      completedAt:
        row.deliveredAt?.toISOString() ??
        row.pickedUpAt?.toISOString() ??
        null
    }));
  }

  async findCustomerReview(
    userId: string,
    reviewId: string
  ): Promise<ProductReviewRecord | null> {
    const [row] = await this.db
      .select({
        review: productReviews,
        displayName: users.displayName
      })
      .from(productReviews)
      .innerJoin(users, eq(users.id, productReviews.customerUserId))
      .where(
        and(
          eq(productReviews.id, reviewId),
          eq(productReviews.customerUserId, userId)
        )
      )
      .limit(1);
    return row ? toReview(row.review, row.displayName) : null;
  }

  async findReview(reviewId: string): Promise<ProductReviewRecord | null> {
    return this.reviewRecord(reviewId);
  }

  async createReview(
    userId: string,
    input: CreateProductReviewInput
  ): Promise<ProductReviewRecord> {
    const [eligible] = await this.eligibility(userId, {
      orderItemId: input.orderItemId
    });
    if (!eligible || !eligible.eligible || eligible.alreadyReviewed) {
      throw new TrustRepositoryConflictError("review");
    }

    try {
      const [created] = await this.db
        .insert(productReviews)
        .values({
          customerUserId: userId,
          orderId: eligible.orderId,
          orderItemId: eligible.orderItemId,
          storeId: (
            await this.db
              .select({ storeId: orders.storeId })
              .from(orders)
              .where(eq(orders.id, eligible.orderId))
              .limit(1)
          )[0]!.storeId,
          productId: eligible.productId,
          rating: input.rating,
          text: input.text?.trim() || null,
          imageUrls: input.imageUrls ?? []
        })
        .returning();

      if (!created) throw new Error("review_insert_failed");
      const record = await this.reviewRecord(created.id);
      if (!record) throw new Error("review_hydrate_failed");
      return record;
    } catch (error) {
      if (
        error instanceof TrustRepositoryConflictError ||
        isUniqueViolation(error)
      ) {
        throw new TrustRepositoryConflictError("review");
      }
      throw error;
    }
  }

  async updateReview(
    userId: string,
    reviewId: string,
    input: UpdateProductReviewInput
  ): Promise<ProductReviewRecord | null> {
    const [current] = await this.db
      .select()
      .from(productReviews)
      .where(
        and(
          eq(productReviews.id, reviewId),
          eq(productReviews.customerUserId, userId)
        )
      )
      .limit(1);

    if (!current) return null;
    if (current.status === "hidden" || current.status === "removed") {
      return null;
    }

    await this.db
      .update(productReviews)
      .set({
        ...(input.rating !== undefined ? { rating: input.rating } : {}),
        ...(input.text !== undefined
          ? { text: input.text?.trim() || null }
          : {}),
        ...(input.imageUrls !== undefined
          ? { imageUrls: input.imageUrls }
          : {}),
        updatedAt: new Date()
      })
      .where(eq(productReviews.id, reviewId));

    return this.reviewRecord(reviewId);
  }

  async reportReview(
    userId: string,
    reviewId: string,
    input: ReportReviewInput
  ): Promise<ReviewReportRecord | null> {
    const review = await this.findReview(reviewId);
    if (!review || review.status === "removed") return null;

    try {
      const [created] = await this.db.transaction(async (tx) => {
        const inserted = await tx
          .insert(reviewReports)
          .values({
            reviewId,
            reporterUserId: userId,
            reason: input.reason,
            details: input.details?.trim() || null
          })
          .returning();

        if (review.status === "published") {
          await tx
            .update(productReviews)
            .set({ status: "reported", updatedAt: new Date() })
            .where(eq(productReviews.id, reviewId));
        }
        return inserted;
      });

      return created ? toReport(created) : null;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new TrustRepositoryConflictError("report");
      }
      throw error;
    }
  }

  async moderationQueue(): Promise<ReviewModerationQueueResponse> {
    const rows = await this.db
      .select({
        report: reviewReports,
        review: productReviews,
        displayName: users.displayName
      })
      .from(reviewReports)
      .innerJoin(
        productReviews,
        eq(productReviews.id, reviewReports.reviewId)
      )
      .innerJoin(users, eq(users.id, productReviews.customerUserId))
      .where(eq(reviewReports.status, "open"))
      .orderBy(desc(reviewReports.createdAt));

    return {
      items: rows.map((row) => ({
        report: toReport(row.report),
        review: toReview(row.review, row.displayName)
      }))
    };
  }

  async moderateReview(
    moderatorUserId: string,
    reviewId: string,
    input: ModerateReviewInput
  ): Promise<ProductReviewRecord | null> {
    const current = await this.findReview(reviewId);
    if (!current) return null;

    const now = new Date();
    await this.db.transaction(async (tx) => {
      if (input.action === "dismiss_reports") {
        await tx
          .update(reviewReports)
          .set({
            status: "dismissed",
            resolvedByUserId: moderatorUserId,
            resolutionNote: input.reason?.trim() || null,
            resolvedAt: now,
            updatedAt: now
          })
          .where(
            and(
              eq(reviewReports.reviewId, reviewId),
              eq(reviewReports.status, "open")
            )
          );
        await tx
          .update(productReviews)
          .set({
            status: "published",
            moderatedByUserId: moderatorUserId,
            moderationReason: input.reason?.trim() || null,
            moderatedAt: now,
            updatedAt: now
          })
          .where(eq(productReviews.id, reviewId));
        return;
      }

      const status =
        input.action === "hide"
          ? "hidden"
          : input.action === "remove"
            ? "removed"
            : "published";

      await tx
        .update(productReviews)
        .set({
          status,
          moderatedByUserId: moderatorUserId,
          moderationReason: input.reason?.trim() || null,
          moderatedAt: now,
          updatedAt: now
        })
        .where(eq(productReviews.id, reviewId));

      await tx
        .update(reviewReports)
        .set({
          status: input.action === "publish" ? "dismissed" : "resolved",
          resolvedByUserId: moderatorUserId,
          resolutionNote: input.reason?.trim() || null,
          resolvedAt: now,
          updatedAt: now
        })
        .where(
          and(
            eq(reviewReports.reviewId, reviewId),
            eq(reviewReports.status, "open")
          )
        );
    });

    return this.reviewRecord(reviewId);
  }

  async listStoreReviews(
    ownerUserId: string,
    storeId: string
  ): Promise<ProductReviewRecord[] | null> {
    const [store] = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(
        and(
          eq(stores.id, storeId),
          eq(stores.ownerUserId, ownerUserId)
        )
      )
      .limit(1);
    if (!store) return null;

    const rows = await this.db
      .select({
        review: productReviews,
        displayName: users.displayName
      })
      .from(productReviews)
      .innerJoin(users, eq(users.id, productReviews.customerUserId))
      .where(eq(productReviews.storeId, storeId))
      .orderBy(desc(productReviews.createdAt));

    return rows.map((row) => toReview(row.review, row.displayName));
  }
}
