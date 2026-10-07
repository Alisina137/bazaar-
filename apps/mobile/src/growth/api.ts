import type {
  AcceptMerchantStaffInviteInput,
  CreateMerchantCouponInput,
  CreateMerchantPromotionInput,
  GrowthErrorCode,
  GrowthErrorResponse,
  MerchantAnalyticsResponse,
  MerchantCouponRecord,
  MerchantDashboardResponse,
  MerchantPromotionRecord,
  MerchantStaffInviteRecord,
  MerchantStaffRecord,
  MerchantStaffResponse,
  ResolvedGrowthAccess,
  SubscriptionChangeInput,
  SubscriptionGrowthResponse,
  UpdateMerchantCouponInput,
  UpdateMerchantPromotionInput,
  UpdateMerchantStaffInput
} from "@bazaarlink/contracts";

const REQUEST_TIMEOUT_MS = 12_000;

function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
}

export class GrowthApiError extends Error {
  constructor(public readonly code: GrowthErrorCode) {
    super(code);
    this.name = "GrowthApiError";
  }
}

async function requestJson<T>(
  path: string,
  token: string,
  init: RequestInit = { method: "GET" }
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(apiBaseUrl() + path, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + token,
        ...init.headers
      }
    });
    if (!response.ok) {
      let code: GrowthErrorCode = "service_unavailable";
      try {
        const payload = (await response.json()) as Partial<GrowthErrorResponse>;
        if (payload.error?.code) code = payload.error.code;
      } catch {}
      throw new GrowthApiError(code);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof GrowthApiError) throw error;
    throw new GrowthApiError("service_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

export function storeAccess(
  token: string,
  storeId: string
): Promise<ResolvedGrowthAccess> {
  return requestJson(
    "/seller/stores/" + encodeURIComponent(storeId) + "/access",
    token
  );
}

export function merchantDashboard(
  token: string,
  storeId: string
): Promise<MerchantDashboardResponse> {
  return requestJson(
    "/seller/stores/" + encodeURIComponent(storeId) + "/dashboard",
    token
  );
}

export function merchantAnalytics(
  token: string,
  storeId: string,
  days = 30
): Promise<MerchantAnalyticsResponse> {
  return requestJson(
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/analytics?days=" +
      days,
    token
  );
}

export function coupons(token: string, storeId: string) {
  return requestJson<{ coupons: MerchantCouponRecord[] }>(
    "/seller/stores/" + encodeURIComponent(storeId) + "/coupons",
    token
  );
}

export function createCoupon(
  token: string,
  storeId: string,
  input: CreateMerchantCouponInput
): Promise<MerchantCouponRecord> {
  return requestJson(
    "/seller/stores/" + encodeURIComponent(storeId) + "/coupons",
    token,
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function updateCoupon(
  token: string,
  storeId: string,
  couponId: string,
  input: UpdateMerchantCouponInput
): Promise<MerchantCouponRecord> {
  return requestJson(
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/coupons/" +
      encodeURIComponent(couponId),
    token,
    { method: "PATCH", body: JSON.stringify(input) }
  );
}

export function deleteCoupon(
  token: string,
  storeId: string,
  couponId: string
): Promise<void> {
  return requestJson(
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/coupons/" +
      encodeURIComponent(couponId),
    token,
    { method: "DELETE" }
  );
}

export function promotions(token: string, storeId: string) {
  return requestJson<{ promotions: MerchantPromotionRecord[] }>(
    "/seller/stores/" + encodeURIComponent(storeId) + "/promotions",
    token
  );
}

export function createPromotion(
  token: string,
  storeId: string,
  input: CreateMerchantPromotionInput
): Promise<MerchantPromotionRecord> {
  return requestJson(
    "/seller/stores/" + encodeURIComponent(storeId) + "/promotions",
    token,
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function updatePromotion(
  token: string,
  storeId: string,
  promotionId: string,
  input: UpdateMerchantPromotionInput
): Promise<MerchantPromotionRecord> {
  return requestJson(
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/promotions/" +
      encodeURIComponent(promotionId),
    token,
    { method: "PATCH", body: JSON.stringify(input) }
  );
}

export function deletePromotion(
  token: string,
  storeId: string,
  promotionId: string
): Promise<void> {
  return requestJson(
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/promotions/" +
      encodeURIComponent(promotionId),
    token,
    { method: "DELETE" }
  );
}

export function staff(
  token: string,
  storeId: string
): Promise<MerchantStaffResponse> {
  return requestJson(
    "/seller/stores/" + encodeURIComponent(storeId) + "/staff",
    token
  );
}

export function createStaffInvite(
  token: string,
  storeId: string,
  input: { email: string; permissions: string[] }
): Promise<MerchantStaffInviteRecord> {
  return requestJson(
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/staff/invites",
    token,
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function revokeStaffInvite(
  token: string,
  storeId: string,
  inviteId: string
): Promise<void> {
  return requestJson(
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/staff/invites/" +
      encodeURIComponent(inviteId) +
      "/revoke",
    token,
    { method: "POST" }
  );
}

export function acceptStaffInvite(
  token: string,
  input: AcceptMerchantStaffInviteInput
): Promise<MerchantStaffRecord> {
  return requestJson(
    "/seller/staff-invites/accept",
    token,
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function updateStaff(
  token: string,
  storeId: string,
  staffId: string,
  input: UpdateMerchantStaffInput
): Promise<MerchantStaffRecord> {
  return requestJson(
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/staff/" +
      encodeURIComponent(staffId),
    token,
    { method: "PATCH", body: JSON.stringify(input) }
  );
}

export function removeStaff(
  token: string,
  storeId: string,
  staffId: string
): Promise<void> {
  return requestJson(
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/staff/" +
      encodeURIComponent(staffId),
    token,
    { method: "DELETE" }
  );
}

export function changeSubscription(
  token: string,
  storeId: string,
  input: SubscriptionChangeInput
): Promise<SubscriptionGrowthResponse> {
  return requestJson(
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/subscription/change",
    token,
    { method: "POST", body: JSON.stringify(input) }
  );
}
