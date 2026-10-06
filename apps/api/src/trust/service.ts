import type {
  CreateProductReviewInput,
  CustomerReviewEditorResponse,
  ModerateReviewInput,
  ProductReviewRecord,
  ProductReviewsResponse,
  ReportReviewInput,
  ReviewEligibilityResponse,
  ReviewModerationQueueResponse,
  ReviewReportRecord,
  SellerTrustRecord,
  UpdateProductReviewInput
} from "@bazaarlink/contracts";

import {
  TrustError,
  TrustRepositoryConflictError
} from "./errors.js";
import type { TrustRepository } from "./repository.js";

export interface TrustNotificationEmitter {
  newReview(review: ProductReviewRecord): Promise<void>;
}

export interface TrustServiceContract {
  productReviews(productId: string): Promise<ProductReviewsResponse>;
  sellerTrust(storeId: string): Promise<SellerTrustRecord>;
  eligibility(
    userId: string,
    orderId?: string
  ): Promise<ReviewEligibilityResponse>;
  editor(
    userId: string,
    orderItemId: string
  ): Promise<CustomerReviewEditorResponse>;
  createReview(
    userId: string,
    input: CreateProductReviewInput
  ): Promise<ProductReviewRecord>;
  updateReview(
    userId: string,
    reviewId: string,
    input: UpdateProductReviewInput
  ): Promise<ProductReviewRecord>;
  reportReview(
    userId: string,
    reviewId: string,
    input: ReportReviewInput
  ): Promise<ReviewReportRecord>;
  storeReviews(
    ownerUserId: string,
    storeId: string
  ): Promise<ProductReviewRecord[]>;
  respondStoreReview(
    ownerUserId: string,
    storeId: string,
    reviewId: string,
    response: string
  ): Promise<ProductReviewRecord>;
  moderationQueue(): Promise<ReviewModerationQueueResponse>;
  moderateReview(
    moderatorUserId: string,
    reviewId: string,
    input: ModerateReviewInput
  ): Promise<ProductReviewRecord>;
}

export class TrustService implements TrustServiceContract {
  constructor(
    private readonly repository: TrustRepository,
    private readonly notifier?: TrustNotificationEmitter
  ) {}

  async productReviews(productId: string): Promise<ProductReviewsResponse> {
    const result = await this.repository.productReviews(productId);
    if (!result) throw new TrustError("product_not_found", 404);
    return result;
  }

  async sellerTrust(storeId: string): Promise<SellerTrustRecord> {
    const result = await this.repository.sellerTrust(storeId);
    if (!result) throw new TrustError("store_not_found", 404);
    return result;
  }

  async eligibility(
    userId: string,
    orderId?: string
  ): Promise<ReviewEligibilityResponse> {
    return {
      items: await this.repository.eligibility(
        userId,
        orderId ? { orderId } : {}
      )
    };
  }

  async editor(
    userId: string,
    orderItemId: string
  ): Promise<CustomerReviewEditorResponse> {
    const [eligibility] = await this.repository.eligibility(userId, {
      orderItemId
    });
    if (!eligibility) throw new TrustError("review_not_eligible", 404);

    const review = eligibility.reviewId
      ? await this.repository.findCustomerReview(
          userId,
          eligibility.reviewId
        )
      : null;

    return { eligibility, review };
  }

  async createReview(
    userId: string,
    input: CreateProductReviewInput
  ): Promise<ProductReviewRecord> {
    const [eligibility] = await this.repository.eligibility(userId, {
      orderItemId: input.orderItemId
    });
    if (!eligibility || !eligibility.eligible) {
      throw new TrustError("review_not_eligible", 409);
    }
    if (eligibility.alreadyReviewed) {
      throw new TrustError("review_already_exists", 409);
    }

    try {
      const review = await this.repository.createReview(userId, input);
      await this.notifier?.newReview(review);
      return review;
    } catch (error) {
      if (
        error instanceof TrustRepositoryConflictError &&
        error.kind === "review"
      ) {
        throw new TrustError("review_already_exists", 409);
      }
      throw error;
    }
  }

  async updateReview(
    userId: string,
    reviewId: string,
    input: UpdateProductReviewInput
  ): Promise<ProductReviewRecord> {
    const review = await this.repository.updateReview(
      userId,
      reviewId,
      input
    );
    if (!review) throw new TrustError("review_not_found", 404);
    return review;
  }

  async reportReview(
    userId: string,
    reviewId: string,
    input: ReportReviewInput
  ): Promise<ReviewReportRecord> {
    const review = await this.repository.findReview(reviewId);
    if (!review || review.status === "removed") {
      throw new TrustError("review_not_found", 404);
    }
    if (review.customerUserId === userId) {
      throw new TrustError("forbidden", 403);
    }

    try {
      const report = await this.repository.reportReview(
        userId,
        reviewId,
        input
      );
      if (!report) throw new TrustError("review_not_found", 404);
      return report;
    } catch (error) {
      if (
        error instanceof TrustRepositoryConflictError &&
        error.kind === "report"
      ) {
        throw new TrustError("review_report_already_exists", 409);
      }
      throw error;
    }
  }

  async storeReviews(
    ownerUserId: string,
    storeId: string
  ): Promise<ProductReviewRecord[]> {
    const reviews = await this.repository.listStoreReviews(
      ownerUserId,
      storeId
    );
    if (!reviews) throw new TrustError("store_not_found", 404);
    return reviews;
  }

  async respondStoreReview(
    ownerUserId: string,
    storeId: string,
    reviewId: string,
    response: string
  ): Promise<ProductReviewRecord> {
    if (!response.trim()) throw new TrustError("invalid_request", 400);
    const review = await this.repository.respondStoreReview(
      ownerUserId,
      storeId,
      reviewId,
      response
    );
    if (!review) throw new TrustError("review_not_found", 404);
    return review;
  }

  async moderationQueue(): Promise<ReviewModerationQueueResponse> {
    return this.repository.moderationQueue();
  }

  async moderateReview(
    moderatorUserId: string,
    reviewId: string,
    input: ModerateReviewInput
  ): Promise<ProductReviewRecord> {
    const review = await this.repository.moderateReview(
      moderatorUserId,
      reviewId,
      input
    );
    if (!review) throw new TrustError("review_not_found", 404);
    return review;
  }
}
