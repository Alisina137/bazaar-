import type { OrderState } from "@bazaarlink/contracts";

export const reviewEligibleOrderStates = [
  "delivered",
  "picked_up"
] as const satisfies readonly OrderState[];

export function isReviewEligibleOrderState(
  state: OrderState
): boolean {
  return reviewEligibleOrderStates.includes(
    state as (typeof reviewEligibleOrderStates)[number]
  );
}
