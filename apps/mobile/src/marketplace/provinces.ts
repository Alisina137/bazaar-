import AsyncStorage from "@react-native-async-storage/async-storage";

export const AFGHAN_PROVINCES = [
  ["Badakhshan", "بدخشان", "بدخشان"], ["Badghis", "بادغیس", "بادغیس"],
  ["Baghlan", "بغلان", "بغلان"], ["Balkh", "بلخ", "بلخ"],
  ["Bamyan", "بامیان", "بامیان"], ["Daykundi", "دایکندی", "دایکنډي"],
  ["Farah", "فراه", "فراه"], ["Faryab", "فاریاب", "فاریاب"],
  ["Ghazni", "غزنی", "غزني"], ["Ghor", "غور", "غور"],
  ["Helmand", "هلمند", "هلمند"], ["Herat", "هرات", "هرات"],
  ["Jowzjan", "جوزجان", "جوزجان"], ["Kabul", "کابل", "کابل"],
  ["Kandahar", "قندهار", "کندهار"], ["Kapisa", "کاپیسا", "کاپیسا"],
  ["Khost", "خوست", "خوست"], ["Kunar", "کنر", "کونړ"],
  ["Kunduz", "کندز", "کندز"], ["Laghman", "لغمان", "لغمان"],
  ["Logar", "لوگر", "لوګر"], ["Nangarhar", "ننگرهار", "ننګرهار"],
  ["Nimroz", "نیمروز", "نیمروز"], ["Nuristan", "نورستان", "نورستان"],
  ["Paktia", "پکتیا", "پکتیا"], ["Paktika", "پکتیکا", "پکتیکا"],
  ["Panjshir", "پنجشیر", "پنجشېر"], ["Parwan", "پروان", "پروان"],
  ["Samangan", "سمنگان", "سمنګان"], ["Sar-e Pol", "سرپل", "سرپل"],
  ["Takhar", "تخار", "تخار"], ["Urozgan", "ارزگان", "ارزګان"],
  ["Wardak", "میدان وردک", "میدان وردګ"], ["Zabul", "زابل", "زابل"]
] as const;

export type ProvinceName = (typeof AFGHAN_PROVINCES)[number][0];
const STORAGE_KEY = "bazaarlink.marketplace.province.v1";

export function provinceName(value: ProvinceName, locale: "en" | "fa-AF" | "ps-AF"): string {
  const item = AFGHAN_PROVINCES.find((entry) => entry[0] === value);
  return item ? item[locale === "en" ? 0 : locale === "fa-AF" ? 1 : 2] : value;
}

export function isProvinceName(value: unknown): value is ProvinceName {
  return typeof value === "string" && AFGHAN_PROVINCES.some((entry) => entry[0] === value);
}

/** No geolocation is inferred. A province is applied only after user selection. */
export async function getDiscoveryProvince(): Promise<ProvinceName | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return isProvinceName(raw) ? raw : null;
  } catch {
    return null;
  }
}

export async function setDiscoveryProvince(province: ProvinceName | null): Promise<void> {
  try {
    if (province) await AsyncStorage.setItem(STORAGE_KEY, province);
    else await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Allow browsing even when local storage is blocked.
  }
}
