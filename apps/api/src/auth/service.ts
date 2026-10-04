import type {
  AuthSessionResponse,
  AuthSuccessResponse,
  AuthUser
} from "@bazaarlink/contracts";

import type { AuthConfig } from "./config.js";
import {
  AuthError,
  AuthRepositoryConflictError
} from "./errors.js";
import {
  consumeInvalidCredentialWork,
  hashPassword,
  verifyPassword
} from "./password.js";
import type { AuthRepository } from "./repository.js";
import {
  createSessionToken,
  hashSessionToken
} from "./token.js";

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string | null;
  preferredLocale: AuthUser["preferredLocale"];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthServiceContract {
  register(input: RegisterInput): Promise<AuthSuccessResponse>;
  login(input: LoginInput): Promise<AuthSuccessResponse>;
  authenticateToken(token: string): Promise<AuthSessionResponse>;
  logout(token: string): Promise<void>;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class AuthService implements AuthServiceContract {
  constructor(
    private readonly repository: AuthRepository,
    private readonly config: AuthConfig
  ) {}

  private async createSession(user: AuthUser): Promise<AuthSuccessResponse> {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(
      Date.now() + this.config.sessionTtlDays * 24 * 60 * 60 * 1000
    );

    await this.repository.createSession({
      userId: user.id,
      tokenHash,
      expiresAt
    });

    return {
      user,
      session: {
        token,
        expiresAt: expiresAt.toISOString()
      }
    };
  }

  async register(input: RegisterInput): Promise<AuthSuccessResponse> {
    const email = normalizeEmail(input.email);

    if (await this.repository.findEmailIdentity(email)) {
      throw new AuthError("email_in_use", 409);
    }

    const passwordHash = await hashPassword(input.password);

    let user: AuthUser;

    try {
      user = await this.repository.createEmailIdentity({
        email,
        passwordHash,
        displayName: input.displayName,
        preferredLocale: input.preferredLocale
      });
    } catch (error) {
      if (error instanceof AuthRepositoryConflictError) {
        throw new AuthError("email_in_use", 409);
      }

      throw error;
    }

    return this.createSession(user);
  }

  async login(input: LoginInput): Promise<AuthSuccessResponse> {
    const email = normalizeEmail(input.email);
    const identity = await this.repository.findEmailIdentity(email);

    if (!identity) {
      await consumeInvalidCredentialWork(input.password);
      throw new AuthError("invalid_credentials", 401);
    }

    const validPassword = await verifyPassword(
      identity.passwordHash,
      input.password
    );

    if (!validPassword) {
      throw new AuthError("invalid_credentials", 401);
    }

    if (identity.user.status !== "active") {
      throw new AuthError("account_unavailable", 403);
    }

    return this.createSession(identity.user);
  }

  async authenticateToken(token: string): Promise<AuthSessionResponse> {
    const tokenHash = hashSessionToken(token);
    const session = await this.repository.findSession(tokenHash);

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new AuthError("invalid_session", 401);
    }

    if (session.user.status !== "active") {
      throw new AuthError("account_unavailable", 403);
    }

    const touchIntervalMs =
      this.config.sessionTouchIntervalMinutes * 60 * 1000;

    if (Date.now() - session.lastSeenAt.getTime() >= touchIntervalMs) {
      await this.repository.touchSession(session.sessionId, new Date());
    }

    return {
      user: session.user,
      expiresAt: session.expiresAt.toISOString()
    };
  }

  async logout(token: string): Promise<void> {
    await this.repository.revokeSession(hashSessionToken(token), new Date());
  }
}
