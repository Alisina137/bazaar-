import type {
  CatalogCategoryRecord,
  CatalogErrorCode,
  CatalogErrorResponse,
  CatalogProductRecord,
  CategoryListResponse,
  CreateCategoryInput,
  CreateProductImageInput,
  CreateProductInput,
  CreateProductVariantInput,
  InventoryAdjustmentInput,
  InventoryHistoryResponse,
  InventoryLowStockResponse,
  ProductListResponse,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateProductVariantInput
} from "@bazaarlink/contracts";

const REQUEST_TIMEOUT_MS = 10_000;

function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
}

export class CatalogApiError extends Error {
  constructor(public readonly code: CatalogErrorCode) {
    super(code);
    this.name = "CatalogApiError";
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
      let code: CatalogErrorCode = "service_unavailable";

      try {
        const payload = (await response.json()) as Partial<CatalogErrorResponse>;
        if (payload.error?.code) {
          code = payload.error.code;
        }
      } catch {
        // Keep the safe generic code.
      }

      throw new CatalogApiError(code);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof CatalogApiError) {
      throw error;
    }

    throw new CatalogApiError("service_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

function sellerPath(storeId: string, suffix: string): string {
  return (
    "/seller/stores/" +
    encodeURIComponent(storeId) +
    suffix
  );
}

export function listCategories(
  token: string,
  storeId: string
): Promise<CategoryListResponse> {
  return requestJson<CategoryListResponse>(
    sellerPath(storeId, "/categories"),
    token,
    { method: "GET" }
  );
}

export function createCategory(
  token: string,
  storeId: string,
  input: CreateCategoryInput
): Promise<CatalogCategoryRecord> {
  return requestJson<CatalogCategoryRecord>(
    sellerPath(storeId, "/categories"),
    token,
    {
      method: "POST",
      body: JSON.stringify(input)
    }
  );
}

export function updateCategory(
  token: string,
  storeId: string,
  categoryId: string,
  input: UpdateCategoryInput
): Promise<CatalogCategoryRecord> {
  return requestJson<CatalogCategoryRecord>(
    sellerPath(
      storeId,
      "/categories/" + encodeURIComponent(categoryId)
    ),
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input)
    }
  );
}

export function categoryAction(
  token: string,
  storeId: string,
  categoryId: string,
  action: "archive" | "restore"
): Promise<CatalogCategoryRecord> {
  return requestJson<CatalogCategoryRecord>(
    sellerPath(
      storeId,
      "/categories/" +
        encodeURIComponent(categoryId) +
        "/" +
        action
    ),
    token,
    { method: "POST" }
  );
}

export function listProducts(
  token: string,
  storeId: string,
  offset = 0,
  limit = 20
): Promise<ProductListResponse> {
  return requestJson<ProductListResponse>(
    sellerPath(
      storeId,
      "/products?offset=" + offset + "&limit=" + limit
    ),
    token,
    { method: "GET" }
  );
}

export function getProduct(
  token: string,
  storeId: string,
  productId: string
): Promise<CatalogProductRecord> {
  return requestJson<CatalogProductRecord>(
    sellerPath(
      storeId,
      "/products/" + encodeURIComponent(productId)
    ),
    token,
    { method: "GET" }
  );
}

export function createProduct(
  token: string,
  storeId: string,
  input: CreateProductInput
): Promise<CatalogProductRecord> {
  return requestJson<CatalogProductRecord>(
    sellerPath(storeId, "/products"),
    token,
    {
      method: "POST",
      body: JSON.stringify(input)
    }
  );
}

export function updateProduct(
  token: string,
  storeId: string,
  productId: string,
  input: UpdateProductInput
): Promise<CatalogProductRecord> {
  return requestJson<CatalogProductRecord>(
    sellerPath(
      storeId,
      "/products/" + encodeURIComponent(productId)
    ),
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input)
    }
  );
}

export function productAction(
  token: string,
  storeId: string,
  productId: string,
  action: "archive" | "restore" | "publish"
): Promise<CatalogProductRecord> {
  return requestJson<CatalogProductRecord>(
    sellerPath(
      storeId,
      "/products/" +
        encodeURIComponent(productId) +
        "/" +
        action
    ),
    token,
    { method: "POST" }
  );
}

export function addImage(
  token: string,
  storeId: string,
  productId: string,
  input: CreateProductImageInput
): Promise<CatalogProductRecord> {
  return requestJson<CatalogProductRecord>(
    sellerPath(
      storeId,
      "/products/" + encodeURIComponent(productId) + "/images"
    ),
    token,
    {
      method: "POST",
      body: JSON.stringify(input)
    }
  );
}

export function deleteImage(
  token: string,
  storeId: string,
  productId: string,
  imageId: string
): Promise<CatalogProductRecord> {
  return requestJson<CatalogProductRecord>(
    sellerPath(
      storeId,
      "/products/" +
        encodeURIComponent(productId) +
        "/images/" +
        encodeURIComponent(imageId)
    ),
    token,
    { method: "DELETE" }
  );
}

export function addVariant(
  token: string,
  storeId: string,
  productId: string,
  input: CreateProductVariantInput
): Promise<CatalogProductRecord> {
  return requestJson<CatalogProductRecord>(
    sellerPath(
      storeId,
      "/products/" + encodeURIComponent(productId) + "/variants"
    ),
    token,
    {
      method: "POST",
      body: JSON.stringify(input)
    }
  );
}

export function updateVariant(
  token: string,
  storeId: string,
  productId: string,
  variantId: string,
  input: UpdateProductVariantInput
): Promise<CatalogProductRecord> {
  return requestJson<CatalogProductRecord>(
    sellerPath(
      storeId,
      "/products/" +
        encodeURIComponent(productId) +
        "/variants/" +
        encodeURIComponent(variantId)
    ),
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input)
    }
  );
}

export function deleteVariant(
  token: string,
  storeId: string,
  productId: string,
  variantId: string
): Promise<CatalogProductRecord> {
  return requestJson<CatalogProductRecord>(
    sellerPath(
      storeId,
      "/products/" +
        encodeURIComponent(productId) +
        "/variants/" +
        encodeURIComponent(variantId)
    ),
    token,
    { method: "DELETE" }
  );
}

export function adjustInventory(
  token: string,
  storeId: string,
  productId: string,
  input: InventoryAdjustmentInput
): Promise<CatalogProductRecord> {
  return requestJson<CatalogProductRecord>(
    sellerPath(
      storeId,
      "/products/" +
        encodeURIComponent(productId) +
        "/inventory/adjust"
    ),
    token,
    {
      method: "POST",
      body: JSON.stringify(input)
    }
  );
}

export function inventoryHistory(
  token: string,
  storeId: string,
  productId: string
): Promise<InventoryHistoryResponse> {
  return requestJson<InventoryHistoryResponse>(
    sellerPath(
      storeId,
      "/products/" +
        encodeURIComponent(productId) +
        "/inventory/history"
    ),
    token,
    { method: "GET" }
  );
}

export function lowStockInventory(
  token: string,
  storeId: string
): Promise<InventoryLowStockResponse> {
  return requestJson<InventoryLowStockResponse>(
    sellerPath(storeId, "/inventory/low-stock"),
    token,
    { method: "GET" }
  );
}
