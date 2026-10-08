import type { SubscriptionPlanCode } from "@bazaarlink/contracts";

const order: Record<SubscriptionPlanCode, number> = {
  starter: 0,
  pro: 1,
  business: 2
};

/**
 * Merchant self-serve upgrades cannot bypass a payment verification path.
 * During production, all upward transitions are blocked until verified
 * subscription billing is implemented. Downgrades remain self-service.
 */
export function unpaidUpgradeBlocked(
  from: SubscriptionPlanCode,
  to: SubscriptionPlanCode,
  environment: string | undefined = process.env.NODE_ENV
): boolean {
  return environment === "production" && order[to] > order[from];
}
