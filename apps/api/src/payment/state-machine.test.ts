import { describe, expect, it } from "vitest";

import {
  assertPaymentStateTransition,
  canTransitionPaymentState,
  isTerminalPaymentState
} from "./state-machine.js";

describe("payment state machine", () => {
  it("supports the authoritative payment lifecycle", () => {
    expect(canTransitionPaymentState("created", "pending")).toBe(true);
    expect(canTransitionPaymentState("pending", "paid")).toBe(true);
    expect(canTransitionPaymentState("paid", "refund_pending")).toBe(true);
    expect(
      canTransitionPaymentState("refund_pending", "partially_refunded")
    ).toBe(true);
    expect(
      canTransitionPaymentState("partially_refunded", "refund_pending")
    ).toBe(true);
    expect(canTransitionPaymentState("refund_pending", "refunded")).toBe(
      true
    );
  });

  it("does not allow a client-style success jump or terminal rewrites", () => {
    expect(canTransitionPaymentState("created", "paid")).toBe(false);
    expect(canTransitionPaymentState("failed", "paid")).toBe(false);
    expect(canTransitionPaymentState("cancelled", "pending")).toBe(false);
    expect(canTransitionPaymentState("refunded", "paid")).toBe(false);
  });

  it("permits refund failure recovery back to paid", () => {
    expect(canTransitionPaymentState("refund_pending", "paid")).toBe(true);
  });

  it("throws on invalid transitions and marks terminal states", () => {
    expect(() => assertPaymentStateTransition("created", "paid")).toThrow(
      "invalid_payment_state_transition:created->paid"
    );
    expect(isTerminalPaymentState("failed")).toBe(true);
    expect(isTerminalPaymentState("paid")).toBe(false);
  });
});
