import type {
  AuthErrorCode,
  AuthErrorResponse,
  AuthSessionResponse,
  AuthSuccessResponse
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

export function logoutSession(token: string): Promise<void> {
  return requestJson<void>("/auth/logout", {
    method: "POST",
    headers: {
      authorization: "Bearer " + token
    }
  });
}
