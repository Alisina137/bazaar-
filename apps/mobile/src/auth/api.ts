import type {
  AuthErrorCode,
  AuthErrorResponse,
  AuthSessionResponse,
  AuthSuccessResponse,
  AuthProfileResponse,
  AuthSecuritySessionsResponse,
  UpdateAuthProfileInput
} from "@bazaarlink/contracts";

const REQUEST_TIMEOUT_MS = 10_000;

function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
}

export class AuthApiError extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code);
    this.name = "AuthApiError";
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(apiBaseUrl() + path, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...init.headers
      }
    });

    if (!response.ok) {
      let code: AuthErrorCode = "service_unavailable";

      try {
        const payload = (await response.json()) as Partial<AuthErrorResponse>;
        if (payload.error?.code) {
          code = payload.error.code;
        }
      } catch {
        // Keep the generic safe error code.
      }

      throw new AuthApiError(code);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }

    throw new AuthApiError("service_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

export function registerAccount(input: {
  email: string;
  password: string;
  displayName: string | null;
  preferredLocale: "fa-AF" | "ps-AF" | "en";
}): Promise<AuthSuccessResponse> {
  return requestJson<AuthSuccessResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function loginAccount(input: {
  email: string;
  password: string;
}): Promise<AuthSuccessResponse> {
  return requestJson<AuthSuccessResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function restoreSession(
  token: string
): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>("/auth/session", {
    method: "GET",
    headers: {
      authorization: "Bearer " + token
    }
  });
}

export function updateAccountProfile(token: string, input: UpdateAuthProfileInput): Promise<AuthProfileResponse> {
  return requestJson<AuthProfileResponse>("/auth/profile", {
    method: "PATCH",
    headers: { authorization: "Bearer " + token },
    body: JSON.stringify(input)
  });
}

function securityAuthHeaders(token: string) {
  return { authorization: "Bearer " + token };
}

export function requestPasswordReset(email: string): Promise<{ accepted: true }> {
  return requestJson("/auth/password-reset/request", {
    method: "POST", body: JSON.stringify({ email })
  });
}

export function finishPasswordReset(code: string, newPassword: string): Promise<void> {
  return requestJson("/auth/password-reset/confirm", {
    method: "POST", body: JSON.stringify({ code, newPassword })
  });
}

export function requestEmailVerification(token: string): Promise<{ accepted: true }> {
  return requestJson("/auth/email-verification/request", {
    method: "POST", headers: securityAuthHeaders(token), body: "{}"
  });
}

export function finishEmailVerification(token: string, code: string): Promise<void> {
  return requestJson("/auth/email-verification/confirm", {
    method: "POST", headers: securityAuthHeaders(token), body: JSON.stringify({ code })
  });
}

export function updateAccountPassword(
  token: string, currentPassword: string, newPassword: string
): Promise<void> {
  return requestJson("/auth/change-password", {
    method: "POST", headers: securityAuthHeaders(token),
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

export function listAccountSessions(token: string): Promise<AuthSecuritySessionsResponse> {
  return requestJson("/auth/sessions", {
    method: "GET", headers: securityAuthHeaders(token)
  });
}

export function revokeAccountSession(token: string, id: string): Promise<void> {
  return requestJson("/auth/sessions/" + encodeURIComponent(id), {
    method: "DELETE", headers: securityAuthHeaders(token)
  });
}

export function revokeOtherAccountSessions(token: string): Promise<void> {
  return requestJson("/auth/sessions/revoke-others", {
    method: "POST", headers: securityAuthHeaders(token), body: "{}"
  });
}

export function logoutSession(token: string): Promise<void> {
  return requestJson<void>("/auth/logout", {
    method: "POST",
    headers: {
      authorization: "Bearer " + token
    }
  });
}
