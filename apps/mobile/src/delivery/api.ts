import type {
  CreateDeliveryCheckoutQuoteInput,
  CreateDeliveryDistanceRuleInput,
  CreateDeliverySpeedInput,
  CreateDeliveryZoneInput,
  DeliveryCheckoutQuoteResponse,
  DeliveryErrorCode,
  DeliveryErrorResponse,
  DeliveryOptionsResponse,
  StoreDeliveryConfigurationResponse,
  UpdateDeliveryDistanceRuleInput,
  UpdateDeliverySpeedInput,
  UpdateDeliveryZoneInput,
  UpdateStoreDeliverySettingsInput
} from "@bazaarlink/contracts";

const REQUEST_TIMEOUT_MS = 12_000;

function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
}

export class DeliveryApiError extends Error {
  constructor(public readonly code: DeliveryErrorCode) {
    super(code);
    this.name = "DeliveryApiError";
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
      let code: DeliveryErrorCode = "service_unavailable";
      try {
        const payload = (await response.json()) as Partial<DeliveryErrorResponse>;
        if (payload.error?.code) code = payload.error.code;
      } catch {
        // Keep safe generic code.
      }

      throw new DeliveryApiError(code);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DeliveryApiError) throw error;
    throw new DeliveryApiError("service_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

export function getDeliveryConfiguration(
  token: string,
  storeId: string
): Promise<StoreDeliveryConfigurationResponse> {
  return requestJson(
    token,
    "/seller/stores/" + encodeURIComponent(storeId) + "/delivery",
    { method: "GET" }
  );
}

export function updateDeliverySettings(
  token: string,
  storeId: string,
  input: UpdateStoreDeliverySettingsInput
): Promise<StoreDeliveryConfigurationResponse> {
  return requestJson(
    token,
    "/seller/stores/" + encodeURIComponent(storeId) + "/delivery/settings",
    { method: "PUT", body: JSON.stringify(input) }
  );
}

export function createDeliveryZone(
  token: string,
  storeId: string,
  input: CreateDeliveryZoneInput
): Promise<StoreDeliveryConfigurationResponse> {
  return requestJson(
    token,
    "/seller/stores/" + encodeURIComponent(storeId) + "/delivery/zones",
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function updateDeliveryZone(
  token: string,
  storeId: string,
  zoneId: string,
  input: UpdateDeliveryZoneInput
): Promise<StoreDeliveryConfigurationResponse> {
  return requestJson(
    token,
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/delivery/zones/" +
      encodeURIComponent(zoneId),
    { method: "PATCH", body: JSON.stringify(input) }
  );
}

export function deleteDeliveryZone(
  token: string,
  storeId: string,
  zoneId: string
): Promise<StoreDeliveryConfigurationResponse> {
  return requestJson(
    token,
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/delivery/zones/" +
      encodeURIComponent(zoneId),
    { method: "DELETE" }
  );
}

export function createDeliveryDistanceRule(
  token: string,
  storeId: string,
  input: CreateDeliveryDistanceRuleInput
): Promise<StoreDeliveryConfigurationResponse> {
  return requestJson(
    token,
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/delivery/distance-rules",
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function deleteDeliveryDistanceRule(
  token: string,
  storeId: string,
  ruleId: string
): Promise<StoreDeliveryConfigurationResponse> {
  return requestJson(
    token,
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/delivery/distance-rules/" +
      encodeURIComponent(ruleId),
    { method: "DELETE" }
  );
}

export function createDeliverySpeed(
  token: string,
  storeId: string,
  input: CreateDeliverySpeedInput
): Promise<StoreDeliveryConfigurationResponse> {
  return requestJson(
    token,
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/delivery/speeds",
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function updateDeliverySpeed(
  token: string,
  storeId: string,
  speedId: string,
  input: UpdateDeliverySpeedInput
): Promise<StoreDeliveryConfigurationResponse> {
  return requestJson(
    token,
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/delivery/speeds/" +
      encodeURIComponent(speedId),
    { method: "PATCH", body: JSON.stringify(input) }
  );
}

export function deleteDeliverySpeed(
  token: string,
  storeId: string,
  speedId: string
): Promise<StoreDeliveryConfigurationResponse> {
  return requestJson(
    token,
    "/seller/stores/" +
      encodeURIComponent(storeId) +
      "/delivery/speeds/" +
      encodeURIComponent(speedId),
    { method: "DELETE" }
  );
}

export function getDeliveryOptions(
  token: string,
  addressId: string
): Promise<DeliveryOptionsResponse> {
  return requestJson(token, "/customer/delivery/options", {
    method: "POST",
    body: JSON.stringify({ addressId })
  });
}

export function createDeliveryCheckoutQuote(
  token: string,
  input: CreateDeliveryCheckoutQuoteInput
): Promise<DeliveryCheckoutQuoteResponse> {
  return requestJson(token, "/customer/delivery/checkout-quote", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getDeliveryCheckoutQuote(
  token: string,
  sessionId: string
): Promise<DeliveryCheckoutQuoteResponse> {
  return requestJson(
    token,
    "/customer/delivery/checkout-quote/" + encodeURIComponent(sessionId),
    { method: "GET" }
  );
}
