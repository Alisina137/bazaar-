import type {
  CustomerWishlistResponse, WishlistErrorCode, WishlistMutationResponse
} from "@bazaarlink/contracts";

const TIMEOUT_MS = 12_000;
const base = () => (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export class WishlistApiError extends Error {
  constructor(
    public readonly code: WishlistErrorCode,
    public readonly httpStatus: number | null = null
  ) {
    super(code);
    this.name = "WishlistApiError";
  }
}

async function request<T>(token: string, path: string, method: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(base() + path, {
      method,
      signal: controller.signal,
      headers: { authorization: "Bearer " + token, "content-type": "application/json" }
    });
    if (!response.ok) {
      let code: WishlistErrorCode = "service_unavailable";
      try {
        const data = await response.json() as { error?: { code?: WishlistErrorCode } };
        const candidate = data.error?.code;
        if (candidate && [
          "invalid_request", "invalid_session", "account_unavailable",
          "product_not_found", "wishlist_full", "rate_limited", "service_unavailable"
        ].includes(candidate)) code = candidate;
      } catch { /* Do not leak provider errors. */ }
      throw new WishlistApiError(code, response.status);
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof WishlistApiError) throw error;
    throw new WishlistApiError("service_unavailable");
  } finally {
    clearTimeout(timer);
  }
}

export function getWishlist(token: string): Promise<CustomerWishlistResponse> {
  return request(token, "/customer/wishlist", "GET");
}

export function saveWishlistProduct(token: string, productId: string): Promise<WishlistMutationResponse> {
  return request(token, "/customer/wishlist/" + encodeURIComponent(productId), "PUT");
}

export function removeWishlistProduct(token: string, productId: string): Promise<WishlistMutationResponse> {
  return request(token, "/customer/wishlist/" + encodeURIComponent(productId), "DELETE");
}
