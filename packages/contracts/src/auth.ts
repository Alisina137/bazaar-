export const authErrorCodes = [
  "invalid_request",
  "email_in_use",
  "invalid_credentials",
  "invalid_session",
  "account_unavailable",
  "rate_limited",
  "service_unavailable"
] as const;

export type AuthErrorCode = (typeof authErrorCodes)[number];

export interface AuthUser {
  id: string;
  displayName: string | null;
  preferredLocale: "fa-AF" | "ps-AF" | "en";
  status: "active" | "suspended" | "disabled";
}

export interface AuthSession {
  token: string;
  expiresAt: string;
}

export interface AuthSuccessResponse {
  user: AuthUser;
  session: AuthSession;
}

export interface AuthSessionResponse {
  user: AuthUser;
  expiresAt: string;
}

export interface AuthErrorResponse {
  error: {
    code: AuthErrorCode;
  };
}
