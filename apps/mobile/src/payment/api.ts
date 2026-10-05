import type {
  CreatePaymentAttemptsInput,
  MerchantPaymentConfigurationResponse,
  PaymentCheckoutResponse,
  PaymentErrorCode,
  PaymentErrorResponse,
  PaymentOptionsResponse,
  PaymentAttemptRecord,
  RefundPaymentInput,
  RefundPaymentResponse,
  UpdateStorePaymentSettingsInput
} from "@bazaarlink/contracts";

const REQUEST_TIMEOUT_MS = 12_000;

function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
}

export class PaymentApiError extends Error {
  constructor(public readonly code: PaymentErrorCode) {
    super(code);
    this.name = "PaymentApiError";
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
      let code: PaymentErrorCode = "service_unavailable";
      try {
        const payload = (await response.json()) as Partial<PaymentErrorResponse>;
        if (payload.error?.code) code = payload.error.code;
      } catch {
        // Keep safe generic code.
      }
      throw new PaymentApiError(code);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof PaymentApiError) throw error;
    throw new PaymentApiError("service_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

export function getPaymentConfiguration(
  token: string,
  storeId: string
): Promise<MerchantPaymentConfigurationResponse> {
  return requestJson(
    token,
    "/seller/stores/" + encodeURIComponent(storeId) + "/payments",
    { method: "GET" }
  );
}

export function updatePaymentConfiguration(
  token: string,
  storeId: string,
  input: UpdateStorePaymentSettingsInput
): Promise<MerchantPaymentConfigurationResponse> {
  return requestJson(
    token,
    "/seller/stores/" + encodeURIComponent(storeId) + "/payments",
    { method: "PUT", body: JSON.stringify(input) }
  );
}

export function getPaymentOptions(
  token: string,
  checkoutSessionId: string
): Promise<PaymentOptionsResponse> {
  return requestJson(
    token,
    "/customer/payments/options/" +
      encodeURIComponent(checkoutSessionId),
    { method: "GET" }
  );
}

export function createPaymentAttempts(
  token: string,
  input: CreatePaymentAttemptsInput
): Promise<PaymentCheckoutResponse> {
  return requestJson(token, "/customer/payments/attempts", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getPaymentStatus(
  token: string,
  checkoutSessionId: string
): Promise<PaymentCheckoutResponse> {
  return requestJson(
    token,
    "/customer/payments/status/" +
      encodeURIComponent(checkoutSessionId),
    { method: "GET" }
  );
}

export function cancelPaymentAttempt(
  token: string,
  attemptId: string
): Promise<PaymentAttemptRecord> {
  return requestJson(
    token,
    "/customer/payments/" + encodeURIComponent(attemptId) + "/cancel",
    { method: "POST" }
  );
}

export function requestPaymentRefund(
  token: string,
  storeId: string,
  attemptId: string,
  input: RefundPaymentInput
): Promise<RefundPaymentResponse> {
  return requestJson(
    token,
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/payments/" +
      encodeURIComponent(attemptId) +
      "/refund",
    { method: "POST", body: JSON.stringify(input) }
  );
}
