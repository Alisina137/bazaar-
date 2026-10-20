import type {
  CancelOrderInput,
  MerchantOrderActionInput,
  OrderErrorCode,
  OrderErrorResponse,
  OrderListResponse,
  OrderRecord,
  PlaceOrderInput,
  PlaceOrderResponse
} from "@bazaarlink/contracts";

const REQUEST_TIMEOUT_MS = 12_000;
// Placing multi-merchant orders reserves stock in a transaction across many rows.
const PLACE_ORDER_TIMEOUT_MS = 45_000;

function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
}

export class OrderApiError extends Error {
  constructor(
    public readonly code: OrderErrorCode,
    public readonly httpStatus: number | null = null,
    public readonly transport: "network" | "timeout" | null = null,
    public readonly reference: string | null = null
  ) {
    super(code);
    this.name = "OrderApiError";
  }
}

async function requestJson<T>(
  token: string,
  path: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiBaseUrl() + path, {
      ...init,
      signal: controller.signal,
      headers: {
        authorization: "Bearer " + token,
        ...(init.body != null ? { "content-type": "application/json" } : {}),
        ...init.headers
      }
    });

    if (!response.ok) {
      let code: OrderErrorCode = "service_unavailable";
      let reference: string | null = null;
      try {
        const payload = (await response.json()) as Partial<OrderErrorResponse>;
        if (payload.error?.code) code = payload.error.code;
        const candidate = payload.error?.reference;
        if (typeof candidate === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(candidate)) {
          reference = candidate;
        }
      } catch {
        // Keep the safe generic code.
      }
      throw new OrderApiError(code, response.status, null, reference);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof OrderApiError) throw error;
    throw new OrderApiError(
      "service_unavailable", null,
      controller.signal.aborted ? "timeout" : "network"
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function placeOrder(
  token: string,
  input: PlaceOrderInput
): Promise<PlaceOrderResponse> {
  try {
    return await requestJson<PlaceOrderResponse>(
      token, "/customer/orders/place",
      { method: "POST", body: JSON.stringify(input) },
      PLACE_ORDER_TIMEOUT_MS
    );
  } catch (error) {
    // The server may have committed orders but lost its response, or a
    // notification after commit may have failed. Never repeat a potentially
    // successful POST without first inspecting the authoritative order list.
    if (error instanceof OrderApiError &&
      (error.httpStatus === null || error.httpStatus >= 500)) {
      try {
        const current = await listCustomerOrders(token);
        const matching = current.orders.filter(
          order => order.checkoutSessionId === input.checkoutSessionId
        );
        if (matching.length > 0) {
          return { orders: matching, reused: true };
        }
      } catch {
        // Cannot prove the checkout completed. Preserve original failure.
      }
    }
    throw error;
  }
}

export function listCustomerOrders(
  token: string
): Promise<OrderListResponse> {
  return requestJson(token, "/customer/orders", { method: "GET" });
}

export function getCustomerOrder(
  token: string,
  orderId: string
): Promise<OrderRecord> {
  return requestJson(
    token,
    "/customer/orders/" + encodeURIComponent(orderId),
    { method: "GET" }
  );
}

export function cancelCustomerOrder(
  token: string,
  orderId: string,
  input: CancelOrderInput
): Promise<OrderRecord> {
  return requestJson(
    token,
    "/customer/orders/" + encodeURIComponent(orderId) + "/cancel",
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function listMerchantOrders(
  token: string,
  storeId: string
): Promise<OrderListResponse> {
  return requestJson(
    token,
    "/seller/stores/" + encodeURIComponent(storeId) + "/orders",
    { method: "GET" }
  );
}

export function getMerchantOrder(
  token: string,
  storeId: string,
  orderId: string
): Promise<OrderRecord> {
  return requestJson(
    token,
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/orders/" +
      encodeURIComponent(orderId),
    { method: "GET" }
  );
}

export function merchantOrderAction(
  token: string,
  storeId: string,
  orderId: string,
  input: MerchantOrderActionInput
): Promise<OrderRecord> {
  return requestJson(
    token,
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/orders/" +
      encodeURIComponent(orderId) +
      "/action",
    { method: "POST", body: JSON.stringify(input) }
  );
}
