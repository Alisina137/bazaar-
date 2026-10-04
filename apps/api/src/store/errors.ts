import type { StoreErrorCode } from "@bazaarlink/contracts";

export class StoreError extends Error {
  constructor(
    public readonly code: StoreErrorCode,
    public readonly statusCode: number
  ) {
    super(code);
    this.name = "StoreError";
  }
}

export class StoreRepositoryConflictError extends Error {
  constructor() {
    super("store_handle_conflict");
    this.name = "StoreRepositoryConflictError";
  }
}
