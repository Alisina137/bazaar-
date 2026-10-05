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
  constructor(public readonly code: CartPricingErrorCode) {
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

      try {
        const payload =
          (await response.json()) as Partial<CartPricingErrorResponse>;
        if (payload.error?.code) {
          code = payload.error.code;
        }
      } catch {
        // Preserve the safe generic error.
      }

      throw new CartPricingApiError(code);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof CartPricingApiError) {
      throw error;
    }

    throw new CartPricingApiError("service_unavailable");
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
