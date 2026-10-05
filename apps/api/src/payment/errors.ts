import type { PaymentErrorCode } from "@bazaarlink/contracts";

export class PaymentError extends Error {
  constructor(
    public readonly code: PaymentErrorCode,
    public readonly statusCode: number
  ) {
    super(code);
    this.name = "PaymentError";
  }
}
