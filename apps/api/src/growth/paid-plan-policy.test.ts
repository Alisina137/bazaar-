import { describe, expect, it } from "vitest";
import { unpaidUpgradeBlocked } from "./paid-plan-policy.js";

describe("Paid subscription release boundary", () => {
  it("denies every unverified merchant upgrade in production", () => {
    expect(unpaidUpgradeBlocked("starter", "pro", "production")).toBe(true);
    expect(unpaidUpgradeBlocked("starter", "business", "production")).toBe(true);
    expect(unpaidUpgradeBlocked("pro", "business", "production")).toBe(true);
  });
  it("preserves merchant ability to downgrade", () => {
    expect(unpaidUpgradeBlocked("business", "pro", "production")).toBe(false);
    expect(unpaidUpgradeBlocked("pro", "starter", "production")).toBe(false);
    expect(unpaidUpgradeBlocked("starter", "starter", "production")).toBe(false);
  });
  it("allows integration fixtures outside production", () => {
    expect(unpaidUpgradeBlocked("starter", "pro", "test")).toBe(false);
  });
});
