import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  paymentAttempts,
  paymentStateEvents,
  storePaymentSettings
} from "./payment.js";

describe("payment schema", () => {
  it("uses stable Phase 7 table names", () => {
    expect(getTableName(storePaymentSettings)).toBe(
      "store_payment_settings"
    );
    expect(getTableName(paymentAttempts)).toBe("payment_attempts");
    expect(getTableName(paymentStateEvents)).toBe("payment_state_events");
  });

  it("keeps payment ownership and checkout references UUID backed", () => {
    expect(storePaymentSettings.storeId.dataType).toBe("string");
    expect(paymentAttempts.userId.dataType).toBe("string");
    expect(paymentAttempts.checkoutSessionId.dataType).toBe("string");
    expect(paymentAttempts.storeId.dataType).toBe("string");
    expect(paymentStateEvents.paymentAttemptId.dataType).toBe("string");
  });

  it("defaults to safe manual methods without enabling digital providers", () => {
    expect(storePaymentSettings.cashOnDeliveryEnabled.default).toBe(true);
    expect(storePaymentSettings.hesabpayEnabled.default).toBe(false);
    expect(storePaymentSettings.cardEnabled.default).toBe(false);
    expect(storePaymentSettings.payAtStoreEnabled.default).toBe(true);
    expect(paymentAttempts.state.default).toBe("created");
    expect(paymentAttempts.currency.default).toBe("AFN");
    expect(paymentAttempts.refundState.default).toBe("none");
    expect(paymentAttempts.refundedAmount.default).toBe("0");
  });
});
