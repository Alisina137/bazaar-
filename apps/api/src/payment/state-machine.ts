import type { PaymentState } from "@bazaarlink/contracts";

const transitions: Readonly<Record<PaymentState, readonly PaymentState[]>> = {
  created: ["pending", "failed", "cancelled", "expired"],
  pending: ["paid", "failed", "cancelled", "expired"],
  paid: ["refund_pending"],
  failed: [],
  cancelled: [],
  expired: [],
  refund_pending: [
    "paid",
    "partially_refunded",
    "refunded"
  ],
  partially_refunded: ["refund_pending"],
  refunded: []
};

export function canTransitionPaymentState(
  from: PaymentState,
  to: PaymentState
): boolean {
  return transitions[from].includes(to);
}

export function assertPaymentStateTransition(
  from: PaymentState,
  to: PaymentState
): void {
  if (!canTransitionPaymentState(from, to)) {
    throw new Error(`invalid_payment_state_transition:${from}->${to}`);
  }
}

export function isTerminalPaymentState(state: PaymentState): boolean {
  return transitions[state].length === 0;
}
