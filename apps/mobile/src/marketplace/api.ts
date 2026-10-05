import type {
  MarketplaceBrowseResponse,
  MarketplaceErrorCode,
  MarketplaceErrorResponse,
  MarketplaceHomeResponse,
  MarketplaceProductDetailResponse,
  MarketplaceSearchSuggestionsResponse,
  MarketplaceSort,
  MarketplaceStorePageResponse
} from "@bazaarlink/contracts";

const REQUEST_TIMEOUT_MS = 12_000;

function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
}

export class MarketplaceApiError extends Error {
  constructor(public readonly code: MarketplaceErrorCode) {
    super(code);
    this.name = "MarketplaceApiError";
  }
}

async function requestJson<T>(
  path: string,
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
        ...init.headers
      }
    });

    if (!response.ok) {
      let code: MarketplaceErrorCode = "service_unavailable";

      try {
        const payload = (await response.json()) as Partial<MarketplaceErrorResponse>;
        if (payload.error?.code) {
          code = payload.error.code;
        }
      } catch {
        // Keep the generic public error.
      }

      throw new MarketplaceApiError(code);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof MarketplaceApiError) {
      throw error;
    }

    throw new MarketplaceApiError("service_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

function queryString(values: Record<string, string | number | boolean | undefined>) {
  const entries = Object.entries(values).filter(
    ([, value]) => value !== undefined && String(value).length > 0
  );

  if (entries.length === 0) {
    return "";
  }

  return (
    "?" +
    entries
      .map(([key, value]) =>
        encodeURIComponent(key) + "=" + encodeURIComponent(String(value))
      )
      .join("&")
  );
}

export function marketplaceHome(input: {
  province?: string | undefined;
  recentProductIds?: string[] | undefined;
}): Promise<MarketplaceHomeResponse> {
  return requestJson<MarketplaceHomeResponse>(
    "/marketplace/home" +
      queryString({
        province: input.province,
        recentProductIds:
          input.recentProductIds && input.recentProductIds.length > 0
            ? input.recentProductIds.join(",")
            : undefined
      })
  );
}

export interface BrowseMarketplaceInput {
  q?: string | undefined;
  categoryId?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  province?: string | undefined;
  storeId?: string | undefined;
  brand?: string | undefined;
  inStock?: boolean | undefined;
  discount?: boolean | undefined;
  sort?: MarketplaceSort | undefined;
  offset?: number | undefined;
  limit?: number | undefined;
}

export function browseMarketplace(
  input: BrowseMarketplaceInput
): Promise<MarketplaceBrowseResponse> {
  return requestJson<MarketplaceBrowseResponse>(
    "/marketplace/products" +
      queryString({
        q: input.q,
        categoryId: input.categoryId,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        province: input.province,
        storeId: input.storeId,
        brand: input.brand,
        inStock: input.inStock,
        discount: input.discount,
        sort: input.sort,
        offset: input.offset ?? 0,
        limit: input.limit ?? 20
      })
  );
}

export function searchSuggestions(
  query: string
): Promise<MarketplaceSearchSuggestionsResponse> {
  return requestJson<MarketplaceSearchSuggestionsResponse>(
    "/marketplace/search/suggestions" +
      queryString({ q: query })
  );
}

export function marketplaceProduct(
  productId: string
): Promise<MarketplaceProductDetailResponse> {
  return requestJson<MarketplaceProductDetailResponse>(
    "/marketplace/products/" + encodeURIComponent(productId)
  );
}

export function recordMarketplaceView(productId: string): Promise<void> {
  return requestJson<void>(
    "/marketplace/products/" + encodeURIComponent(productId) + "/view",
    { method: "POST" }
  );
}

export function marketplaceStore(
  handle: string,
  offset = 0,
  limit = 20
): Promise<MarketplaceStorePageResponse> {
  return requestJson<MarketplaceStorePageResponse>(
    "/marketplace/stores/" +
      encodeURIComponent(handle) +
      queryString({ offset, limit })
  );
}
