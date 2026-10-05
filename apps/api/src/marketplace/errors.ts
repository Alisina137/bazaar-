import type { MarketplaceErrorCode } from "@bazaarlink/contracts";

export class MarketplaceError extends Error {
  constructor(
    public readonly code: MarketplaceErrorCode,
    public readonly statusCode: number
  ) {
    super(code);
    this.name = "MarketplaceError";
  }
}
