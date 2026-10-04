export const supportedLocales = ["fa-AF", "ps-AF", "en"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];
