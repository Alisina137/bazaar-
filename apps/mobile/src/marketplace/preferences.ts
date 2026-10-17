import AsyncStorage from "@react-native-async-storage/async-storage";

export const MAX_FAVORITE_CATEGORIES = 5;
const FAVORITES_KEY = "bazaarlink.marketplace.favorite-categories.v1";

export function normalizeFavoriteCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string =>
    typeof id === "string" && id.trim().length > 0 &&
    id.length <= 128 && id === id.trim()
  ))].slice(0, MAX_FAVORITE_CATEGORIES);
}

export async function getFavoriteCategories(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    return raw ? normalizeFavoriteCategories(JSON.parse(raw) as unknown) : [];
  } catch {
    return [];
  }
}

export async function setFavoriteCategories(ids: string[]): Promise<void> {
  const clean = normalizeFavoriteCategories(ids);
  try {
    if (clean.length) await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(clean));
    else await AsyncStorage.removeItem(FAVORITES_KEY);
  } catch {
    // Preferences stay active in this session even if persistence fails.
  }
}
