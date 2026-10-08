import type {
  CatalogErrorCode,
  CategoryStatus,
  ProductStatus
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";

export function catalogErrorKey(code: CatalogErrorCode): TranslationKey {
  const keys: Record<CatalogErrorCode, TranslationKey> = {
    invalid_request: "catalog.error.invalidRequest",
    invalid_session: "catalog.error.invalidSession",
    account_unavailable: "catalog.error.accountUnavailable",
    forbidden: "catalog.error.forbidden",
    rate_limited: "catalog.error.rateLimited",
    store_not_found: "catalog.error.storeNotFound",
    category_not_found: "catalog.error.categoryNotFound",
    category_limit_reached: "catalog.error.categoryLimitReached",
    category_in_use: "catalog.error.categoryInUse",
    product_not_found: "catalog.error.productNotFound",
    product_limit_reached: "catalog.error.productLimitReached",
    product_archived: "catalog.error.productArchived",
    product_plan_restricted: "catalog.error.productPlanRestricted",
    variant_not_found: "catalog.error.variantNotFound",
    image_not_found: "catalog.error.imageNotFound",
    inventory_target_invalid: "catalog.error.inventoryTargetInvalid",
    inventory_would_be_negative: "catalog.error.inventoryWouldBeNegative",
    subscription_unavailable: "catalog.error.subscriptionUnavailable",
  feature_not_available: "growth.error.featureNotAvailable",
    service_unavailable: "catalog.error.serviceUnavailable"
  };

  return keys[code];
}

export function productStatusKey(status: ProductStatus): TranslationKey {
  const keys: Record<ProductStatus, TranslationKey> = {
    draft: "catalog.status.draft",
    active: "catalog.status.active",
    out_of_stock: "catalog.status.outOfStock",
    archived: "catalog.status.archived",
    plan_restricted: "catalog.status.planRestricted"
  };

  return keys[status];
}

export function categoryStatusKey(status: CategoryStatus): TranslationKey {
  return status === "active"
    ? "catalog.category.active"
    : "catalog.category.archived";
}
