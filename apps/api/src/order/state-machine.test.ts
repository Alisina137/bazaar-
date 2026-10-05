import { describe, expect, it } from "vitest";

import {
  customerCanCancel,
  merchantOrderTransition
} from "./state-machine.js";

describe("order state machine", () => {
  it("supports the delivery lifecycle", () => {
    expect(
      merchantOrderTransition(
        "pending_confirmation",
        "delivery",
        "confirm"
      )?.nextState
    ).toBe("confirmed");
    expect(
      merchantOrderTransition("confirmed", "delivery", "start_preparing")
        ?.nextState
    ).toBe("preparing");
    expect(
      merchantOrderTransition("preparing", "delivery", "mark_ready")
        ?.nextState
    ).toBe("ready");
    expect(
      merchantOrderTransition("ready", "delivery", "dispatch")
        ?.nextState
    ).toBe("out_for_delivery");
    expect(
      merchantOrderTransition(
        "out_for_delivery",
        "delivery",
        "deliver"
      )?.nextState
    ).toBe("delivered");
  });

  it("uses the pickup-specific ready and completion states", () => {
    expect(
      merchantOrderTransition("preparing", "pickup", "mark_ready")
        ?.nextState
    ).toBe("ready_for_pickup");
    expect(
      merchantOrderTransition(
        "ready_for_pickup",
        "pickup",
        "mark_picked_up"
      )?.nextState
    ).toBe("picked_up");
    expect(
      merchantOrderTransition("ready", "pickup", "dispatch")
    ).toBeNull();
  });

  it("allows customer cancellation only before merchant confirmation", () => {
    expect(customerCanCancel("pending_confirmation")).toBe(true);
    expect(customerCanCancel("confirmed")).toBe(false);
    expect(customerCanCancel("preparing")).toBe(false);
  });

  it("only starts refunds from completed orders", () => {
    expect(
      merchantOrderTransition("delivered", "delivery", "request_refund")
        ?.nextState
    ).toBe("refund_pending");
    expect(
      merchantOrderTransition(
        "pending_confirmation",
        "delivery",
        "request_refund"
      )
    ).toBeNull();
  });
});
