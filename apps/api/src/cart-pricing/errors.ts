import type { CartPricingErrorCode } from "@bazaarlink/contracts";

export class CartPricingError extends Error {
  constructor(
    public readonly code: CartPricingErrorCode,
    public readonly statusCode: number
  ) {
    super(code);
    this.name = "CartPricingError";
  }
}
