import type { GrowthErrorCode } from "@bazaarlink/contracts";

export class GrowthError extends Error {
  constructor(
    public readonly code: GrowthErrorCode,
    public readonly statusCode: number
  ) {
    super(code);
    this.name = "GrowthError";
  }
}

export class GrowthRepositoryConflictError extends Error {
  constructor(public readonly kind: "coupon" | "staff") {
    super(kind);
    this.name = "GrowthRepositoryConflictError";
  }
}
