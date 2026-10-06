import { describe, expect, it } from "vitest";

import { isReviewEligibleOrderState } from "./eligibility.js";

describe("review eligibility", () => {
  it("allows only completed delivery or pickup purchases", () => {
    expect(isReviewEligibleOrderState("delivered")).toBe(true);
    expect(isReviewEligibleOrderState("picked_up")).toBe(true);
    expect(isReviewEligibleOrderState("pending_confirmation")).toBe(false);
    expect(isReviewEligibleOrderState("confirmed")).toBe(false);
    expect(isReviewEligibleOrderState("preparing")).toBe(false);
    expect(isReviewEligibleOrderState("ready")).toBe(false);
    expect(isReviewEligibleOrderState("out_for_delivery")).toBe(false);
    expect(isReviewEligibleOrderState("cancelled")).toBe(false);
    expect(isReviewEligibleOrderState("refunded")).toBe(false);
  });
});
