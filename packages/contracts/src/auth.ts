export const appRoles = [
  "customer",
  "merchant_owner",
  "merchant_staff",
  "platform_support",
  "platform_admin",
  "super_admin"
] as const;

export type AppRole = (typeof appRoles)[number];

export const merchantRoles = [
  "merchant_owner",
  "merchant_staff"
] as const satisfies readonly AppRole[];

export const platformRoles = [
  "platform_support",
  "platform_admin",
  "super_admin"
] as const satisfies readonly AppRole[];

export type AppMode = "shopping" | "seller" | "platform";

export function hasAnyRole(
  roles: readonly AppRole[],
  allowedRoles: readonly AppRole[]
): boolean {
  return allowedRoles.some((role) => roles.includes(role));
}

export function getAvailableAppModes(
  roles: readonly AppRole[]
): AppMode[] {
  const modes: AppMode[] = ["shopping"];

  if (hasAnyRole(roles, merchantRoles)) {
    modes.push("seller");
  }

  if (hasAnyRole(roles, platformRoles)) {
    modes.push("platform");
  }

  return modes;
}

export const authErrorCodes = [
  "invalid_request",
  "email_in_use",
  "invalid_credentials",
  "invalid_session",
  "invalid_token",
  "account_unavailable",
  "forbidden",
  "rate_limited",
  "service_unavailable"
] as const;

export type AuthErrorCode = (typeof authErrorCodes)[number];

export interface AuthUser {
  id: string;
  displayName: string | null;
  /** The login address, view-only until a verified email change flow exists. */
  email?: string | null;
  emailVerified?: boolean;
  /** Optional contact number. Never treated as verified or as a login factor. */
  phone?: string | null;
  avatarColor?: "teal" | "blue" | "purple" | "orange";
  preferredLocale: "fa-AF" | "ps-AF" | "en";
  status: "active" | "suspended" | "disabled";
  roles: AppRole[];
}

export interface UpdateAuthProfileInput {
  displayName: string | null;
  phone: string | null;
  avatarColor: "teal" | "blue" | "purple" | "orange";
}

export interface AuthProfileResponse {
  user: AuthUser;
}

export interface AuthSecuritySession {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

export interface AuthSecuritySessionsResponse {
  sessions: AuthSecuritySession[];
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
