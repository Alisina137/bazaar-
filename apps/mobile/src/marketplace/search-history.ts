import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "bazaarlink.marketplace.search-history.v1";
export const MAX_SEARCH_HISTORY = 10;
export const MAX_SEARCH_LENGTH = 100;

// Serialize writes so Clear history cannot be undone by an older queued search.
let writeQueue: Promise<void> = Promise.resolve();

function enqueue(write: () => Promise<void>): Promise<void> {
  const next = writeQueue.then(write);
  writeQueue = next.catch(() => undefined);
  return next;
}

export function normalizeSearchTerm(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_SEARCH_LENGTH);
}

export function parseSearchHistory(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of raw) {
    const term = normalizeSearchTerm(entry);
    const normalized = term.toLocaleLowerCase();
    if (term.length < 2 || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(term);
    if (result.length === MAX_SEARCH_HISTORY) break;
  }
  return result;
}

async function readPersisted(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return parseSearchHistory(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

/** Browsing history is local to this device, not attached to a BazaarLink account. */
export async function getRecentSearches(): Promise<string[]> {
  await writeQueue;
  try {
    return await readPersisted();
  } catch {
    return [];
  }
}

export function rememberSearch(value: string): Promise<string[]> {
  const term = normalizeSearchTerm(value);
  if (term.length < 2) return getRecentSearches();
  let nextHistory: string[] = [];
  return enqueue(async () => {
    const previous = await readPersisted();
    nextHistory = parseSearchHistory([
      term,
      ...previous.filter(item => item.toLocaleLowerCase() !== term.toLocaleLowerCase())
    ]);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  }).then(() => nextHistory);
}

export function removeRecentSearch(value: string): Promise<string[]> {
  const normalized = normalizeSearchTerm(value).toLocaleLowerCase();
  let nextHistory: string[] = [];
  return enqueue(async () => {
    const previous = await readPersisted();
    nextHistory = previous.filter(item => item.toLocaleLowerCase() !== normalized);
    if (nextHistory.length) {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    } else {
      await AsyncStorage.removeItem(HISTORY_KEY);
    }
  }).then(() => nextHistory);
}

export function clearRecentSearches(): Promise<void> {
  return enqueue(() => AsyncStorage.removeItem(HISTORY_KEY));
}
