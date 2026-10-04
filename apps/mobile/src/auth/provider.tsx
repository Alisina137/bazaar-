import type {
  AuthErrorCode,
  AuthUser
} from "@bazaarlink/contracts";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  AuthApiError,
  loginAccount,
  logoutSession,
  registerAccount,
  restoreSession
} from "./api";
import {
  clearStoredSessionToken,
  getStoredSessionToken,
  setStoredSessionToken
} from "./storage";

type AuthStatus = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (input: {
    email: string;
    password: string;
  }) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    displayName: string | null;
    preferredLocale: "fa-AF" | "ps-AF" | "en";
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function rethrowAuthError(error: unknown): never {
  if (error instanceof AuthApiError) {
    throw error;
  }

  throw new AuthApiError("service_unavailable");
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const storedToken = await getStoredSessionToken();

      if (!active) {
        return;
      }

      if (!storedToken) {
        setStatus("signedOut");
        return;
      }

      try {
        const restored = await restoreSession(storedToken);

        if (!active) {
          return;
        }

        setSessionToken(storedToken);
        setUser(restored.user);
        setStatus("signedIn");
      } catch (error) {
        if (!active) {
          return;
        }

        if (
          error instanceof AuthApiError &&
          (error.code === "invalid_session" ||
            error.code === "account_unavailable")
        ) {
          await clearStoredSessionToken();
        }

        setSessionToken(null);
        setUser(null);
        setStatus("signedOut");
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: {
    email: string;
    password: string;
  }) => {
    try {
      const result = await loginAccount(input);
      await setStoredSessionToken(result.session.token);

      setSessionToken(result.session.token);
      setUser(result.user);
      setStatus("signedIn");
    } catch (error) {
      rethrowAuthError(error);
    }
  }, []);

  const register = useCallback(async (input: {
    email: string;
    password: string;
    displayName: string | null;
    preferredLocale: "fa-AF" | "ps-AF" | "en";
  }) => {
    try {
      const result = await registerAccount(input);
      await setStoredSessionToken(result.session.token);

      setSessionToken(result.session.token);
      setUser(result.user);
      setStatus("signedIn");
    } catch (error) {
      rethrowAuthError(error);
    }
  }, []);

  const logout = useCallback(async () => {
    const token = sessionToken;

    try {
      if (token) {
        await logoutSession(token);
      }
    } finally {
      await clearStoredSessionToken();
      setSessionToken(null);
      setUser(null);
      setStatus("signedOut");
    }
  }, [sessionToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      register,
      logout
    }),
    [status, user, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}

export function getAuthErrorCode(error: unknown): AuthErrorCode {
  return error instanceof AuthApiError
    ? error.code
    : "service_unavailable";
}
