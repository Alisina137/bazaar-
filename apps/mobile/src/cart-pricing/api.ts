import type {
  AddCartItemInput,
  ApplyCartCouponInput,
  CartPricingErrorCode,
  CartPricingErrorResponse,
  CartResponse,
  CheckoutQuoteInput,
  CheckoutQuoteResponse,
  CreateCustomerAddressInput,
  CustomerAddressListResponse,
  CustomerAddressRecord,
  UpdateCartItemInput,
  UpdateCustomerAddressInput
} from "@bazaarlink/contracts";

const REQUEST_TIMEOUT_MS = 12_000;

function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
}

export class CartPricingApiError extends Error {
  constructor(
    public readonly code: CartPricingErrorCode,
    public readonly httpStatus: number | null = null,
    public readonly transport: "network" | "timeout" | null = null,
    public readonly reference: string | null = null
  ) {
    super(code);
    this.name = "CartPricingApiError";
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
      let code: CartPricingErrorCode = "service_unavailable";
      let reference: string | null = null;

      try {
        const payload =
          (await response.json()) as Partial<CartPricingErrorResponse>;
        if (payload.error?.code) {
          code = payload.error.code;
        }
        const safeReference = payload.error?.reference;
        if (typeof safeReference === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(safeReference)) {
          reference = safeReference;
        }
      } catch {
        // Preserve the safe generic error.
      }

      throw new CartPricingApiError(code, response.status, null, reference);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof CartPricingApiError) {
      throw error;
    }

    throw new CartPricingApiError(
      "service_unavailable", null,
      controller.signal.aborted ? "timeout" : "network"
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function getCart(token: string): Promise<CartResponse> {
  return requestJson<CartResponse>(token, "/customer/cart", {
    method: "GET"
  });
}

export function addCartItem(
  token: string,
  input: AddCartItemInput
): Promise<CartResponse> {
  return requestJson<CartResponse>(token, "/customer/cart/items", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateCartItem(
  token: string,
  itemId: string,
  input: UpdateCartItemInput
): Promise<CartResponse> {
  return requestJson<CartResponse>(
    token,
    "/customer/cart/items/" + encodeURIComponent(itemId),
    {
      method: "PATCH",
      body: JSON.stringify(input)
    }
  );
}

export function removeCartItem(
  token: string,
  itemId: string
): Promise<CartResponse> {
  return requestJson<CartResponse>(
    token,
    "/customer/cart/items/" + encodeURIComponent(itemId),
    { method: "DELETE" }
  );
}

/**
 * DELETE may commit but its reply be lost on mobile / ngrok. Re-read the
 * authoritative server cart before claiming that the item is still there.
 * Never silently delete local data or replay the destructive request.
 */
export async function removeCartItemWithRecovery(
  token: string,
  itemId: string
): Promise<CartResponse> {
  try {
    return await removeCartItem(token, itemId);
  } catch (error) {
    try {
      const fresh = await getCart(token);
      if (!fresh.groups.some(group => group.items.some(item => item.id === itemId))) {
        return fresh;
      }
    } catch {
      // We cannot confirm a deletion while the API is unreachable.
    }
    throw error;
  }
}

export function applyCartCoupon(
  token: string,
  input: ApplyCartCouponInput
): Promise<CartResponse> {
  return requestJson<CartResponse>(
    token,
    "/customer/cart/coupons/" + encodeURIComponent(input.storeId),
    {
      method: "PUT",
      body: JSON.stringify({ code: input.code })
    }
  );
}

export function removeCartCoupon(
  token: string,
  storeId: string
): Promise<CartResponse> {
  return requestJson<CartResponse>(
    token,
    "/customer/cart/coupons/" + encodeURIComponent(storeId),
    { method: "DELETE" }
  );
}

export function listCustomerAddresses(
  token: string
): Promise<CustomerAddressListResponse> {
  return requestJson<CustomerAddressListResponse>(
    token,
    "/customer/addresses",
    { method: "GET" }
  );
}

export function createCustomerAddress(
  token: string,
  input: CreateCustomerAddressInput
): Promise<CustomerAddressRecord> {
  return requestJson<CustomerAddressRecord>(
    token,
    "/customer/addresses",
    {
      method: "POST",
      body: JSON.stringify(input)
    }
  );
}

export function updateCustomerAddress(
  token: string,
  addressId: string,
  input: UpdateCustomerAddressInput
): Promise<CustomerAddressRecord> {
  return requestJson<CustomerAddressRecord>(
    token,
    "/customer/addresses/" + encodeURIComponent(addressId),
    {
      method: "PATCH",
      body: JSON.stringify(input)
    }
  );
}

export function deleteCustomerAddress(
  token: string,
  addressId: string
): Promise<void> {
  return requestJson<void>(
    token,
    "/customer/addresses/" + encodeURIComponent(addressId),
    { method: "DELETE" }
  );
}

export function quoteCheckout(
  token: string,
  input: CheckoutQuoteInput
): Promise<CheckoutQuoteResponse> {
  return requestJson<CheckoutQuoteResponse>(
    token,
    "/customer/checkout/quote",
    {
      method: "POST",
      body: JSON.stringify(input)
    }
  );
}

export function getCheckoutQuote(
  token: string,
  sessionId: string
): Promise<CheckoutQuoteResponse> {
  return requestJson<CheckoutQuoteResponse>(
    token,
    "/customer/checkout/" + encodeURIComponent(sessionId),
    { method: "GET" }
  );
}
