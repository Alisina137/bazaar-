import type { AuthErrorCode } from "@bazaarlink/contracts";

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    public readonly statusCode: number
  ) {
    super(code);
    this.name = "AuthError";
  }
}

export class AuthRepositoryConflictError extends Error {
  constructor() {
    super("auth_identifier_conflict");
    this.name = "AuthRepositoryConflictError";
  }
}
