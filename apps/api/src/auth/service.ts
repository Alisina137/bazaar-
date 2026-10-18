import type {
  AuthSessionResponse,
  AuthSuccessResponse,
  AuthProfileResponse,
  AuthSecuritySessionsResponse,
  UpdateAuthProfileInput,
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
import type { DatabaseAuthSecurityRepository } from "./security-repository.js";
import type { SecurityEmailSender } from "./security-email.js";
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
  /** Optional for injectable legacy test doubles; configured production service implements it. */
  updateProfile?: (token: string, input: UpdateAuthProfileInput) => Promise<AuthProfileResponse>;
  requestPasswordReset?: (email: string) => Promise<void>;
  finishPasswordReset?: (token: string, nextPassword: string) => Promise<void>;
  requestEmailVerification?: (token: string) => Promise<void>;
  finishEmailVerification?: (token: string, code: string) => Promise<void>;
  changePassword?: (token: string, currentPassword: string, newPassword: string) => Promise<void>;
  activeSessions?: (token: string) => Promise<AuthSecuritySessionsResponse>;
  revokeSession?: (token: string, sessionId: string) => Promise<void>;
  revokeOtherSessions?: (token: string) => Promise<void>;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class AuthService implements AuthServiceContract {
  constructor(
    private readonly repository: AuthRepository,
    private readonly config: AuthConfig,
    private readonly security?: DatabaseAuthSecurityRepository,
    private readonly emailSender?: SecurityEmailSender
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

  async updateProfile(token: string, input: UpdateAuthProfileInput): Promise<AuthProfileResponse> {
    const session = await this.authenticateToken(token);
    const user = await this.repository.updateProfile(session.user.id, input);
    return { user };
  }


  private requireSecurity(): DatabaseAuthSecurityRepository {
    if (!this.security) throw new AuthError("service_unavailable", 503);
    return this.security;
  }

  private requireEmailSender(): SecurityEmailSender {
    if (!this.emailSender?.configured()) throw new AuthError("service_unavailable", 503);
    return this.emailSender;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const security = this.requireSecurity();
    const sender = this.requireEmailSender();
    const identity = await this.repository.findEmailIdentity(normalizeEmail(email));
    // Identical success responses for unknown, disabled and existing addresses.
    if (!identity || identity.user.status !== "active") return;
    const code = createSessionToken();
    const created = await security.createToken(identity.accountId, "password_reset", hashSessionToken(code));
    if (created) {
      try {
        await sender.send(normalizeEmail(email), "password_reset", code);
      } catch {
        // Never expose account existence through delivery errors.
      }
    }
  }

  async finishPasswordReset(code: string, nextPassword: string): Promise<void> {
    const hash = await hashPassword(nextPassword);
    if (!await this.requireSecurity().resetPassword(hashSessionToken(code), hash)) {
      throw new AuthError("invalid_token", 400);
    }
  }

  async requestEmailVerification(token: string): Promise<void> {
    const session = await this.authenticateToken(token);
    const security = this.requireSecurity();
    const sender = this.requireEmailSender();
    if (!session.user.email) throw new AuthError("service_unavailable", 503);
    const identity = await this.repository.findEmailIdentity(normalizeEmail(session.user.email));
    if (!identity || identity.user.id !== session.user.id) {
      throw new AuthError("invalid_session", 401);
    }
    if (await security.verified(identity.accountId)) return;
    const code = createSessionToken();
    const created = await security.createToken(identity.accountId, "verify_email", hashSessionToken(code));
    if (created) {
      try {
        await sender.send(identity.user.email ?? session.user.email, "verify_email", code);
      } catch {
        throw new AuthError("service_unavailable", 503);
      }
    }
  }

  async finishEmailVerification(token: string, code: string): Promise<void> {
    const session = await this.authenticateToken(token);
    try {
      if (!await this.requireSecurity().verifyEmail(session.user.id, hashSessionToken(code))) {
        throw new AuthError("invalid_token", 400);
      }
    } catch (error) {
      if (error instanceof AuthError) throw error;
      if (error instanceof Error && error.message === "verification_owner_mismatch") {
        throw new AuthError("invalid_token", 400);
      }
      throw error;
    }
  }

  async changePassword(token: string, currentPassword: string, nextPassword: string): Promise<void> {
    const session = await this.authenticateToken(token);
    const identity = session.user.email
      ? await this.repository.findEmailIdentity(normalizeEmail(session.user.email))
      : null;
    if (!identity || identity.user.id !== session.user.id ||
        !await verifyPassword(identity.passwordHash, currentPassword) ||
        currentPassword === nextPassword) {
      throw new AuthError("invalid_credentials", 401);
    }
    const nextHash = await hashPassword(nextPassword);
    const changed = await this.requireSecurity().changePassword(
      session.user.id, identity.passwordHash, nextHash, hashSessionToken(token)
    );
    if (!changed) throw new AuthError("invalid_credentials", 401);
  }

  async activeSessions(token: string): Promise<AuthSecuritySessionsResponse> {
    const session = await this.authenticateToken(token);
    const sessions = await this.requireSecurity().listSessions(session.user.id, hashSessionToken(token));
    return { sessions: sessions.map(({ id, createdAt, lastSeenAt, expiresAt, current }) => ({
      id, createdAt: createdAt.toISOString(), lastSeenAt: lastSeenAt.toISOString(),
      expiresAt: expiresAt.toISOString(), current
    })) };
  }

  async revokeSession(token: string, sessionId: string): Promise<void> {
    const session = await this.authenticateToken(token);
    const deleted = await this.requireSecurity().revokeSession(
      session.user.id, sessionId, hashSessionToken(token)
    );
    if (!deleted) throw new AuthError("invalid_request", 400);
  }

  async revokeOtherSessions(token: string): Promise<void> {
    const session = await this.authenticateToken(token);
    await this.requireSecurity().revokeOthers(session.user.id, hashSessionToken(token));
  }

  async logout(token: string): Promise<void> {
    await this.repository.revokeSession(hashSessionToken(token), new Date());
  }
}
