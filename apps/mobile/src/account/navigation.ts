import type { AppRole } from "@bazaarlink/contracts";

export type SellerEntry =
  | "onboarding"
  | "workspace"
  | "loading"
  | "retry"
  | "unassigned";

/** A seller account can only open a workspace after store access resolves. */
export function sellerAccountEntry(
  roles: readonly AppRole[],
  storeStatus: "idle" | "loading" | "ready" | "error",
  hasCurrentStore: boolean
): SellerEntry {
  const isOwner = roles.includes("merchant_owner");
  const isStaff = roles.includes("merchant_staff");

  if (!isOwner && !isStaff) return "onboarding";
  if (storeStatus === "idle" || storeStatus === "loading") return "loading";
  if (storeStatus === "error") return "retry";
  if (hasCurrentStore) return "workspace";
  return isStaff && !isOwner ? "unassigned" : "onboarding";
}
