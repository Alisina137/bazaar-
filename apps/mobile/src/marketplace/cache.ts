import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  MarketplaceBrowseResponse,
  MarketplaceHomeResponse,
  MarketplaceProductDetailResponse,
  MarketplaceStorePageResponse,
  MarketplaceStoreDirectoryResponse
} from "@bazaarlink/contracts";

const PREFIX = "bazaarlink.marketplace.v9.";
const RECENT_KEY = PREFIX + "recent-products";
const MAX_RECENT = 12;

// Serialize local writes to prevent a delayed product-view write from restoring
// items after Clear recent views, and to avoid losing simultaneous visits.
let recentWriteQueue: Promise<void> = Promise.resolve();
function queueRecentWrite(write: () => Promise<void>): Promise<void> {
  const next = recentWriteQueue.then(write);
  recentWriteQueue = next.catch(() => {});
  return next;
}
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

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

    const ageMs = Date.now() - parsed.savedAt;
    if (
      !Number.isFinite(parsed.savedAt) ||
      parsed.savedAt <= 0 ||
      ageMs < -MAX_CLOCK_SKEW_MS ||
      ageMs > MAX_STALE_MS ||
      (!allowStale && ageMs > CACHE_TTL_MS)
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

export function clearRecentProductIds(): Promise<void> {
  return queueRecentWrite(() => AsyncStorage.removeItem(RECENT_KEY));
}

export function rememberProduct(productId: string): Promise<void> {
  return queueRecentWrite(async () => {
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
  });
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
  minRating?: number | undefined;
  verifiedStore?: boolean | undefined;
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

export function storeDirectoryCacheKey(query?: string, offset = 0): string {
  return "store-directory:" + stableKey({ q: query?.trim().toLowerCase() || undefined, offset });
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


export function readStoreDirectoryCache(
  key: string,
  allowStale = false
): Promise<MarketplaceStoreDirectoryResponse | null> {
  return readCache<MarketplaceStoreDirectoryResponse>(key, allowStale);
}

export function writeStoreDirectoryCache(
  key: string,
  value: MarketplaceStoreDirectoryResponse
): Promise<void> {
  return writeCache(key, value);
}
