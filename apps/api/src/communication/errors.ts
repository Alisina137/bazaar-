import type { CommunicationErrorCode } from "@bazaarlink/contracts";

export class CommunicationError extends Error {
  constructor(
    public readonly code: CommunicationErrorCode,
    public readonly statusCode: number
  ) {
    super(code);
    this.name = "CommunicationError";
  }
}
