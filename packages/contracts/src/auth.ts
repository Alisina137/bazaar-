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
  "account_unavailable",
  "forbidden",
  "rate_limited",
  "service_unavailable"
] as const;

export type AuthErrorCode = (typeof authErrorCodes)[number];

export interface AuthUser {
  id: string;
  displayName: string | null;
  preferredLocale: "fa-AF" | "ps-AF" | "en";
  status: "active" | "suspended" | "disabled";
  roles: AppRole[];
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
