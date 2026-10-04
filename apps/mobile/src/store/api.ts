import type {
  CreateStoreInput,
  StoreErrorCode,
  StoreErrorResponse,
  StoreListResponse,
  StorePlansResponse,
  StoreRecord,
  UpdateStoreInput
} from "@bazaarlink/contracts";

const REQUEST_TIMEOUT_MS = 10_000;

function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
}

export class StoreApiError extends Error {
  constructor(public readonly code: StoreErrorCode) {
    super(code);
    this.name = "StoreApiError";
  }
}

async function requestJson<T>(
  path: string,
  token: string,
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
      let code: StoreErrorCode = "service_unavailable";

      try {
        const payload = (await response.json()) as Partial<StoreErrorResponse>;
        if (payload.error?.code) {
          code = payload.error.code;
        }
      } catch {
        // Keep the safe generic code.
      }

      throw new StoreApiError(code);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof StoreApiError) {
      throw error;
    }

    throw new StoreApiError("service_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

export function listStores(token: string): Promise<StoreListResponse> {
  return requestJson<StoreListResponse>("/seller/stores", token, {
    method: "GET"
  });
}

export function getPlans(token: string): Promise<StorePlansResponse> {
  return requestJson<StorePlansResponse>("/seller/plans", token, {
    method: "GET"
  });
}

export function createStore(
  token: string,
  input: CreateStoreInput
): Promise<StoreRecord> {
  return requestJson<StoreRecord>("/seller/stores", token, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateStore(
  token: string,
  storeId: string,
  input: UpdateStoreInput
): Promise<StoreRecord> {
  return requestJson<StoreRecord>(
    "/seller/stores/" + storeId,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input)
    }
  );
}

export function publishStore(
  token: string,
  storeId: string
): Promise<StoreRecord> {
  return requestJson<StoreRecord>(
    "/seller/stores/" + storeId + "/publish",
    token,
    {
      method: "POST"
    }
  );
}
