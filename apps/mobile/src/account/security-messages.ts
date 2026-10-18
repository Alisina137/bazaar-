import type { TranslationKey } from "@bazaarlink/localization";
import { getAuthErrorCode } from "@/auth/provider";

export function securityErrorKey(error: unknown): TranslationKey {
  const code = getAuthErrorCode(error);
  if (code === "invalid_token") return "account.security.invalidCode";
  if (code === "invalid_credentials") return "auth.error.invalidCredentials";
  if (code === "invalid_session") return "auth.error.sessionExpired";
  if (code === "rate_limited") return "auth.error.rateLimited";
  if (code === "invalid_request") return "auth.error.invalidRequest";
  if (code === "account_unavailable") return "auth.error.accountUnavailable";
  return "auth.error.serviceUnavailable";
}
