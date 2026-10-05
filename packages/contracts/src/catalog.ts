export const categoryStatuses = ["active", "archived"] as const;
export type CategoryStatus = (typeof categoryStatuses)[number];

export const productStatuses = [
  "draft",
  "active",
  "out_of_stock",
  "archived",
  "plan_restricted"
] as const;
export type ProductStatus = (typeof productStatuses)[number];

export interface CatalogCategoryRecord {
  id: string;
  storeId: string;
  parentId: string | null;
  name: string;
  imageUrl: string | null;
  icon: string | null;
  sortOrder: number;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  parentId?: string | null | undefined;
  imageUrl?: string | null | undefined;
  icon?: string | null | undefined;
  sortOrder?: number | undefined;
}

export interface UpdateCategoryInput {
  name?: string | undefined;
  parentId?: string | null | undefined;
  imageUrl?: string | null | undefined;
  icon?: string | null | undefined;
  sortOrder?: number | undefined;
}

export interface ProductImageRecord {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CreateProductImageInput {
  url: string;
  altText?: string | null | undefined;
  sortOrder?: number | undefined;
}

export interface ProductVariantRecord {
  id: string;
  productId: string;
  title: string;
  optionValues: Record<string, string>;
  sku: string | null;
  priceOverride: number | null;
  imageUrl: string | null;
  available: boolean;
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductVariantInput {
  title: string;
  optionValues: Record<string, string>;
  sku?: string | null | undefined;
  priceOverride?: number | null | undefined;
  imageUrl?: string | null | undefined;
  available?: boolean | undefined;
  availableQuantity: number;
  lowStockThreshold?: number | undefined;
}

export interface UpdateProductVariantInput {
  title?: string | undefined;
  optionValues?: Record<string, string> | undefined;
  sku?: string | null | undefined;
  priceOverride?: number | null | undefined;
  imageUrl?: string | null | undefined;
  available?: boolean | undefined;
  lowStockThreshold?: number | undefined;
}

export interface CatalogProductRecord {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  brand: string | null;
  barcode: string | null;
  weightGrams: number | null;
  dimensions: string | null;
  tags: string[];
  shippingClass: string | null;
  deliveryRestrictions: string | null;
  status: ProductStatus;
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: ProductImageRecord[];
  variants: ProductVariantRecord[];
}

export interface CreateProductInput {
  name: string;
  categoryId: string;
  price: number;
  availableQuantity: number;
  lowStockThreshold?: number | undefined;
  description?: string | null | undefined;
  sku?: string | null | undefined;
  brand?: string | null | undefined;
  compareAtPrice?: number | null | undefined;
  barcode?: string | null | undefined;
  weightGrams?: number | null | undefined;
  dimensions?: string | null | undefined;
  tags?: string[] | undefined;
  shippingClass?: string | null | undefined;
  deliveryRestrictions?: string | null | undefined;
  images?: CreateProductImageInput[] | undefined;
  variants?: CreateProductVariantInput[] | undefined;
}

export interface UpdateProductInput {
  name?: string | undefined;
  categoryId?: string | undefined;
  price?: number | undefined;
  lowStockThreshold?: number | undefined;
  description?: string | null | undefined;
  sku?: string | null | undefined;
  brand?: string | null | undefined;
  compareAtPrice?: number | null | undefined;
  barcode?: string | null | undefined;
  weightGrams?: number | null | undefined;
  dimensions?: string | null | undefined;
  tags?: string[] | undefined;
  shippingClass?: string | null | undefined;
  deliveryRestrictions?: string | null | undefined;
}

export interface InventoryAdjustmentInput {
  variantId?: string | null | undefined;
  delta: number;
  reason?: string | null | undefined;
}

export interface InventoryMovementRecord {
  id: string;
  storeId: string;
  productId: string;
  variantId: string | null;
  delta: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  createdAt: string;
}

export interface CatalogUsage {
  plan: "starter" | "pro" | "business";
  productLimit: number;
  productCount: number;
  categoryLimit: number | null;
  activeCategoryCount: number;
}

export interface CategoryListResponse {
  categories: CatalogCategoryRecord[];
  usage: CatalogUsage;
}

export interface ProductListResponse {
  products: CatalogProductRecord[];
  usage: CatalogUsage;
  pageInfo: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface InventoryHistoryResponse {
  movements: InventoryMovementRecord[];
}

export interface PublicCatalogCategory {
  id: string;
  parentId: string | null;
  name: string;
  imageUrl: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface PublicCatalogProduct {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  brand: string | null;
  status: "active" | "out_of_stock";
  images: Array<Pick<ProductImageRecord, "id" | "url" | "altText" | "sortOrder">>;
  variants: Array<
    Pick<
      ProductVariantRecord,
      "id" | "title" | "optionValues" | "priceOverride" | "imageUrl" | "available"
    >
  >;
}

export interface PublicStoreCatalogResponse {
  categories: PublicCatalogCategory[];
  products: PublicCatalogProduct[];
}

export const catalogErrorCodes = [
  "invalid_request",
  "invalid_session",
  "account_unavailable",
  "forbidden",
  "rate_limited",
  "store_not_found",
  "category_not_found",
  "category_limit_reached",
  "category_in_use",
  "product_not_found",
  "product_limit_reached",
  "product_archived",
  "product_plan_restricted",
  "variant_not_found",
  "image_not_found",
  "inventory_target_invalid",
  "inventory_would_be_negative",
  "subscription_unavailable",
  "service_unavailable"
] as const;

export type CatalogErrorCode = (typeof catalogErrorCodes)[number];

export interface CatalogErrorResponse {
  error: {
    code: CatalogErrorCode;
  };
}
