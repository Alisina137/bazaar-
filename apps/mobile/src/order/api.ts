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

function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
}

export class OrderApiError extends Error {
  constructor(public readonly code: OrderErrorCode) {
    super(code);
    this.name = "OrderApiError";
  }
}

async function requestJson<T>(
  token: string,
  path: string,
  init: RequestInit
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
      let code: OrderErrorCode = "service_unavailable";
      try {
        const payload = (await response.json()) as Partial<OrderErrorResponse>;
        if (payload.error?.code) code = payload.error.code;
      } catch {
        // Keep the safe generic code.
      }
      throw new OrderApiError(code);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof OrderApiError) throw error;
    throw new OrderApiError("service_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

export function placeOrder(
  token: string,
  input: PlaceOrderInput
): Promise<PlaceOrderResponse> {
  return requestJson(token, "/customer/orders/place", {
    method: "POST",
    body: JSON.stringify(input)
  });
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
