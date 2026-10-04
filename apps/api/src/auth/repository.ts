import type { AuthUser } from "@bazaarlink/contracts";
import {
  authAccounts,
  authSessions,
  type Database,
  users
} from "@bazaarlink/database";
import { and, eq } from "drizzle-orm";

import { AuthRepositoryConflictError } from "./errors.js";

export interface EmailIdentity {
  accountId: string;
  user: AuthUser;
  passwordHash: string;
}

export interface SessionIdentity {
  sessionId: string;
  user: AuthUser;
  expiresAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
}

export interface AuthRepository {
  findEmailIdentity(email: string): Promise<EmailIdentity | null>;
  createEmailIdentity(input: {
    email: string;
    passwordHash: string;
    displayName: string | null;
    preferredLocale: AuthUser["preferredLocale"];
  }): Promise<AuthUser>;
  createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findSession(tokenHash: string): Promise<SessionIdentity | null>;
  revokeSession(tokenHash: string, revokedAt: Date): Promise<void>;
  touchSession(sessionId: string, lastSeenAt: Date): Promise<void>;
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    cause?: unknown;
  };

  if (candidate.code === "23505") {
    return true;
  }

  return candidate.cause ? isUniqueViolation(candidate.cause) : false;
}

function toAuthUser(row: {
  id: string;
  displayName: string | null;
  preferredLocale: string;
  status: "active" | "suspended" | "disabled";
}): AuthUser {
  return {
    id: row.id,
    displayName: row.displayName,
    preferredLocale: row.preferredLocale as AuthUser["preferredLocale"],
    status: row.status
  };
}

export class DatabaseAuthRepository implements AuthRepository {
  constructor(private readonly db: Database) {}

  async findEmailIdentity(email: string): Promise<EmailIdentity | null> {
    const [row] = await this.db
      .select({
        accountId: authAccounts.id,
        passwordHash: authAccounts.passwordHash,
        id: users.id,
        displayName: users.displayName,
        preferredLocale: users.preferredLocale,
        status: users.status
      })
      .from(authAccounts)
      .innerJoin(users, eq(authAccounts.userId, users.id))
      .where(
        and(
          eq(authAccounts.provider, "email_password"),
          eq(authAccounts.identifier, email)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      accountId: row.accountId,
      passwordHash: row.passwordHash,
      user: toAuthUser(row)
    };
  }

  async createEmailIdentity(input: {
    email: string;
    passwordHash: string;
    displayName: string | null;
    preferredLocale: AuthUser["preferredLocale"];
  }): Promise<AuthUser> {
    try {
      return await this.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            displayName: input.displayName,
            preferredLocale: input.preferredLocale
          })
          .returning({
            id: users.id,
            displayName: users.displayName,
            preferredLocale: users.preferredLocale,
            status: users.status
          });

        if (!user) {
          throw new Error("user_insert_failed");
        }

        await tx.insert(authAccounts).values({
          userId: user.id,
          provider: "email_password",
          identifier: input.email,
          passwordHash: input.passwordHash
        });

        return toAuthUser(user);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AuthRepositoryConflictError();
      }

      throw error;
    }
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.db.insert(authSessions).values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt
    });
  }

  async findSession(tokenHash: string): Promise<SessionIdentity | null> {
    const [row] = await this.db
      .select({
        sessionId: authSessions.id,
        expiresAt: authSessions.expiresAt,
        lastSeenAt: authSessions.lastSeenAt,
        revokedAt: authSessions.revokedAt,
        id: users.id,
        displayName: users.displayName,
        preferredLocale: users.preferredLocale,
        status: users.status
      })
      .from(authSessions)
      .innerJoin(users, eq(authSessions.userId, users.id))
      .where(eq(authSessions.tokenHash, tokenHash))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      sessionId: row.sessionId,
      expiresAt: row.expiresAt,
      lastSeenAt: row.lastSeenAt,
      revokedAt: row.revokedAt,
      user: toAuthUser(row)
    };
  }

  async revokeSession(tokenHash: string, revokedAt: Date): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ revokedAt })
      .where(eq(authSessions.tokenHash, tokenHash));
  }

  async touchSession(sessionId: string, lastSeenAt: Date): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ lastSeenAt })
      .where(eq(authSessions.id, sessionId));
  }
}
