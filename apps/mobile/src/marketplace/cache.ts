import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  MarketplaceBrowseResponse,
  MarketplaceHomeResponse,
  MarketplaceProductDetailResponse,
  MarketplaceStorePageResponse
} from "@bazaarlink/contracts";

const PREFIX = "bazaarlink.marketplace.";
const RECENT_KEY = PREFIX + "recent-products";
const MAX_RECENT = 12;
const CACHE_TTL_MS = 15 * 60 * 1000;

interface CacheEnvelope<T> {
  savedAt: number;
  value: T;
}

async function readCache<T>(
  key: string,
  allowStale = false
): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;

    if (
      !allowStale &&
      Date.now() - parsed.savedAt > CACHE_TTL_MS
    ) {
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    const envelope: CacheEnvelope<T> = {
      savedAt: Date.now(),
      value
    };

    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch {
    // Cache failures must never block shopping.
  }
}

function stableKey(
  input: Record<string, string | number | boolean | undefined>
): string {
  return Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + "=" + String(value))
    .join("&");
}

export async function getRecentProductIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === "string")
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export async function rememberProduct(productId: string): Promise<void> {
  const current = await getRecentProductIds();
  const next = [
    productId,
    ...current.filter((id) => id !== productId)
  ].slice(0, MAX_RECENT);

  try {
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Recent-view persistence is best effort.
  }
}

export function homeCacheKey(province?: string): string {
  return "home:" + (province?.trim().toLowerCase() || "all");
}

export function browseCacheKey(input: {
  q?: string | undefined;
  categoryId?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  province?: string | undefined;
  storeId?: string | undefined;
  brand?: string | undefined;
  inStock?: boolean | undefined;
  discount?: boolean | undefined;
  sort?: string | undefined;
  offset?: number | undefined;
  limit?: number | undefined;
}): string {
  return "browse:" + stableKey(input);
}

export function productCacheKey(productId: string): string {
  return "product:" + productId;
}

export function storeCacheKey(handle: string, offset: number): string {
  return "store:" + handle.toLowerCase() + ":" + offset;
}

export function readHomeCache(
  key: string,
  allowStale = false
): Promise<MarketplaceHomeResponse | null> {
  return readCache<MarketplaceHomeResponse>(key, allowStale);
}

export function writeHomeCache(
  key: string,
  value: MarketplaceHomeResponse
): Promise<void> {
  return writeCache(key, value);
}

export function readBrowseCache(
  key: string,
  allowStale = false
): Promise<MarketplaceBrowseResponse | null> {
  return readCache<MarketplaceBrowseResponse>(key, allowStale);
}

export function writeBrowseCache(
  key: string,
  value: MarketplaceBrowseResponse
): Promise<void> {
  return writeCache(key, value);
}

export function readProductCache(
  key: string,
  allowStale = false
): Promise<MarketplaceProductDetailResponse | null> {
  return readCache<MarketplaceProductDetailResponse>(key, allowStale);
}

export function writeProductCache(
  key: string,
  value: MarketplaceProductDetailResponse
): Promise<void> {
  return writeCache(key, value);
}

export function readStoreCache(
  key: string,
  allowStale = false
): Promise<MarketplaceStorePageResponse | null> {
  return readCache<MarketplaceStorePageResponse>(key, allowStale);
}

export function writeStoreCache(
  key: string,
  value: MarketplaceStorePageResponse
): Promise<void> {
  return writeCache(key, value);
}
