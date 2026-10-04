import { describe, expect, it } from "vitest";

import {
  defaultLocale,
  formatAfn,
  formatNumber,
  getDirection,
  localeMetadata,
  normalizeLocale,
  supportedLocales,
  translate
} from "./index";

describe("localization foundation", () => {
  it("supports Dari, Pashto, and English with Dari as the fallback", () => {
    expect(supportedLocales).toEqual(["fa-AF", "ps-AF", "en"]);
    expect(defaultLocale).toBe("fa-AF");
    expect(normalizeLocale("fa")).toBe("fa-AF");
    expect(normalizeLocale("ps-AF")).toBe("ps-AF");
    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale("de-DE")).toBe("fa-AF");
  });

  it("marks Dari and Pashto RTL while English remains LTR", () => {
    expect(getDirection("fa-AF")).toBe("rtl");
    expect(getDirection("ps-AF")).toBe("rtl");
    expect(getDirection("en")).toBe("ltr");
  });

  it("keeps every supported locale populated for representative UI keys", () => {
    for (const locale of supportedLocales) {
      expect(translate(locale, "nav.home").length).toBeGreaterThan(0);
      expect(translate(locale, "home.title").length).toBeGreaterThan(0);
      expect(translate(locale, "notFound.returnHome").length).toBeGreaterThan(0);
      expect(localeMetadata[locale].languageLabel.length).toBeGreaterThan(0);
    }
  });

  it("localizes numbers and AFN currency through Intl", () => {
    expect(formatNumber(123456, "fa-AF")).not.toBe(formatNumber(123456, "en"));
    expect(formatNumber(123456, "ps-AF")).not.toBe(formatNumber(123456, "en"));

    for (const locale of supportedLocales) {
      const formatted = formatAfn(1250, locale);
      expect(formatted.length).toBeGreaterThan(4);
      expect(formatted).not.toContain("NaN");
    }
  });
});
