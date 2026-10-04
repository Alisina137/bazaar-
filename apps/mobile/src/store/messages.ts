import type {
  StoreErrorCode,
  StoreStatus,
  StoreTheme
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";

export function storeErrorKey(code: StoreErrorCode): TranslationKey {
  const keys: Record<StoreErrorCode, TranslationKey> = {
    invalid_request: "store.error.invalidRequest",
    invalid_session: "store.error.invalidSession",
    account_unavailable: "store.error.accountUnavailable",
    forbidden: "store.error.forbidden",
    rate_limited: "store.error.rateLimited",
    store_not_found: "store.error.storeNotFound",
    handle_in_use: "store.error.handleInUse",
    store_suspended: "store.error.storeSuspended",
    store_not_ready: "store.error.storeNotReady",
    subscription_unavailable: "store.error.subscriptionUnavailable",
    service_unavailable: "store.error.serviceUnavailable"
  };

  return keys[code];
}

export function storeStatusKey(status: StoreStatus): TranslationKey {
  const keys: Record<StoreStatus, TranslationKey> = {
    draft: "seller.status.draft",
    published: "seller.status.published",
    suspended: "seller.status.suspended"
  };

  return keys[status];
}

export function storeThemeKey(theme: StoreTheme): TranslationKey {
  const keys: Record<StoreTheme, TranslationKey> = {
    minimal: "seller.theme.minimal",
    modern: "seller.theme.modern",
    fashion: "seller.theme.fashion",
    electronics: "seller.theme.electronics",
    food: "seller.theme.food"
  };

  return keys[theme];
}
