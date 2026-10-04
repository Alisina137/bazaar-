import { describe, expect, it } from "vitest";

import { darkColors, lightColors, sizes, spacing, themes } from "./index.js";

describe("design tokens", () => {
  it("keeps interactive controls at an accessible touch size", () => {
    expect(sizes.touchTarget).toBeGreaterThanOrEqual(44);
    expect(sizes.controlHeight).toBeGreaterThanOrEqual(sizes.touchTarget);
  });

  it("keeps spacing values ordered from smallest to largest", () => {
    const ordered = [
      spacing.none,
      spacing.xxs,
      spacing.xs,
      spacing.sm,
      spacing.md,
      spacing.lg,
      spacing.xl,
      spacing["2xl"],
      spacing["3xl"],
      spacing["4xl"],
      spacing["5xl"],
      spacing["6xl"]
    ];

    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
  });

  it("exposes matching semantic color contracts for light and dark themes", () => {
    expect(Object.keys(lightColors).sort()).toEqual(Object.keys(darkColors).sort());
    expect(themes.light.colors.background).not.toBe(themes.light.colors.text);
    expect(themes.dark.colors.background).not.toBe(themes.dark.colors.text);
  });
});
