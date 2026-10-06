import type { OrderState } from "./order.js";

export const reviewStatuses = [
  "published",
  "reported",
  "hidden",
  "removed"
] as const;

export type ReviewStatus = (typeof reviewStatuses)[number];

export const reviewReportStatuses = [
  "open",
  "resolved",
  "dismissed"
] as const;

export type ReviewReportStatus =
  (typeof reviewReportStatuses)[number];

export const reviewReportReasons = [
  "spam",
  "abuse",
  "misleading",
  "inappropriate",
  "other"
] as const;

export type ReviewReportReason =
  (typeof reviewReportReasons)[number];

export interface ProductReviewRecord {
  id: string;
  customerUserId: string;
  customerDisplayName: string | null;
  orderId: string;
  orderItemId: string;
  storeId: string;
  productId: string;
  rating: number;
  text: string | null;
  imageUrls: string[];
  status: ReviewStatus;
  verifiedPurchase: true;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviewSummary {
  reviewCount: number;
  averageRating: number | null;
  ratingCounts: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ProductReviewsResponse {
  productId: string;
  summary: ProductReviewSummary;
  reviews: ProductReviewRecord[];
}

export interface ReviewEligibilityRecord {
  orderId: string;
  orderNumber: string;
  orderState: OrderState;
  orderItemId: string;
  productId: string;
  productName: string;
  variantTitle: string | null;
  imageUrl: string | null;
  eligible: boolean;
  alreadyReviewed: boolean;
  completedAt: string | null;
}

export interface ReviewEligibilityResponse {
  items: ReviewEligibilityRecord[];
}

export interface CreateProductReviewInput {
  orderItemId: string;
  rating: number;
  text?: string | null | undefined;
  imageUrls?: string[] | undefined;
}

export interface UpdateProductReviewInput {
  rating?: number | undefined;
  text?: string | null | undefined;
  imageUrls?: string[] | undefined;
}

export interface ReportReviewInput {
  reason: ReviewReportReason;
  details?: string | null | undefined;
}

export interface ReviewReportRecord {
  id: string;
  reviewId: string;
  reporterUserId: string;
  reason: ReviewReportReason;
  details: string | null;
  status: ReviewReportStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModerateReviewInput {
  action: "publish" | "hide" | "remove" | "dismiss_reports";
  reason?: string | null | undefined;
}

export const trustErrorCodes = [
  "invalid_request",
  "invalid_session",
  "account_unavailable",
  "forbidden",
  "product_not_found",
  "review_not_found",
  "review_not_eligible",
  "review_already_exists",
  "review_report_already_exists",
  "review_moderation_conflict",
  "rate_limited",
  "service_unavailable"
] as const;

export type TrustErrorCode = (typeof trustErrorCodes)[number];

export interface TrustErrorResponse {
  error: {
    code: TrustErrorCode;
  };
}
