import type { OrderErrorCode } from "@bazaarlink/contracts";

export class OrderError extends Error {
  constructor(
    public readonly code: OrderErrorCode,
    public readonly statusCode: number
  ) {
    super(code);
    this.name = "OrderError";
  }
}
