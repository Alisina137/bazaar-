import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "bazaarlink.marketplace.compare.v1";
export const MAX_COMPARE_PRODUCTS = 4;

let writeQueue: Promise<void> = Promise.resolve();

function queueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

export async function getCompareProductIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string =>
      typeof id === "string" && id.length > 0
    ))].slice(0, MAX_COMPARE_PRODUCTS);
  } catch {
    return [];
  }
}

export function addCompareProduct(productId: string): Promise<boolean> {
  return queueWrite(async () => {
    const current = await getCompareProductIds();
    if (current.includes(productId)) return true;
    if (current.length >= MAX_COMPARE_PRODUCTS) return false;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...current, productId]));
    return true;
  });
}

export function removeCompareProduct(productId: string): Promise<void> {
  return queueWrite(async () => {
    const current = await getCompareProductIds();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current.filter(id => id !== productId)));
  });
}

export function clearCompareProducts(): Promise<void> {
  return queueWrite(() => AsyncStorage.removeItem(STORAGE_KEY));
}
