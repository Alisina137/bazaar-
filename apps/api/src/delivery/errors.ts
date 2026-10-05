import type { DeliveryErrorCode } from "@bazaarlink/contracts";

export class DeliveryError extends Error {
  constructor(
    public readonly code: DeliveryErrorCode,
    public readonly statusCode: number
  ) {
    super(code);
    this.name = "DeliveryError";
  }
}
