import type { SupportedLocale } from "./core.js";

function getNumberFormatter(locale: SupportedLocale) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2
  });
}

export function formatNumber(
  value: number,
  locale: SupportedLocale
): string {
  return getNumberFormatter(locale).format(value);
}

export function formatAfn(
  value: number,
  locale: SupportedLocale
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "AFN",
    currencyDisplay: "symbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}
