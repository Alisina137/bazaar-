import { enMessages, type TranslationKey } from "./locales/en.js";
import { faAfMessages } from "./locales/fa-AF.js";
import { psAfMessages } from "./locales/ps-AF.js";

export const supportedLocales = ["fa-AF", "ps-AF", "en"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];
export type TextDirection = "rtl" | "ltr";

export const defaultLocale: SupportedLocale = "fa-AF";

export const localeMetadata: Record<
  SupportedLocale,
  {
    direction: TextDirection;
    languageLabel: string;
    languageTag: string;
  }
> = {
  "fa-AF": {
    direction: "rtl",
    languageLabel: "دری",
    languageTag: "fa-AF"
  },
  "ps-AF": {
    direction: "rtl",
    languageLabel: "پښتو",
    languageTag: "ps-AF"
  },
  en: {
    direction: "ltr",
    languageLabel: "English",
    languageTag: "en"
  }
};

const messages = {
  "fa-AF": faAfMessages,
  "ps-AF": psAfMessages,
  en: enMessages
} satisfies Record<SupportedLocale, Record<TranslationKey, string>>;

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return Boolean(value && supportedLocales.includes(value as SupportedLocale));
}

export function normalizeLocale(value: string | null | undefined): SupportedLocale {
  if (!value) {
    return defaultLocale;
  }

  if (isSupportedLocale(value)) {
    return value;
  }

  const normalized = value.toLowerCase();

  if (normalized === "fa" || normalized.startsWith("fa-")) {
    return "fa-AF";
  }

  if (normalized === "ps" || normalized.startsWith("ps-")) {
    return "ps-AF";
  }

  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }

  return defaultLocale;
}

export function getDirection(locale: SupportedLocale): TextDirection {
  return localeMetadata[locale].direction;
}

export function translate(locale: SupportedLocale, key: TranslationKey): string {
  return messages[locale][key];
}
