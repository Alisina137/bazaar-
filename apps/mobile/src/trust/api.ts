import type {
  CreateProductReviewInput,
  CustomerReviewEditorResponse,
  ProductReviewRecord,
  ProductReviewsResponse,
  ReportReviewInput,
  ReviewEligibilityResponse,
  ReviewModerationQueueResponse,
  SellerTrustRecord,
  TrustErrorCode,
  TrustErrorResponse,
  UpdateProductReviewInput
} from "@bazaarlink/contracts";

const REQUEST_TIMEOUT_MS = 12_000;

function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
}

export class TrustApiError extends Error {
  constructor(public readonly code: TrustErrorCode) {
    super(code);
    this.name = "TrustApiError";
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit = { method: "GET" },
  token?: string
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(apiBaseUrl() + path, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: "Bearer " + token } : {}),
        ...init.headers
      }
    });

    if (!response.ok) {
      let code: TrustErrorCode = "service_unavailable";
      try {
        const payload = (await response.json()) as Partial<TrustErrorResponse>;
        if (payload.error?.code) code = payload.error.code;
      } catch {
        // Keep safe public error.
      }
      throw new TrustApiError(code);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof TrustApiError) throw error;
    throw new TrustApiError("service_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

export function productReviews(
  productId: string
): Promise<ProductReviewsResponse> {
  return requestJson(
    "/trust/products/" + encodeURIComponent(productId) + "/reviews"
  );
}

export function sellerTrust(storeId: string): Promise<SellerTrustRecord> {
  return requestJson("/trust/stores/" + encodeURIComponent(storeId));
}

export function reviewEligibility(
  token: string,
  orderId?: string
): Promise<ReviewEligibilityResponse> {
  return requestJson(
    "/customer/reviews/eligibility" +
      (orderId ? "?orderId=" + encodeURIComponent(orderId) : ""),
    { method: "GET" },
    token
  );
}

export function reviewEditor(
  token: string,
  orderItemId: string
): Promise<CustomerReviewEditorResponse> {
  return requestJson(
    "/customer/reviews/editor/" + encodeURIComponent(orderItemId),
    { method: "GET" },
    token
  );
}

export function createReview(
  token: string,
  input: CreateProductReviewInput
): Promise<ProductReviewRecord> {
  return requestJson(
    "/customer/reviews",
    { method: "POST", body: JSON.stringify(input) },
    token
  );
}

export function updateReview(
  token: string,
  reviewId: string,
  input: UpdateProductReviewInput
): Promise<ProductReviewRecord> {
  return requestJson(
    "/customer/reviews/" + encodeURIComponent(reviewId),
    { method: "PUT", body: JSON.stringify(input) },
    token
  );
}

export function reportReview(
  token: string,
  reviewId: string,
  input: ReportReviewInput
) {
  return requestJson(
    "/customer/reviews/" + encodeURIComponent(reviewId) + "/report",
    { method: "POST", body: JSON.stringify(input) },
    token
  );
}

export function sellerReviews(token: string, storeId: string) {
  return requestJson<{ reviews: ProductReviewRecord[] }>(
    "/seller/stores/" + encodeURIComponent(storeId) + "/reviews",
    { method: "GET" },
    token
  );
}

export function moderationQueue(
  token: string
): Promise<ReviewModerationQueueResponse> {
  return requestJson(
    "/platform/review-reports",
    { method: "GET" },
    token
  );
}

export function moderateReview(
  token: string,
  reviewId: string,
  input: {
    action: "publish" | "hide" | "remove" | "dismiss_reports";
    reason?: string | null;
  }
): Promise<ProductReviewRecord> {
  return requestJson(
    "/platform/reviews/" + encodeURIComponent(reviewId) + "/moderate",
    { method: "POST", body: JSON.stringify(input) },
    token
  );
}

export function respondToReview(
  token: string,
  storeId: string,
  reviewId: string,
  response: string
): Promise<ProductReviewRecord> {
  return requestJson(
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/reviews/" +
      encodeURIComponent(reviewId) +
      "/respond",
    { method: "POST", body: JSON.stringify({ response }) },
    token
  );
}
