import type { TrustErrorCode } from "@bazaarlink/contracts";

export class TrustError extends Error {
  constructor(
    public readonly code: TrustErrorCode,
    public readonly statusCode: number
  ) {
    super(code);
    this.name = "TrustError";
  }
}

export class TrustRepositoryConflictError extends Error {
  constructor(public readonly kind: "review" | "report") {
    super(kind);
    this.name = "TrustRepositoryConflictError";
  }
}
